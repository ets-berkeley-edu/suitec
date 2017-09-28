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
 * @param  {String}       message            User-friendly statement
 * @param  {Object}       [context]          Debug info (e.g., asset id)
 * @return {void}
 */
var emphatic = function(message, context) {
  log.warn('\n' + message + '\n' + (context ? JSON.stringify(context) + '\n' : ''));
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
 * @param  {Asset}        asset            Asset with URL of Canvas file
 * @param  {Stream}       stream           The content being moved (input stream)
 * @param  {String}       filePath         Where to write content on local disk
 * @param  {Function}     callback         Standard callback function
 * @return {Object}                        Callback result
 */
var storeAssetFileInAmazonS3 = function(asset, stream, filePath, callback) {
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
 * @param  {Whiteboard}   whiteboard       Whiteboard with image URL
 * @param  {Stream}       stream           The content being moved (input stream)
 * @param  {String}       filePath         Where to write content on local disk
 * @param  {Function}     callback         Standard callback function
 * @return {Object}                        Callback result
 */
var storeWhiteboardImageInAmazonS3 = function(whiteboard, stream, filePath, callback) {
  stream.pipe(fs.createWriteStream(filePath))
    .on('error', callback)
    .on('finish', function() {
      // Store file in Amazon S3
      Storage.storeWhiteboardImage(whiteboard, filePath, function(err, s3Uri, contentType) {
        if (err) {
          log.error({'err': err.message, 'course': whiteboard.course_id, 'whiteboard': whiteboard.id, 'image_url': whiteboard.image_url}, 'Failed to store file in Amazon S3');

          return callback(err);
        }

        DB.Whiteboard.update({'image_url': s3Uri}, {'where': {'id': whiteboard.id}}).complete(function(dbErr) {
          if (dbErr) {
            log.error({'err': dbErr.message, 'course': whiteboard.course_id, 'whiteboard': asset.id, 's3Uri': s3Uri}, 'Failed to update whiteboard');

          } else {
            log.info({'course': whiteboard.course_id, 'whiteboard': whiteboard.id}, 'Whiteboard ' + whiteboard.title + ' moved to S3');
            successes.push([
              whiteboard.course_id,
              'whiteboard',
              whiteboard.id,
              whiteboard.image_url,
              'Moved to ' + s3Uri
            ]);
          }
          return callback(err);
        });
      });
    });
};

/**
 * Write failure info to CSV file
 *
 * @param  {Object}           item                The item (e.g., asset file) being migrated
 * @param  {String}           message             Error message
 * @return {void}
 */
var recordFailure = function(item, message) {
  failures.push([
    item.course_id,
    item.entity_type,
    item.id,
    item.download_url,
    message
  ]);
};

/**
 * Move file (related to asset or whiteboard) to Amazon S3.
 *
 * @param  {Object}           item                The item to migrate
 * @param  {Number}           index               Index in the list of courses, used to show progress
 * @param  {Function}         callback            Standard callback function
 * @return {Object}                               Return per callback
 */
var moveFileToAmazonS3 = function(item, index, callback) {
  if (item.download_url) {
    item.entity_type = 'asset';

  } else if (item.image_url) {
    item.entity_type = 'whiteboard';
    item.download_url = item.image_url;

  } else {
    emphatic('[ERROR] Unrecognized item:', item);
    return callback();
  }

  if (Storage.isS3Uri(item.download_url) || !_.startsWith(item.download_url, 'http')) {
    log.info({'course': item.course_id, 'id': item.id}, item.entity_type + ' \'' + item.title + '\' requires no action');
    return callback();

  } else {
    log.info({'course': item.course_id, 'id': item.id}, 'Prepare to move ' + item.entity_type + ' \'' + item.title + '\'');

    try {
      request(item.download_url).on('error', function(canvasErr) {
        // Record the error and carry on
        failures.push([
          item.course_id,
          item.entity_type,
          item.id,
          item.download_url,
          'Canvas responded with error: ' + canvasErr.message
        ]);
        emphatic('Error while requesting file from Canvas', {'course': item.course_id, 'type': item.entity_type, 'id': item.id, 'err': canvasErr.message});
        recordFailure(item, 'Error: ' + canvasErr.message);

        return callback();

      }).on('response', function(res) {
        // Extract the name of the file
        var filename = item.entity_type + '-' + item.id + '_' + _.split(url.parse(item.download_url).pathname, '/').pop();
        var filePath = path.join(downloadDir, filename);
        var storeFunction = item.entity_type === 'asset' ? storeAssetFileInAmazonS3 : storeWhiteboardImageInAmazonS3;

        storeFunction(item, res, filePath, function(s3Err) {
          if (s3Err) {
            emphatic('Error uploading file to S3', {'course': item.course_id, 'type': item.entity_type, 'id': item.id, 'err': s3Err.message});
            recordFailure(item, 'Error: ' + s3Err.message);
          }
          // Delete temp file
          fs.unlink(filePath, function() {
            return callback();
          });
        });
      });

    } catch (uncaughtErr) {
      // Record the error and carry on
      emphatic('[ERROR] Failed to move file to Amazon S3', {'item': item, 'err': uncaughtErr});
      recordFailure(item, 'Error: ' + uncaughtErr.message);

      return callback();
    }
  }
};

/**
 * Move all course assets of type 'file' to Amazon S3
 *
 * @param  {Course}       course           Canvas course
 * @param  {Function}     callback         Standard callback function
 * @return {Object}                        Callback result
 */
var moveAssetsToAmazonS3 = function(course, callback) {
  // Raw SQL is necessary in order to ignore 'deleted' status.
  var query = 'SELECT id, course_id, title, type, download_url FROM assets WHERE download_url IS NOT NULL AND type IN (\'file\', \'whiteboard\') AND download_url LIKE \'http%\' AND download_url NOT LIKE \'%amazonaws%\' AND course_id=' + course.id;

  DB.getSequelize().query(query, {'model': DB.Asset}).complete(function(err, assets) {
    if (err) {
      log.error({'err': err.message, 'course': course.id, 'canvas_api_domain': course.canvas_api_domain}, 'Failed to fetch assets');

      return callback(err);
    }

    log.info({'course': course.id, 'canvas_api_domain': course.canvas_api_domain}, assets.length + ' assets in course \'' + course.name + '\'');

    async.eachOfSeries(assets, moveFileToAmazonS3, function() {
      return callback();
    });
  });
};

/**
 * Move all course whiteboard files (image_url) from Canvas to Amazon S3
 *
 * @param  {Course}       course           Canvas course
 * @param  {Function}     callback         Standard callback function
 * @return {Object}                        Callback result
 */
var moveWhiteboardImagesToAmazonS3 = function(course, callback) {
  // Raw SQL is necessary in order to ignore 'deleted' status.
  var query = 'SELECT id, course_id, title, image_url FROM whiteboards WHERE image_url LIKE \'http%\' AND image_url NOT LIKE \'%amazonaws%\' AND course_id=' + course.id;

  DB.getSequelize().query(query, {'model': DB.Whiteboard}).complete(function(err, whiteboards) {
    if (err) {
      log.error({'err': err.message, 'course': course.id, 'canvas_api_domain': course.canvas_api_domain}, 'Failed to fetch whiteboards');

      return callback(err);
    }

    log.info({'course': course.id, 'canvas_api_domain': course.canvas_api_domain}, whiteboards.length + ' whiteboards in course \'' + course.name + '\'');

    async.eachOfSeries(whiteboards, moveFileToAmazonS3, function() {
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
 * Move files of SuiteC course from Canvas to Amazon S3.
 *
 * @param  {Course}           course              The course to update
 * @param  {Number}           index               Index in the list of courses, used to show progress
 * @param  {Function}         callback            Standard callback function
 * @return {Object}                               Return per callback
 */
var processCourse = function(course, index, callback) {
  log.info({'course': course.id, 'canvas_api_domain': course.canvas_api_domain}, 'Prepare to move course \'' + course.name + '\' files to Amazon S3');

  moveAssetsToAmazonS3(course, function(err) {
    if (err) {
      log.error({'err': err.message, 'course': course.id}, 'Failed to move some or all course assets to Amazon S3');
    }

    moveWhiteboardImagesToAmazonS3(course, function(moveErr) {
      if (moveErr) {
        log.error({'err': moveErr.message, 'course': course.id}, 'Failed to move some or all course whiteboard images to Amazon S3');
      }

      coursesProcessed.push(course);

      return callback();
    });
  });
};

/**
 * Move files to Amazon S3
 *
 * @param  {Function}     callback                      Standard callback function
 * @param  {Object}       [callback.err]                An error that occurred, if any
 * @return {Object}                                     Callback result
 */
var moveFiles = function(callback) {
  // The date range is exclusive. E.g., created_at must be less than beforeDate, not less than or equal.
  var afterDate = moment(argv.after, 'YYYY-MM-DD').endOf('day').tz(timezone);
  var beforeDate = moment(argv.before, 'YYYY-MM-DD').startOf('day').tz(timezone);

  var opts = _.merge(whereCreatedAt('after', afterDate), whereCreatedAt('before', beforeDate));

  if (_.isEmpty(opts)) {
    emphatic('We will fetch ALL courses');
  } else {
    emphatic('Get courses where:', opts);
  }

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

      async.eachOfSeries(courses, processCourse, function() {
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
        log.error({'csvDirectory': csvDirectory, 'err': csvDirErr}, 'Failed to create target CSV directory');
        return callback();
      }
      mkdir(downloadDir, function(mkdirErr) {
        if (mkdirErr) {
          log.error({'downloadDir': downloadDir, 'err': mkdirErr}, 'Failed to create temp directory');
          return callback();
        } else {
          log.info('CSV files will be written to ' + csvDirectory);
        }

        log.info('We will use temp directory for downloads: ' + downloadDir);

        moveFiles(function(err) {
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

            if (successes.length === 0 && failures.length === 0) {
              summary += '\n\nWithin the courses considered, no files need to be moved from the Canvas filesystem to Amazon S3.';
            } else {
              summary += '\n\n' + successes.length + pluralize(successes.length, ' file', 's') + ' moved to Amazon S3';
              summary += '\n\n' + failures.length + pluralize(failures.length, ' file', 's') + ' FAILED to move to Amazon S3';
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
