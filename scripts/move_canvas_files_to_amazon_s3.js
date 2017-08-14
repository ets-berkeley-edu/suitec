#!/usr/bin/env node

/**
 * Copyright ©2017. The Regents of the University of California (Regents). All Rights Reserved.
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
var csv = require('fast-csv');
var fs = require('fs');
var moment = require('moment-timezone');
var os = require('os');
var path = require('path');
var request = require('request');
var url = require('url');
var yargs = require('yargs');

var CourseAPI = require('col-course');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/move_canvas_files_to_amazon_s3');
var MigrateAssetsAPI = require('col-assets/lib/migrate');
var Storage = require('col-core/lib/storage');

var downloadDir = path.join(os.tmpdir(), Date.now().toString());
var successes = [];
var failures = [];
var timezone = config.get('timezone');

var argv = yargs
  .usage('Usage: node $0 --after [YYYY-MM-DD] --before [YYYY-MM-DD] --csv_directory /writable/dir/for/csv-files/')
  .demand([ 'csv_directory' ])
  .describe('after', 'Courses created after this date are eligible')
  .describe('before', 'Courses created before this date are eligible')
  .describe('csv_directory', 'Output directory (CSV files)')
  .alias('a', 'after')
  .alias('b', 'before')
  .alias('c', 'csv_directory')
  .help('h')
  .alias('h', 'help')
  .argv;

/**
 * Log message and prepend/append line breaks
 *
 * @param  {String}       message            What to log
 * @return {void}
 */
var emphatic = function(message) {
  log.warn('\n' + message + '\n');
};

/**
 * Create CSV with Canvas URLs
 *
 * @param  {Object}       data                  Array of objects aligned with column headers (below)
 * @param  {String}       csvFilePath           Absolute path to target CSV file
 * @return {void}
 */
var writeCsv = function(data, csvFilePath) {
  data.unshift([
    'course',
    'type',
    'id',
    'url',
    'notes'
  ]);
  var opts = {
    'quoteColumns': {
      'url': true,
      'notes': true
    }
  };

  csv.writeToStream(fs.createWriteStream(csvFilePath), data, opts);
  emphatic(data.length + ' rows written to ' + csvFilePath);
};

/**
 * @param  {String}       [scope]          'before' or 'after'
 * @param  {String}       [dateString]     Format must match 'YYYY-MM-DD'
 * @return {Object}                        Partial 'where' clause for Sequelize
 */
var whereCreatedAt = function(scope, dateString) {
  var opts = {};

  if (dateString) {
    var date = moment(dateString, 'YYYY-MM-DD').tz(timezone);

    switch (scope) {
      case 'before':
        opts = {
          'created_at': {
            '$lt': date
          }
        };
        break;
      case 'after':
        opts = {
          'created_at': {
            '$gt': date
          }
        };
        break;
      default:
        break;
    }
  }
  return opts;
};

/**
 * @param  {Course}       course           Canvas course
 * @param  {Course}       asset            Asset with URL of Canvas file
 * @param  {Course}       stream           The content being moved (input stream)
 * @param  {Course}       filePath         Where to write content on local disk
 * @param  {Function}     callback         Standard callback function
 * @return {Object}                        Callback result
 */
var storeAssetInAmazonS3 = function(course, asset, stream, filePath, callback) {
  stream.pipe(fs.createWriteStream(filePath))
    .on('error', callback)
    .on('finish', function() {
      // Store file in Amazon S3
      Storage.storeAsset(course.id, filePath, function(err, s3Uri, contentType) {
        if (err) {
          log.error({'err': err.message, 'asset': asset.id, 'download_url': asset.download_url}, 'Failed to store file in Amazon S3');

          return callback(err);
        }

        DB.Asset.update({'download_url': s3Uri}, {'where': {'id': asset.id}}).complete(function(dbErr) {
          if (dbErr) {
            log.error({'err': err.message, 'asset': asset.id, 's3Uri': s3Uri}, 'Failed to update asset');

          } else {
            log.info({'asset': asset.id}, 'Asset ' + asset.title + ' moved to S3');
            successes.push([
              course.id,
              'asset',
              asset.id,
              asset.download_url,
              'Moved to ' + s3Uri
            ]);
          }
          return callback(err);
        });
      });
    });
};

/**
 * Move all course assets of type 'file' to Amazon S3
 *
 * @param  {Course}       course           Canvas course
 * @param  {Function}     callback         Standard callback function
 * @return {Object}                        Callback result
 */
var moveFilesToAmazonS3 = function(course, callback) {
  // Raw SQL is necessary in order to ignore 'deleted' status.
  var query = 'SELECT id, title, type, download_url FROM assets WHERE download_url IS NOT NULL AND type=\'file\' AND course_id=' + course.id;

  DB.getSequelize().query(query, {'model': DB.Asset}).complete(function(err, assets) {
    if (err) {
      log.error({'course': course.id}, 'Failed to fetch assets');

      return callback(err);
    }
    log.info({'course': course.id}, assets.length + ' assets in course \'' + course.name + '\'');

    async.each(assets, function(asset, done) {
      var doneOnce = _.once(done);

      if (Storage.isS3Uri(asset.download_url) || !_.startsWith(asset.download_url, 'http')) {
        // No move is necessary for this asset
        return doneOnce();

      } else {
        log.info({'asset': asset.id}, 'Move ' + asset.title);

        request(asset.download_url).on('error', function(canvasErr) {
          // Record the error then carry on.
          failures.push([
            course.id,
            'asset',
            asset.id,
            asset.download_url,
            'Canvas responded with error: ' + canvasErr.message
          ]);
          log.error({'course': course.id, 'asset': asset.id, 'err': canvasErr.message}, 'Error while requesting file from Canvas');

          return doneOnce();

        }).on('response', function(res) {
          // Extract the name of the file
          var filename = _.split(url.parse(asset.download_url).pathname, '/').pop();
          var filePath = path.join(downloadDir, filename);

          storeAssetInAmazonS3(course, asset, res, filePath, function(s3Err) {
            if (s3Err) {
              log.error({'course': course.id, 'asset': asset.id, 'err': s3Err.message}, 'Error uploading asset to S3');
            }

            return doneOnce();
          });
        });
      }
    }, function(asyncErr) {
      if (asyncErr) {
        log.error({'course': course.id, 'err': asyncErr.message}, 'Error during asset migration');
      } else {
        log.info({'course': course.id}, 'Course asset(s) processed successfully');
      }
      return callback(asyncErr);
    });
  });
};

/**
 * Get courses per criteria, ordered by canvas_api_domain
 *
 * @param  {Object}       opts             If empty, we will get all courses
 * @param  {Function}     callback         Standard callback function
 * @return {Object}                        Callback result
 */
var getCourses = function(opts, callback) {
  // Get courses from the database
  CourseAPI.getCourses(opts, 'canvas_api_domain ASC', function(err, courses) {
    if (err) {
      return callback(err);
    }
    log.info(courses.length + ' courses will be processed');

    return callback(null, courses);
  });
};

/**
 * Do the deed
 *
 * @param  {Function}     callback         Standard callback function
 * @return {Object}                        Callback result
 */
var performTheMove = function(callback) {
  // Connect to the database
  DB.init(function(dbErr) {
    if (dbErr) {
      log.error('Unable to set up a connection to the database');
      return callback(dbErr);
    }
    var opts = _.merge(whereCreatedAt('after', argv.after), whereCreatedAt('before', argv.before));

    emphatic(_.isEmpty(opts) ? 'We will fetch ALL courses' : 'Get courses where ' + JSON.stringify(opts));

    getCourses(opts, function(fetchErr, courses) {
      if (fetchErr) {
        log.error('Failed to fetch courses');
        return callback(fetchErr);
      }
      var canvasApiDomain = null;

      async.each(courses, function(course, done) {
        if (!canvasApiDomain || canvasApiDomain !== course.canvas_api_domain) {
          // Notify user that we are transitioning to a new canvas_api_domain, a new set of courses
          canvasApiDomain = course.canvas_api_domain;
          emphatic('Begin processing courses of ' + canvasApiDomain);
        }
        log.info({'course': course.id}, 'Process course \'' + course.name + '\'');

        if (Storage.useAmazonS3(course)) {
          moveFilesToAmazonS3(course, function(err) {
            if (err) {
              log.error({'err': err.message, 'course': course.id}, 'Failed to move course assets (files) to Amazon S3');
            }
            return done(err);
          });

        } else {
          log.warn({'course': course.id}, 'Skipping course because it does not qualify for Amazon S3 (see config \'aws.s3.cutoverDate\')');
        }

      }, function(err) {
        if (err) {
          log.error({'err': err.message}, 'Failed to process all courses');
        } else {
          log.info('All courses processed successfully');
        }
        return callback(err);
      });
    });
  });
};

/**
 * Perform init tasks and then perform the move
 *
 * @param  {String}      directory         Path to directory we wish to create
 * @param  {Function}    callback          Standard callback function
 * @param  {Object}      [callback.err]    An error that occurred, if any
 * @return {void}
 */
var mkdir = function(directory, callback) {
  fs.stat(directory, function(err, stat) {
    if (err && err.code === 'ENOENT') {
      fs.mkdirSync(directory);
      return callback();
    }

    return callback(err);
  });
};

/**
 * Perform init tasks and then perform the move
 *
 * @param  {Function}    callback              Standard callback function
 * @param  {Object}      [callback.err]        An error that occurred, if any
 * @return {void}
 */
var begin = function() {
  // Apply global utilities
  require('col-core/lib/globals');
  var csvDirectory = argv.csv_directory;

  emphatic('IMPORTANT:\nThis script will respect the \'aws.s3.cutoverDate\' config. All courses created before that date will be skipped, regardless of before/after values.');

  mkdir(csvDirectory, function(csvDirErr) {
    if (csvDirErr) {
      log.error({'downloadDir': csvDirectory, 'err': csvDirErr}, 'Failed to create target CSV directory');
      return;
    }
    mkdir(downloadDir, function(mkdirErr) {
      if (mkdirErr) {
        log.error({'downloadDir': downloadDir, 'err': mkdirErr}, 'Failed to create temp directory');
        return;
      }
      var timestamp = moment().tz(timezone).format('YYYY-MM-DD_HHmmss');
      var successesCsv = path.join(csvDirectory, timestamp + '_move-canvas-files-to-amazon-s3.csv');
      var failuresCsv = path.join(csvDirectory, timestamp + '_FAILURES_move-canvas-files-to-amazon-s3.csv');

      emphatic('Two CSV files (successes and failures) will be written to directory: ' + csvDirectory);

      performTheMove(function(err) {
        if (err) {
          emphatic('The move failed with error: ' + err.message);
        } else {
          emphatic('Woo hoo! The move finished without error.');
        }
        // The source files are in Canvas and can now be deleted
        writeCsv(successes, successesCsv);
        writeCsv(failures, failuresCsv);

        // Clean up
        log.info('Close db connection');
        DB.getSequelize().close();

        fs.unlink(downloadDir, function() {
          return;
        });
      });
    });
  });
};

begin();
