#!/usr/bin/env node

/**
 * Copyright ©2018. The Regents of the University of California (Regents). All Rights Reserved.
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

var yargs = require('yargs');
var argv = yargs
  .usage('Usage: $0 --canvas [canvas] --suitec [suitec]')
  .demand(['canvas', 'suitec'])
  .describe('canvas', 'Canvas API domain on which tools should be reset')
  .describe('suitec', 'Base URL for the SuiteC instance to which tools should be pointed')
  .example('$0 --canvas bcourses.berkeley.edu --suitec https://app.ets-berkeley-suitec.net')
  .wrap(100)
  .argv;

var _ = require('lodash');
var async = require('async');

var CollabosphereConstants = require('col-core/lib/constants');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/reset_lti');
var CanvasAPI = require('col-canvas');
var CourseAPI = require('col-course');

// Keep track of results.
var results = {
  'success': [],
  'notfound': [],
  'error': []
};

// Keep track of the number of courses to display progress.
var courseCount = null;

/**
 * Connect to the database and kick off.
 * @return {void}
 */
var init = function() {
  require('col-core/lib/globals');

  DB.init(function(dbErr) {
    if (dbErr) {
      return log.error({'err': dbErr}, 'Unable to establish a database connection');
    }

    log.info('Connected to the database');

    CourseAPI.getCourses({'canvas_api_domain': argv.canvas}, null, function(err, courses) {
      if (err) {
        log.error({'err': err}, 'Unable to retrieve courses for LTI reset');
        return callback();
      }

      courseCount = courses.length;

      async.eachOfSeries(courses, updateToolsForCourse, function() {
        log.info('Finished. ' + results.success.length + ' tools were successfully updated.');
        if (results.notfound.length) {
          log.info({'Not found': results.notfound}, results.notfound.length + ' tools were not found.');
        }
        if (results.error.length) {
          log.info({'Errors': results.error}, results.error.length + ' tools had errors.');
        }

        DB.getSequelize().close();
      });
    });
  });
};

/**
 * Update SuiteC tools associated with a Canvas course.
 *
 * @param  {Course}           course              The course to update
 * @param  {Number}           index               Index in the list of courses, used to show progress
 * @param  {Function}         callback            Standard callback function
 * @return {Object}                               Return per callback
 */
var updateToolsForCourse = function(course, index, callback) {
  log.info({'course': course.id}, 'Updating course ' + (index + 1) + ' of ' + courseCount);

  // Get active tools in the course which we haven't yet tried to process.
  var toolsToUpdate = getTools(course);
  if (_.isEmpty(toolsToUpdate)) {
    return callback();
  }

  CanvasAPI.getExternalToolsForCourse(course, function(apiErr, courseTools) {
    if (apiErr) {
      log.error({'err': apiErr, 'course': course.id}, 'Failed to get external tool configurations for course');
      results.error = results.error.concat(toolsToUpdate);
      return callback();
    }

    async.eachOfSeries(toolsToUpdate, function(tool, toolIndex, done) {
      // If the tool doesn't show under the course, it may be configured under a higher-level account. Move on to
      // the next tool.
      if (!_.find(courseTools, {'id': tool.id})) {
        return done();
      }

      // If we've found the tool configuration, attempt to update.
      CanvasAPI.updateExternalToolForCourse(course, tool.id, tool.name, argv.suitec, function(updateErr, data) {
        if (updateErr) {
          log.error({'err': updateErr, 'course': course.id, 'tool': tool}, 'Failed to update tool');
          results.error.push(tool);
        } else {
          log.info({'tool': tool, 'course': course.id}, 'Updated tool at the course level');
          results.success.push(tool);
        }

        // Whether we've succeeded or errored, we shouldn't try this tool again. Null out the array at this toolIndex.
        toolsToUpdate[toolIndex] = null;
        return done();
      });

    }, function() {
      // Remove elements that were nulled out during iteration.
      toolsToUpdate = _.compact(toolsToUpdate);
      if (_.isEmpty(toolsToUpdate)) {
        return callback();
      }

      // If we still have tools to update, get the parent account ID and look for configurations there.
      CanvasAPI.getCourseProperties(course, function(err, courseProperties) {
        if (err) {
          log.error({'err': err, 'course': course.id}, 'Failed to get course properties');
          results.error = results.error.concat(toolsToUpdate);
          return callback();
        }
        if (!courseProperties.account_id) {
          // If we can't find a parent account ID, mark the remaining tools as not found.
          results.notfound = results.notfound.concat(toolsToUpdate);
          return callback();
        }

        return updateToolsForAccount(course.canvas, courseProperties.account_id, toolsToUpdate, callback);
      });
    });
  });
};

/**
 * Update SuiteC tools associated with a Canvas account.
 *
 * @param  {Canvas}           canvas              The Canvas object to update
 * @param  {Number}           accountId           The id of the account to update
 * @param  {Object[]}         toolsToUpdate       Tools to be updated
 * @param  {Function}         callback            Standard callback function
 * @return {Object}                               Return per callback
 */
var updateToolsForAccount = function(canvas, accountId, toolsToUpdate, callback) {
  CanvasAPI.getExternalToolsForAccount(canvas, accountId, function(apiErr, accountTools) {
    if (apiErr) {
      log.error({'err': apiErr, 'accountId': accountId}, 'Failed to get external tool configurations');
      results.error = results.error.concat(toolsToUpdate);
      return callback();
    }

    async.eachOfSeries(toolsToUpdate, function(tool, toolIndex, done) {
      // If the tool doesn't show under this account, it may be configured under a higher-level account. Move on to
      // the next tool.
      if (!_.find(accountTools, {'id': tool.id})) {
        return done();
      }

      // If we've found the tool configuration, attempt to update.
      CanvasAPI.updateExternalToolForAccount(canvas, accountId, tool.id, tool.name, argv.suitec, function(err, data) {
        if (err) {
          log.error({'err': err, 'account': accountId, 'tool': tool}, 'Failed to update tool');
          results.error.push(tool);
        } else {
          log.info({'tool': tool, 'account': accountId}, 'Updated tool at the account level');
          results.success.push(tool);
        }

        // Whether we've succeeded or errored, we shouldn't try this tool again. Null out the array at this toolIndex.
        toolsToUpdate[toolIndex] = null;
        return done();
      });

    }, function() {
      // Remove elements that were nulled out during iteration.
      toolsToUpdate = _.compact(toolsToUpdate);
      if (_.isEmpty(toolsToUpdate)) {
        return callback();
      }

      // If we still have tools to update, get the parent account ID and look for configurations there.
      CanvasAPI.getAccountProperties(canvas, accountId, function(err, accountProperties) {
        if (err) {
          log.error({'err': err, 'account': accountId}, 'Failed to get account properties');
          results.error = results.error.concat(toolsToUpdate);
          return callback();
        }
        if (!accountProperties.parent_account_id) {
          // If we can't find a parent account ID, mark the remaining tools as not found.
          results.notfound = results.notfound.concat(toolsToUpdate);
          return callback();
        }

        return updateToolsForAccount(canvas, accountProperties.parent_account_id, toolsToUpdate, callback);
      });
    });
  });
};

/**
 * Get configuration info for the SuiteC tools in a given course.
 *
 * @param  {Course}           course              The course for which to return information
 * @return {Object[]}         callback            Configuration information for tools
 */
var getTools = function(course) {
  var tools = [];
  _.each([
    'assetlibrary',
    'dashboard',
    'engagementindex',
    'whiteboards'
  ], function(toolName) {

    // Attempt to parse out Canvas tool ids from the URL values in the database.
    var toolUrl = course[toolName + '_url'];
    var toolMatch;
    var toolId;
    if (toolUrl) {
      if ((toolMatch = toolUrl.match(CollabosphereConstants.TOOL_URL_FORMAT)) && (toolId = Number(toolMatch[1]))) {
        var toolProperties = {
          'id': toolId,
          'name': toolName
        };

        // If another course has already updated or errored on this tool configuration, don't retry.
        if (!_.find(results.success, toolProperties) && !_.find(results.error, toolProperties)) {
          tools.push(_.assign(toolProperties, {'courseId': course.id}));
        }
      } else {
        // If the URL value has an unexpected format, report the error.
        results.error.push({
          'courseId': course.id,
          'name': toolName,
          'toolUrl': toolUrl
        });
      }
    }
  });
  return tools;
};

init();
