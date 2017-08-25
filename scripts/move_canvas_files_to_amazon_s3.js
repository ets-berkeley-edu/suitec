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

var coursesProcessed = [];
var coursesSkipped = [];
var downloadDir = path.join(os.tmpdir(), Date.now().toString());
var failures = [];
var successes = [];
var timezone = config.get('timezone');
var totalCourseCount = 0;

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
 * @param  {Number}       count              Whole number
 * @param  {String}       itemName           Name of item being described (e.g., 'asset')
 * @param  {String}       suffix             Suffix to apply when count is not one
 * @return {void}
 */
var pluralize = function(count, itemName, suffix) {
  return itemName + (count === 1 ? '' : suffix);
};

/**
 * Create CSV with Canvas URLs
 *
 * @param  {Object}       data                  Array of objects aligned with column headers (below)
 * @param  {String}       csvFilePath           Absolute path to target CSV file
 * @param  {String}       outputType            Short description of data
 * @return {void}
 */
var writeCsv = function(data, csvFilePath, outputType) {
  var rowCount = data.length;

  if (rowCount > 0) {
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

    emphatic('The \'' + outputType + '\' CSV file (' + rowCount + pluralize(rowCount, ' row', 's') + ') is ' + csvFilePath);
  }
};

/**
 * @param  {String}       [scope]          'before' or 'after'
 * @param  {String}       [date]           Valid date
 * @return {Object}                        Partial 'where' clause for Sequelize
 */
var whereCreatedAt = function(scope, date) {
  var opts = {};

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

  return opts;
};

/**
 * @param  {Course}       asset            Asset with URL of Canvas file
 * @param  {Course}       stream           The content being moved (input stream)
 * @param  {Course}       filePath         Where to write content on local disk
 * @param  {Function}     callback         Standard callback function
 * @return {Object}                        Callback result
 */
var storeAssetInAmazonS3 = function(asset, stream, filePath, callback) {
  stream.pipe(fs.createWriteStream(filePath))
    .on('error', callback)
    .on('finish', function() {
      // Store file in Amazon S3
      Storage.storeAsset(asset.course_id, filePath, function(err, s3Uri, contentType) {
        if (err) {
          log.error({'err': err.message, 'course': asset.course_id, 'asset': asset.id, 'download_url': asset.download_url}, 'Failed to store file in Amazon S3');

          return callback(err);
        }

        DB.Asset.update({'download_url': s3Uri}, {'where': {'id': asset.id}}).complete(function(dbErr) {
          if (dbErr) {
            log.error({'err': dbErr.message, 'course': asset.course_id, 'asset': asset.id, 's3Uri': s3Uri}, 'Failed to update asset');

          } else {
            log.info({'course': asset.course_id, 'asset': asset.id}, 'Asset ' + asset.title + ' moved to S3');
            successes.push([
              asset.course_id,
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
 * Move file asset to Amazon S3.
 *
 * @param  {Asset}            asset               The asset to update
 * @param  {Number}           index               Index in the list of courses, used to show progress
 * @param  {Function}         callback            Standard callback function
 * @return {Object}                               Return per callback
 */
var moveAsset = function(asset, index, callback) {
  if (Storage.isS3Uri(asset.download_url) || !_.startsWith(asset.download_url, 'http')) {
    log.info({'course': asset.course_id, 'asset': asset.id}, 'Asset \'' + asset.title + '\' requires no action');
    return callback();

  } else {
    log.info({'course': asset.course_id, 'asset': asset.id}, 'Prepare to move asset \'' + asset.title + '\'');

    request(asset.download_url).on('error', function(canvasErr) {
      // Record the error then carry on.
      failures.push([
        asset.course_id,
        'asset',
        asset.id,
        asset.download_url,
        'Canvas responded with error: ' + canvasErr.message
      ]);
      log.error({'course': asset.course_id, 'asset': asset.id, 'err': canvasErr.message}, 'Error while requesting file from Canvas');

      return callback(canvasErr);

    }).on('response', function(res) {
      // Extract the name of the file
      var filename = 'asset-' + asset.id + '_' + _.split(url.parse(asset.download_url).pathname, '/').pop();
      var filePath = path.join(downloadDir, filename);

      storeAssetInAmazonS3(asset, res, filePath, function(s3Err) {
        if (s3Err) {
          log.error({'course': asset.course_id, 'asset': asset.id, 'err': s3Err.message}, 'Error uploading asset to S3');

          return callback(s3Err);
        }

        return callback();
      });
    });
  }
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
  var query = 'SELECT id, course_id, title, type, download_url FROM assets WHERE download_url IS NOT NULL AND type=\'file\' AND course_id=' + course.id;

  DB.getSequelize().query(query, {'model': DB.Asset}).complete(function(err, assets) {
    if (err) {
      log.error({'err': err.message, 'course': course.id, 'canvas_api_domain': course.canvas_api_domain}, 'Failed to fetch assets');

      return callback(err);
    }

    log.info({'course': course.id, 'canvas_api_domain': course.canvas_api_domain}, assets.length + ' assets in course \'' + course.name + '\'');

    async.eachOfSeries(assets, moveAsset, function() {
      return callback();
    });
  });
};

/**
 * Get courses per criteria, ordered by canvas_api_domain
 *
 * @param  {Object}       opts                 If empty, we will get all courses
 * @param  {Function}     callback             Standard callback function
 * @param  {Object}       [callback.err]       An error that occurred, if any
 * @param  {Object}       [callback.courses]   Courses matching criteria
 * @return {Object}                            Callback result
 */
var getCourses = function(opts, callback) {
  // Get courses from the database
  CourseAPI.getCourses(opts, 'canvas_api_domain ASC', function(err, courses) {
    if (err) {
      return callback(err);
    }
    emphatic(courses.length + ' courses will be processed: ' + _.map(courses, 'id'));

    return callback(null, courses);
  });
};

/**
 * Move file assets of SuiteC course from Canvas to Amazon S3.
 *
 * @param  {Course}           course              The course to update
 * @param  {Number}           index               Index in the list of courses, used to show progress
 * @param  {Function}         callback            Standard callback function
 * @return {Object}                               Return per callback
 */
var updateCourseAssets = function(course, index, callback) {
  if (Storage.useAmazonS3(course)) {
    log.info({'course': course.id, 'canvas_api_domain': course.canvas_api_domain}, 'Prepare to move course \'' + course.name + '\' files to Amazon S3');

    try {
      moveFilesToAmazonS3(course, function(err) {
        if (err) {
          log.error({'err': err.message, 'course': course.id}, 'Failed to move some or all course assets (files) to Amazon S3');
        } else {
          log.info({'course': course.id}, 'Finished processing course \'' + course.name + '\' without error');
        }
        coursesProcessed.push(course);

        return callback();
      });
    } catch (uncaughtErr) {
      log.error({'err': uncaughtErr.message}, 'Error during Amazon S3 move operation');

      return callback(uncaughtErr);
    }

  } else {
    coursesSkipped.push(course);
    log.warn({'course': course.id}, 'Skipping course because it does not qualify for Amazon S3 (see config \'aws.s3.cutoverDate\')');

    return callback();
  }
};

/**
 * Move files to Amazon S3
 *
 * @param  {Function}     callback                      Standard callback function
 * @param  {Object}       [callback.err]                An error that occurred, if any
 * @return {Object}                                     Callback result
 */
var moveAssets = function(callback) {
  // The date range is exclusive. E.g., created_at must be less than beforeDate, not less than or equal.
  var afterDate = moment(argv.after, 'YYYY-MM-DD').endOf('day').tz(timezone);
  var beforeDate = moment(argv.before, 'YYYY-MM-DD').startOf('day').tz(timezone);

  var opts = _.merge(whereCreatedAt('after', afterDate), whereCreatedAt('before', beforeDate));

  emphatic(_.isEmpty(opts) ? 'We will fetch ALL courses' : 'Get courses where ' + JSON.stringify(opts));

  DB.init(function(err) {
    if (err) {
      emphatic('[ERROR] Unable to set up a connection to the database');

      return callback(err);
    }
    getCourses(opts, function(fetchErr, courses) {
      if (fetchErr) {
        emphatic('[ERROR] Failed to fetch courses due to error: ' + fetchErr.message);

        return callback(fetchErr);
      }
      totalCourseCount = courses.length;

      async.eachOfSeries(courses, updateCourseAssets, function() {
        log.info('Close db connection');
        DB.getSequelize().close();

        return callback();
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
 * Verify that requested csv_directory is writable
 *
 * @param  {Function}    callback          Standard callback function
 * @param  {Object}      [callback.err]    An error that occurred, if any
 * @return {void}
 */
var getCsvDirectory = function(callback) {
  var csvDirectory = argv.csv_directory;

  fs.access(csvDirectory, fs.W_OK, function(err) {
    if (err) {
      return callback(err, csvDirectory);
    }

    return callback(null, csvDirectory);
  });
};

/**
 * Perform init tasks and then perform the move
 *
 * @param  {Function}    callback              Standard callback function
 * @return {void}
 */
var perform = function(callback) {
  getCsvDirectory(function(permErr, csvDirectory) {
    if (permErr) {
      emphatic('[ERROR] Directory is NOT writable: ' + csvDirectory + ' (err: ' + permErr.message + ')');
      return callback();
    }

    mkdir(csvDirectory, function(csvDirErr) {
      if (csvDirErr) {
        log.error({'downloadDir': csvDirectory, 'err': csvDirErr}, 'Failed to create target CSV directory');
        return callback();
      }
      mkdir(downloadDir, function(mkdirErr) {
        if (mkdirErr) {
          log.error({'downloadDir': downloadDir, 'err': mkdirErr}, 'Failed to create temp directory');
          return callback();
        } else {
          log.info('CSV files will be written to ' + csvDirectory);
        }

        emphatic('IMPORTANT: This script will respect the \'aws.s3.cutoverDate\' config. All courses created before that date will be skipped, regardless of before/after values.');

        moveAssets(function(err) {
          if (totalCourseCount === 0) {
            emphatic('No matching courses found.');

          } else {
            var summary = err ? '[ERROR] An error occurred during the move: ' + err.message : 'Processing is complete.';
            var notProcessedCount = totalCourseCount - coursesProcessed.length;

            if (notProcessedCount > 0) {
              summary += '\n\n[ERROR] ' + notProcessedCount + pluralize(notProcessedCount, ' matching course', 's') + ' not processed.';
            }
            summary += '\n\n' + totalCourseCount + pluralize(coursesProcessed, ' course', 's') + ' were considered';
            summary += '\n\n' + coursesProcessed.length + pluralize(coursesProcessed, ' course', 's') + ' processed';
            if (coursesSkipped.length > 0) {
              summary += '\n\n' + coursesSkipped.length + pluralize(coursesSkipped, ' course', 's') + ' skipped (check value of config \'aws.s3.cutoverDate\')';
            }

            if (successes.length === 0 && failures.length === 0) {
              summary += '\n\nWithin the courses considered, no assets (i.e., files) need to be moved from the Canvas filesystem to Amazon S3.';
            } else {
              summary += '\n\n' + successes.length + pluralize(successes.length, ' asset', 's') + ' moved to Amazon S3';
              summary += '\n\n' + failures.length + pluralize(failures.length, ' asset', 's') + ' FAILED to move to Amazon S3';
            }

            emphatic(summary);
          }

          // The source files are in Canvas and can now be deleted
          var timestamp = moment().tz(timezone).format('YYYY-MM-DD_HHmmss');
          var successesCsv = path.join(csvDirectory, timestamp + '_move-canvas-files-to-amazon-s3.csv');
          var failuresCsv = path.join(csvDirectory, timestamp + '_FAILURES_move-canvas-files-to-amazon-s3.csv');

          writeCsv(successes, successesCsv, 'successes');
          writeCsv(failures, failuresCsv, 'failures');

          // Clean up
          fs.unlink(downloadDir, function() {

            return callback();
          });
        });
      });
    });
  });
};

var init = function() {
  // Apply global utilities
  require('col-core/lib/globals');

  perform(function() {
    emphatic('Done.');
  });
};

init();
