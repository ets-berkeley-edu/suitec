/**
 * Copyright ©2020. The Regents of the University of California (Regents). All Rights Reserved.
 *
 * Permission to use, copy, modify, and distribute this software and its documentation
 * for educational, research, and not-for-profit purposes, without fee and without a
 * signed licensing agreement, is hereby granted, provided that the above copyright
 * notice, this paragraph and the following two paragraphs appear in all copies,
 * modifications, and distributions.
 *
 * Contact The Office of Technology Licensing, UC Berkeley, 2150 Shattuck Avenue,
 * Suite 510, Berkeley, CA 94720-1620, (510) 643-7201, otl@berkeley.edu,
 * http://ipira.berkeley.edu/industry-info for commercial licensing opportunities.
 *
 * IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT, SPECIAL,
 * INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF
 * THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF REGENTS HAS BEEN ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE
 * SOFTWARE AND ACCOMPANYING DOCUMENTATION, IF ANY, PROVIDED HEREUNDER IS PROVIDED
 * "AS IS". REGENTS HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
 * ENHANCEMENTS, OR MODIFICATIONS.
 */

var _ = require('lodash');
var async = require('async');
var config = require('config');
var contentDisposition = require('content-disposition');
var fs = require('fs');
var Joi = require('joi');
var moment = require('moment-timezone');
var os = require('os');
var path = require('path');
var request = require('request');
var timezone = config.get('timezone');

var AssetsAPI = require('col-assets');
var CategoriesAPI = require('col-categories');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('col-assets/migrate');
var Storage = require('col-core/lib/storage');
var UserAPI = require('col-users');
var UserConstants = require('col-users/lib/constants');

/**
 * Get contexts for asset migration
 *
 * @param  {Context}          fromCtx                     Context for user associated with source assets
 * @param  {Context}          opts                        Migration options
 * @param  {Boolean}          opts.categories             Whether categories should be migrated
 * @param  {Number}           opts.destinationUserId      SuiteC id for destination user
 * @param  {Boolean}          opts.validateUserAccounts   Whether to run additional user validations
 * @param  {Function}         callback                    Standard callback function
 * @param  {Object}           callback.err                An error that occurred, if any
 * @param  {Context}          callback.toCtx              Context for user associated with destination assets
 * @param  {Context}          callback.adminCtx           An admin context for API interaction
 */
var getMigrationContexts = module.exports.getMigrationContexts = function(fromCtx, opts, callback) {
  // Validate migration options
  opts = opts || {};
  var validationSchema = Joi.object().keys({
    'opts': Joi.object().keys({
      'categories': Joi.boolean().required(),
      'destinationUserId': Joi.number().required(),
      'validateUserAccounts': Joi.boolean().required()
    })
  });
  var validationResult = Joi.validate({
    'opts': opts
  }, validationSchema);
  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  createDestinationContexts(opts.destinationUserId, function(err, toCtx, adminCtx) {
    if (err) {
      return callback(err);
    }

    if (fromCtx.course.id === toCtx.course.id) {
      log.error({'course': fromCtx.course}, 'Cannot migrate a course to itself');
      return callback({'code': 400, 'msg': 'Bad request'});
    }

    if (opts.validateUserAccounts) {
      if (!fromCtx.user.is_admin || !toCtx.user.is_admin) {
        log.error({'course': fromCtx.course}, 'Unauthorized to migrate assets');
        return callback({'code': 401, 'msg': 'Unauthorized to migrate assets'});
      }

      var userAccountsMatch = (fromCtx.user.canvas_user_id === toCtx.user.canvas_user_id);
      var canvasInstancesMatch = (fromCtx.course.canvas_api_domain === toCtx.course.canvas_api_domain);
      if (!userAccountsMatch || !canvasInstancesMatch) {
        return callback({'code': 400, 'msg': 'Bad request'});
      }
    }

    return callback(null, toCtx, adminCtx);
  });
};

/**
 * Migrate assets and categories
 *
 * @param  {Context}          fromCtx                     Context for user associated with source assets
 * @param  {Context}          toCtx                       Context for user associated with destination assets
 * @param  {Context}          adminCtx                    An admin context for API interaction
 * @param  {Context}          opts                        Migration options
 * @param  {Boolean}          opts.categories             Whether categories should be migrated
 * @param  {Function}         callback                    Standard callback function
 * @param  {Object}           callback.results            Migration results
 */
var migrate = module.exports.migrate = function(fromCtx, toCtx, adminCtx, opts, callback) {
  // Migrate categories
  migrateCategories(opts.categories, fromCtx, toCtx, adminCtx, function(categoryMapping) {
    // Migrate all assets
    migrateAssets(fromCtx, toCtx, categoryMapping, function(total, results) {
      log.info({'total': total, 'results': results}, 'Finished migrating assets');

      return callback(null, results);
    });
  });
};

/**
 * Migrate assets
 *
 * @param  {Context}          fromCtx             Context for user associated with source assets
 * @param  {Context}          toCtx               Context for user associated with destination assets
 * @param  {Object}           categoryMapping     Mapping from source to destination categories
 * @param  {Function}         callback            Standard callback function
 * @param  {Object}           callback.results    Migration results
 */
var migrateAssets = function(fromCtx, toCtx, categoryMapping, callback) {
  var options = {
    'where': {
      'course_id': fromCtx.course.id,
    },
    'order': [ ['created_at', 'ASC'] ],
    'include': [
      {
        'model': DB.User,
        'as': 'users',
        'required': true,
        'attributes': UserConstants.BASIC_USER_FIELDS,
        'where': {
          'id': fromCtx.user.id
        }
      },
      {
        'model': DB.Category,
        'attributes': ['id']
      }
    ]
  };

  DB.Asset.findAll(options).complete(function(err, assets) {
    if (err) {
      return log.error({'err': err}, 'Failed to get the assets to migrate');
    }

    var downloadDir = path.join(os.tmpdir(), Date.now().toString());
    var results = {};

    async.eachSeries(assets, function(asset, done) {
      migrateAsset(toCtx, asset.toJSON(), categoryMapping, downloadDir, results, done);
    }, function() {
      return callback(assets.length, results);
    });
  });
};

/**
 * Migrate an asset
 *
 * @param  {Context}          toCtx               Context for user associated with destination assets
 * @param  {Asset}            asset               The asset to migrate
 * @param  {Object}           categoryMapping     Mapping from source to destination categories
 * @param  {String}           downloadDir         Path for temporary download directory
 * @param  {Object}           results             Object to keep track of migration results
 * @param  {Function}         callback            Standard callback function
 */
var migrateAsset = function(toCtx, asset, categoryMapping, downloadDir, results, callback) {
  var type = asset.type;

  // Callback executed when the asset has finished migrating
  var migrateCallback = function(err, newAsset) {
    results[type] = results[type] || {
      'success': 0,
      'error': 0
    };

    if (err) {
      log.error({'asset': asset, 'err': err}, 'Failed to migrate an asset');
      results[type].error++;
    } else {
      log.info({'asset': asset, 'newAsset': newAsset}, 'Successfully migrated an asset');
      results[type].success++;
    }
    return callback();
  };

  var destinationCategories = getMappedCategories(asset.categories, categoryMapping);

  if (asset.type === 'link') {
    migrateLink(toCtx, asset, destinationCategories, migrateCallback);
  } else if (asset.type === 'file') {
    migrateFile(toCtx, asset, destinationCategories, downloadDir, migrateCallback);
  } else if (asset.type === 'whiteboard') {
    log.info({'asset': asset}, 'Skipping whiteboard migration');
    return callback();
  } else {
    log.error({'asset': asset}, 'Unrecognized asset type');
    return callback();
  }
};

 /**
 * Migrate all categories
 *
 * @param  {Boolean}      shouldMigrate              Whether to migrate categories
 * @param  {Context}      fromCtx                    Context for user associated with source assets
 * @param  {Context}      toCtx                      Context for user associated with destination assets
 * @param  {Context}      adminCtx                   An admin context for API interaction
 * @param  {Function}     callback                   Standard callback function
 * @param  {Object}       callback.categoryMapping   Mapping from source to destination categories
 */
var migrateCategories = function(shouldMigrate, fromCtx, toCtx, adminCtx, callback) {
  if (!shouldMigrate) {
    return callback();
  }

  // Get the categories in the source course
  CategoriesAPI.getCategories(fromCtx, true, false, function(err, fromCategories) {
    if (err) {
      log.error({'err': err}, 'Unable to retrieve the source categories');
      return callback(err);
    }

    // Filter out Canvas assignment categories
    fromCategories = _.filter(fromCategories, function(category) {
      return !category.canvas_assignment_id;
    });

    // Get the categories in the destination course
    CategoriesAPI.getCategories(toCtx, true, false, function(err, toCategories) {
      if (err) {
        log.error({'err': err}, 'Unable to retrieve the destination categories');
        return callback(err);
      }

      // Derive the mapping between the existing categories based on
      // exact title matches
      var categoryMapping = {};
      _.each(fromCategories, function(fromCategory) {
        _.each(toCategories, function(toCategory) {
          if (fromCategory.title === toCategory.title) {
            categoryMapping[fromCategory.id] = toCategory.id;
          }
        });
      });

      // Migrate the categories that could not be mapped
      var migratedCategories = 0;
      async.eachSeries(fromCategories, function(fromCategory, done) {
        if (!categoryMapping[fromCategory.id]) {
          migrateCategory(adminCtx, fromCategory.toJSON(), categoryMapping, function(err) {
            if (!err) {
              migratedCategories++;
            }
            return done();
          });
        } else {
          return done();
        }
      }, function() {
        log.info({'categories': migratedCategories}, 'Finished migrating categories');
        return callback(categoryMapping);
      });
    });
  });
};

/**
 * Migrate a category
 *
 * @param  {Context}          adminCtx            An admin context for API interaction
 * @param  {Category}         category            The category to migrate
 * @param  {Object}           categoryMapping     Mapping from source to destination categories
 * @param  {Function}         callback            Standard callback function
 * @param  {Object}           callback.err        An error that occurred, if any
 */
var migrateCategory = function(adminCtx, category, categoryMapping, callback) {
  CategoriesAPI.createCategory(adminCtx, category.title, category.visible, undefined, undefined, function(err, newCategory) {
    if (err) {
      log.error({'category': category, 'err': err}, 'Failed to migrate category');
      return callback(err);
    }

    categoryMapping[category.id] = newCategory.id;
    return callback();
  });
};

/**
 * Migrate a link asset
 *
 * @param  {Context}          toCtx               Context for user associated with destination assets
 * @param  {Asset}            link                The link to migrate
 * @param  {Number[]}         categories          Destination categories for the link asset
 * @param  {Function}         callback            Standard callback function
 */
var migrateLink = function(toCtx, link, categories, callback) {
  AssetsAPI.createLink(toCtx, link.title, link.url, {
    'categories': categories,
    'description': link.description || undefined,
    'source': link.source || undefined,
    'thumbnail_url': link.thumbnail_url || undefined,
    'image_url': link.image_url || undefined,
    'embed_id': link.embed_id || undefined,
    'embed_key': link.embed_key || undefined,
    'embed_code': link.embed_code || undefined
  }, callback);
};

/**
 * Migrate a file asset
 *
 * @param  {Context}          toCtx               Context for user associated with destination assets
 * @param  {Asset}            asset               The asset (file) to migrate
 * @param  {Number[]}         categories          Destination categories for the file asset
 * @param  {String}           downloadDir         Path for temporary download directory
 * @param  {Function}         callback            Standard callback function
 */
var migrateFile = function(toCtx, asset, categories, downloadDir, callback) {
  fs.stat(downloadDir, function(err, stat) {
    // Download the file to a temporary folder
    if (err) {
      if (err.code === 'ENOENT') {
        fs.mkdirSync(downloadDir);
      } else {
        log.error({downloadDir: downloadDir, errorCode: err.code}, 'Failed to create temp directory during file migration');
        return callback(err);
      }
    }

    if (Storage.isS3Uri(asset.download_url)) {
      var s3ObjectKey = asset.download_url;

      Storage.getObject(s3ObjectKey, function(data) {
        var filename = _.split(s3ObjectKey, '/').pop();
        var filePath = path.join(downloadDir, filename);

        downloadFileAndCreateAsset(toCtx, data.createReadStream(), filePath, asset, categories, function(err) {
          // Clean up
          fs.unlink(filePath, function() {
            return callback(err);
          });
        });
      });

    } else if (_.startsWith(asset.download_url, 'file://')) {
      var sourceFile = asset.download_url.substring(7);
      var filename = _.split(sourceFile, '/').pop();
      var timestamp = moment().tz(timezone).format('YYYY-MM-DD_HHmmss');
      var filePath = path.join(downloadDir, timestamp + '_' + filename);

      downloadFileAndCreateAsset(toCtx, fs.createReadStream(sourceFile, {autoClose: true}), filePath, asset, categories, function(err) {
        // Clean up
        fs.unlink(filePath, function() {
          return callback(err);
        });
      });

    } else {
      request(asset.download_url).on('response', function(res) {
        // Extract the name of the file
        var disposition = contentDisposition.parse(res.headers['content-disposition']);
        var filename = disposition.parameters.filename;
        var filePath = path.join(downloadDir, filename);

        downloadFileAndCreateAsset(toCtx, res, filePath, asset, categories, function(err) {
          // Clean up
          fs.unlink(filePath, function() {
            return callback(err);
          });
        });
      });
    }
  });
};

/**
 * Download file and create an asset with appropriate metadata
 *
 * @param  {Context}          toCtx               Context for user associated with destination assets
 * @param  {Stream}           stream              A readable stream
 * @param  {String}           filePath            Path to file reserved for temporary download
 * @param  {Asset}            asset               The asset (file) to migrate
 * @param  {Number[]}         categories          Destination categories for the file asset
 * @param  {Function}         callback            Standard callback function
 */
var downloadFileAndCreateAsset = function(toCtx, stream, filePath, asset, categories, callback) {
  stream.pipe(fs.createWriteStream(filePath))
        .on('error', callback)
        .on('finish', function() {

          // Create the file asset
          AssetsAPI.createFile(toCtx, asset.title, {
            'mimetype': asset.mime,
            'file': filePath,
            'filename': asset.title
          }, {
            'categories': categories,
            'description': asset.description || undefined,
            'thumbnail_url': asset.thumbnail_url || undefined,
            'image_url': asset.image_url || undefined,
            'embed_id': asset.embed_id || undefined,
            'embed_key': asset.embed_key || undefined,
            'embed_code': asset.embed_code || undefined
          }, callback);
        });
};

/**
 * Create mock contexts for destination course and user
 *
 * @param  {Number}       destinationUserId    The SuiteC id for the destination user
 * @param  {Function}     callback             Standard callback function
 * @param  {Function}     callback.err         Error, if any
 * @param  {Function}     callback.userCtx     Mock context for destination user
 * @param  {Function}     callback.adminCtx    Mock admin context for destination course
 */
var createDestinationContexts = function(destinationUserId, callback) {
  UserAPI.getUser(destinationUserId, function(err, destinationUser) {
    // Create mock context for destination user
    if (err) {
      log.error({'toUser': destinationUserId, 'err': err}, 'Unable to retrieve user to migrate to');
      return callback(err);
    }

    userCtx = {
      'user': destinationUser,
      'course': destinationUser.course
    };

    // Create mock admin context for destination course
    adminCtx = {
      'user': {
        'is_admin': true
      },
      'course': destinationUser.course
    };

    return callback(null, userCtx, adminCtx);
  });
};

/**
 * Map a list of categories from the source course to the corresponding categories in the destination course
 *
 * @param  {Number[]}         categories          The ids of the source course categories to map
 * @param  {Object}           categoryMapping     Mapping from source to destination categories
 * @return {Number[]}                             The mapped destination course category ids
 */
var getMappedCategories = function(categories, categoryMapping) {
  return _.chain(categories)
          .map(function(category) {
            return categoryMapping[category.id];
          })
          .compact()
          .value();
};
