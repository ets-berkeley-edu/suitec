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
var path = require('path');
var request = require('request');
var util = require('util');
var yargs = require('yargs');

var CourseAPI = require('col-course');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/20170928-col1108/clean_up_canvas_after_s3_migration');

var failures = [];
var notFound = [];
var successes = [];
var timezone = config.get('timezone');
var totalCourseCount = 0;

var argv = yargs
  .usage('Usage: node $0 [--after YYYY-MM-DD] [--before YYYY-MM-DD] [--id 123] --csv_directory /writable/dir/for/csv-files/')
  .demand([ 'csv_directory' ])
  .describe('after', 'Courses created after this date are eligible')
  .describe('before', 'Courses created before this date are eligible')
  .describe('id', 'The SuiteC course id to process')
  .describe('csv_directory', 'Output directory (CSV files)')
  .alias('a', 'after')
  .alias('b', 'before')
  .alias('i', 'id')
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
    data.unshift(['course_id', 'canvas_course_id', 'notes']);
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
 * Write failure info to CSV file
 *
 * @param  {Course}       course              The course being cleaned up
 * @param  {String}       message             Error message
 * @return {void}
 */
var recordFailure = function(course, message) {
  failures.push([course.id, course.canvas_course_id, message]);
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

var getCanvasBaseURI = function(canvas) {
  var canvasProtocol = (canvas.use_https ? 'https' : 'http');
  return util.format('%s://%s', canvasProtocol, canvas.canvas_api_domain);
};

/**
 * Attempt to delete obsolete Canvas folder
 *
 * @param  {Course}           course                    The course to update
 * @param  {Number}           folderName                Name of hidden SuiteC folder (we expect '_suitec' or '_collabosphere')
 * @param  {Function}         callback                  Standard callback function
 * @param  {Object}           [callback.err]            An error that occurred, if any
 * @param  {Object}           [callback.responseCode]   HTTP response code from Canvas
 * @return {Object}                                     Callback return
 */
var deleteCanvasFolderPerCourse = function(course, folderName, callback) {
  log.info({
    'course': course.id,
    'canvas_course_id': course.canvas_course_id,
    'canvas_api_domain': course.canvas_api_domain
  }, 'Prepare to clean up course \'' + course.name + '\'');

  var getFolderUrl = util.format('%s/api/v1/courses/%d/folders/by_path/%s',
    getCanvasBaseURI(course.canvas),
    course.canvas_course_id,
    folderName);
  var getFolderOpts = {
    'url': getFolderUrl,
    'method': 'GET',
    'headers': {
      'Authorization': util.format('Bearer %s', course.canvas.api_key)
    }
  };

  request(getFolderOpts, function(err, response, body) {
    if (response.statusCode === 404) {
      log.info({
        'course': course.id,
        'canvas_course_id': course.canvas_course_id
      }, folderName + ' folder does not exist');

      return callback(err, response.statusCode);

    } else if (err) {
      log.error({
        'err': err,
        'responseStatus': response.statusCode,
        'course': course.id,
        'canvas_course_id': course.canvas_course_id,
        'folderName': folderName
      }, 'Failed to check existence of Canvas folder');

      recordFailure(course, 'Err: ' + err.message);

      return callback(err, response.statusCode);

    } else if (response.statusCode !== 200) {
      log.error({
        'response': response,
        'course': course.id,
        'canvas_course_id': course.canvas_course_id,
        'folderName': folderName
      }, 'Failed to check existence of Canvas folder; unexpected status code');

      recordFailure(course, 'Unexpected response status: ' + response.statusCode);

      return callback(err, response.statusCode);
    }

    var folderInfo = null;
    try {
      folderInfo = JSON.parse(body);
    } catch (parseErr) {
      log.error({
        'err': parseErr,
        'course': course.id
      }, 'Failed to parse Canvas response');

      recordFailure(course, 'Failed to parse Canvas response. Parse err: ' + parseErr.message);

      return callback(parseErr, response.statusCode);
    }

    var folderId = _.last(folderInfo).id;

    emphatic(util.format('Course \'%s\' (%d, %d) has folder: %s',
      course.name,
      course.id,
      course.canvas_course_id,
      folderName));

    var deleteFolderUrl = util.format('%s/api/v1/folders/%d', getCanvasBaseURI(course.canvas), folderId);
    var readTimeout = config.get('canvasPoller.timeout') * 1000;
    var opts = {
      'url': deleteFolderUrl,
      'method': 'DELETE',
      'headers': {
        'Authorization': util.format('Bearer %s', course.canvas.api_key)
      },
      'qs': {
        'force': 'true'
      },
      'timeout': readTimeout
    };

    request(opts, function(deleteErr, deleteResponse, deleteBody) {
      if (deleteErr) {
        log.error({
          'err': deleteErr,
          'responseStatus': deleteResponse.statusCode,
          'course': course.id
        }, 'Failed to delete folder in Canvas');
        recordFailure(course, 'Err: ' + deleteErr.message);

        return callback(deleteErr, deleteResponse.statusCode);

      } else if (deleteResponse.statusCode !== 200) {
        var statusErr = {
          'message': 'Failed to delete folder in Canvas. Unexpected response status: ' + deleteResponse.statusCode
        };

        // Record info in the failures report
        recordFailure(course, statusErr.message);
        log.error({
          'response': deleteResponse,
          'course': course.id
        }, statusErr.message);

        return callback(statusErr, deleteResponse.statusCode);
      }
      log.info({
        'course': course.id,
        'name': course.name
      }, 'Successfully cleaned up course');

      successes.push([course.id, course.canvas_course_id, course.name]);

      return callback(null, deleteResponse.statusCode);
    });
  });
};

/**
 * Attempt to delete obsolete Canvas folder(s)
 *
 * @param  {Course}           course             Course with valid canvas_course_id
 * @param  {Number}           index              Indicates progress in list of all courses
 * @param  {Function}         callback           Standard callback function
 * @return {Object}                              Callback return
 */
var deleteObsoleteCanvasFolders = function(course, index, callback) {
  deleteCanvasFolderPerCourse(course, '_suitec', function(err, responseCode) {
    // If err is non-null then info was logged/recorded in deleteCanvasFolderPerCourse().
    if (responseCode === 404) {
      log.warn({'course': course.id}, 'No \'_suitec\' folder found so we check for a \'_collabosphere\' folder.');

      // Retry with old naming scheme. (Legacy course sites might have '_collabosphere'.)
      deleteCanvasFolderPerCourse(course, '_collabosphere', function(errAgain, nextResponseCode) {
        if (nextResponseCode === 404) {
          log.warn({'course': course.id}, 'No \'_collabosphere\' folder found.');
          // The 404 will be written to final 'notFound' report
          notFound.push([course.id, course.canvas_course_id, course.name]);
        }

        return callback();
      });

    } else {
      // Folder was found and the success (or failure) was recorded in deleteCanvasFolderPerCourse().
      return callback();
    }
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
 * Remove Canvas directory containing obsolete asset files
 *
 * @param  {Function}     callback                      Standard callback function
 * @param  {Object}       [callback.err]                An error that occurred, if any
 * @return {Object}                                     Callback result
 */
var cleanUpCanvasFilesystem = function(callback) {
  var opts = {};

  if (argv.id) {
    opts = {id: argv.id};

  } else {
    // The date range is exclusive. E.g., created_at must be less than beforeDate, not less than or equal.
    var afterDate = moment(argv.after, 'YYYY-MM-DD').endOf('day').tz(timezone);
    var beforeDate = moment(argv.before, 'YYYY-MM-DD').startOf('day').tz(timezone);

    opts = _.merge(whereCreatedAt('after', afterDate), whereCreatedAt('before', beforeDate));
  }

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

      async.eachOfSeries(courses, deleteObsoleteCanvasFolders, function() {
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

      cleanUpCanvasFilesystem(function(err) {
        if (err) {
          emphatic('[ERROR] Problem summary: \n' + err.message);

        } else if (totalCourseCount === 0) {
          emphatic('No matching courses found.');

        } else {
          var summary = 'Processing is complete.';

          if (failures.length === 0 && notFound.length === 0 && successes.length === 0) {
            summary += '\n\nNo Canvas filesystem cleanup is necessary.';
          } else {
            summary += '\n\n' + failures.length + pluralize(failures.length, ' course', 's') + ' FAILED';
            summary += '\n\n' + notFound.length + pluralize(notFound.length, ' course', 's') + ' had neither \'_suitec\' nor \'_collabosphere\' folder';
            summary += '\n\n' + successes.length + pluralize(successes.length, ' course', 's') + ' cleaned up in Canvas';
          }

          emphatic(summary);
        }

        // The source files are in Canvas and can now be deleted
        var timestamp = moment().tz(timezone).format('YYYY-MM-DD_HHmmss');

        writeCsv(failures, path.join(csvDirectory, timestamp + '_FAILURE_clean-up-canvas.csv'), 'failures');
        writeCsv(notFound, path.join(csvDirectory, timestamp + '_NOTFOUND_clean-up-canvas.csv'), 'notFound');
        writeCsv(successes, path.join(csvDirectory, timestamp + '_SUCCESS_clean-up-canvas.csv'), 'successes');

        return callback();
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
