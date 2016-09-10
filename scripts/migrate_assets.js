// #!/usr/bin/env node

/**
 * Copyright ©2016. The Regents of the University of California (Regents). All Rights Reserved.
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
var contentDisposition = require('content-disposition');
var fs = require('fs');
var os = require('os');
var fs = require('fs');
var path = require('path');
var request = require('request');
var argv = require('yargs')
    .usage('Usage: $0 --fromcourse [fromcourse] --fromuser [fromuser] --tocourse [tocourse] --touser [touser] --categories [categories]')
    .demand(['fromcourse', 'fromuser', 'tocourse', 'touser'])
    .boolean('categories')
    .describe('fromcourse', 'The Collabosphere id of the course to migrate assets from')
    .describe('fromuser', 'The Collabosphere id of the user to migrate assets from')
    .describe('tocourse', 'The Collabosphere id of the course to migrate assets to')
    .describe('touser', 'The Collabosphere id of the user to migrate assets to')
    .describe('categories', 'Whether to migrate categories')
    .help('h')
    .alias('h', 'help')
    .argv;

var AssetsAPI = require('col-assets');
var CategoriesAPI = require('col-categories');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/migrate_assets');
var UserAPI = require('col-users');
var UserConstants = require('col-users/lib/constants');

// Extract the information about the course and user to migrate assets from
var fromCourse = argv.fromcourse;
var fromUser = argv.fromuser;
var toCourse = argv.tocourse;
var toUser = argv.touser;

var processStartTime = Date.now();
// Variable that will keep track of the source user context for interaction with the API
var fromCtx = null;
// Variable that will keep track of the destination user context for interaction with the API
var toCtx = null;
// Variable that will keep track of an admin user context for interaction with the API
var toAdminCtx = null;
// Variable that will keep track of the mapping between source and destination categories
var categoryMapping = {};
// Variable that will keep track of how many assets have successfully migrated and
// how many have failed to migrate for every asset type
var results = {};

/**
 * Connect to the Collabosphere database and kick
 * off the asset migration
 */
var init = function() {
  // Apply global utilities
  require('col-core/lib/globals');

  // Connect to the database
  DB.init(function(err) {
    if (err) {
      return log.error({'err': err}, 'Unable to set up a connection to the database');
    }

    log.info('Connected to the database');

    // Create the context for interaction with the API
    createContexts(function() {
      // Migrate all categories
      migrateCategories(function() {
        // Migrate all assets
        migrateAssets();
      });
    });
  });
};

/**
 * Create mock contexts to use for interaction with the API
 *
 * @param  {Function}         callback            Standard callback function
 */
var createContexts = function(callback) {
  // Create the mock source user context
  UserAPI.getUser(fromUser, function(err, fromUserObj) {
    if (err) {
      log.error({'fromUser': fromUser, 'err': err}, 'Unable to retrieve user to migrate from');
      return callback(err);
    }

    fromCtx = {
      'user': fromUserObj,
      'course': fromUserObj.course
    };

    // Create the mock destination user context
    UserAPI.getUser(toUser, function(err, toUserObj) {
      if (err) {
        log.error({'toUser': toUser, 'err': err}, 'Unable to retrieve user to migrate to');
        return callback(err);
      }

      toCtx = {
        'user': toUserObj,
        'course': toUserObj.course
      };

      // Create the mock admin destination user context
      toAdminCtx = {
        'user': {
          'is_admin': true
        },
        'course': toUserObj.course
      };

      return callback();
    });
  });
};

/**
 * Migrate all categories
 *
 * @param  {Function}         callback            Standard callback function
 */
var migrateCategories = function(callback) {
  if (!argv.categories) {
    return callback();
  }

  // Get the categories in the source course
  CategoriesAPI.getCategories(fromCtx, true, false, function(err, fromCategories) {
    if (err) {
      log.error({'err': err}, 'Unable to retrieve the source categories');
      return callback(err);
    }

    // Get the categories in the destination course
    CategoriesAPI.getCategories(toCtx, true, false, function(err, toCategories) {
      if (err) {
        log.error({'err': err}, 'Unable to retrieve the destination categories');
        return callback(err);
      }

      // Derive the mapping between the existing categories based on
      // exact title matches
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
          migrateCategory(fromCategory.toJSON(), function(err) {
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
        return callback();
      });
    });
  });
};

/**
 * Migrate a category
 *
 * @param  {Category}         category            The category to migrate
 * @param  {Function}         callback            Standard callback function
 * @param  {Object}           callback.err        An error that occurred, if any
 */
var migrateCategory = function(category, callback) {
  CategoriesAPI.createCategory(toAdminCtx, category.title, undefined, undefined, function(err, newCategory) {
    if (err) {
      log.error({'category': category, 'err': err}, 'Failed to migrate category');
      return callback(err);
    }

    categoryMapping[category.id] = newCategory.id;
    return callback();
  });
};

/**
 * Migrate the assets that need to be migrated
 */
var migrateAssets = function() {
  var options = {
    'where': {
      'course_id': fromCourse,
    },
    'order': 'created_at ASC',
    'include': [
      {
        'model': DB.User,
        'as': 'users',
        'required': true,
        'attributes': UserConstants.BASIC_USER_FIELDS,
        'where': {
          'id': fromUser
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

    async.eachSeries(assets, function(asset, callback) {
      migrateAsset(asset.toJSON(), callback);
    }, function() {
      log.info({'total': assets.length, 'results': results}, 'Finished migrating assets');
    });
  });
};

/**
 * Migrate an asset
 *
 * @param  {Asset}            asset               The asset to migrate
 * @param  {Function}         callback            Standard callback function
 */
var migrateAsset = function(asset, callback) {
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

  if (asset.type === 'link') {
    migrateLink(asset, migrateCallback);
  } else if (asset.type === 'file') {
    migrateFile(asset, migrateCallback);
  } else if (asset.type === 'whiteboard') {
    log.info({'asset': asset}, 'Skipping whiteboard migration');
    return callback();
  } else {
    log.error({'asset': asset}, 'Unrecognized asset type');
    return callback();
  }
};

/**
 * Migrate a link asset
 *
 * @param  {Asset}            link                The link to migrate
 * @param  {Function}         callback            Standard callback function
 */
var migrateLink = function(link, callback) {
  var categories = getMappedCategories(link.categories);
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
 * @param  {Asset}            file                The file to migrate
 * @param  {Function}         callback            Standard callback function
 */
var migrateFile = function(file, callback) {
  var downloadDir = path.join(os.tmpdir(), processStartTime.toString());
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
    request(file.download_url).on('response', function(res) {
      // Extract the name of the file
      var disposition = contentDisposition.parse(res.headers['content-disposition']);
      var filename = disposition.parameters.filename;
      var filePath = path.join(downloadDir, filename);

      // Function that will clean up the temporary file
      var cleanTempFile = function(err) {
        fs.unlink(filePath, function() {
          return callback(err);
        });
      };

      res.pipe(fs.createWriteStream(filePath))
      .on('error', cleanTempFile)
      .on('finish', function() {

        // Create the file asset
        var categories = getMappedCategories(file.categories);
        AssetsAPI.createFile(toCtx, file.title, {
          'mimetype': file.mime,
          'file': filePath,
          'filename': file.title
        }, {
          'categories': categories,
          'description': file.description || undefined,
          'thumbnail_url': file.thumbnail_url || undefined,
          'image_url': file.image_url || undefined,
          'embed_id': file.embed_id || undefined,
          'embed_key': file.embed_key || undefined,
          'embed_code': file.embed_code || undefined
        }, cleanTempFile);
      });
    });
  });
};

/**
 * Map a list of categories from the source course to the
 * corresponding categories in the destination course
 *
 * @param  {Number[]}         categories          The ids of the source course categories to map
 * @return {Number[]}                             The mapped destination course category ids
 */
var getMappedCategories = function(categories) {
  return _.chain(categories)
          .map(function(category) {
            return categoryMapping[category.id];
          })
          .compact()
          .value();
};

init();
