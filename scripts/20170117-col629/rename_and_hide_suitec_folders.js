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
var request = require('request');
var util = require('util');

var CourseAPI = require('col-course');
var CollabosphereConstants = require('col-core/lib/constants');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/20170117-col629/rename_and_hide_suitec_folders');

var updated = [];
var notFound = [];
var errored = [];

var init = function() {
  // Apply global utilities.
  require('col-core/lib/globals');

  // Connect to the database.
  DB.init(function(err) {
    if (err) {
      return log.error({'err': err}, 'Unable to set up a connection to the database');
    }
    log.info('Connected to the database');

    updateFolders();
  });
};

var updateFolders = function() {
  // Get all active courses.
  CourseAPI.getCourses(null, null, function(err, courses) {
    if (err) {
      log.error({'err': err}, 'Failed to get courses');
      return callback(err);
    }

    async.eachSeries(courses, delayedUpdateFolderForCourse, function(err) {
    	if (err) {
        log.error({'err': err}, 'Failed to update folders');
      } else {
        log.info(
          {'updated': updated, 'notFound': notFound, 'errored': errored},
          'Finished. Updated folder in ' + updated.length + ' courses; folder not found in ' + notFound.length + ' courses; ' + errored.length + ' errors.'
        );
      }
    });
  });
};

// This function is our clunky means of leaving space between requests so as not to trigger Canvas throttling.
var lastUpdate = Date.now();
var delayedUpdateFolderForCourse = function(course, callback) {
  var timeout = 5000 - (Date.now() - lastUpdate);
  if (timeout < 0) {
    timeout = 0;
  }
  lastUpdate = Date.now();
  setTimeout(updateFolderForCourse, timeout, course, callback);
};

// Look for a _collabosphere folder. If one exists, rename it to _suitec and mark it as hidden.
var updateFolderForCourse = function(course, callback) {
  log.debug({
    'course': course.id,
    'canvas_course_id': course.canvas_course_id,
    'canvas_api_domain': course.canvas_api_domain
  }, 'Updating folder for a Canvas course');

  var getFolderUrl = util.format('%s/api/v1/courses/%d/folders/by_path/_collabosphere', getCanvasBaseURI(course.canvas), course.canvas_course_id);
  var getFolderOpts = {
    'url': getFolderUrl,
    'method': 'GET',
    'headers': {
      'Authorization': util.format('Bearer %s', course.canvas.api_key)
    }
  };

  request(getFolderOpts, function(err, response, body) {
    if (err) {
      log.error({'err': err, 'course': course.id}, 'Failed to check existence of Canvas upload folder');
      errored.push(course.id);
      return callback();
    } else if (response.statusCode === 404) {
      log.info({'course': course.id}, 'No _collabosphere folder found in course');
      notFound.push(course.id);
      return callback();
    } else if (response.statusCode !== 200) {
      log.error({'response': response, 'course': course.id}, 'Failed to check existence of Canvas upload folder; unexpected status code');
      errored.push(course.id);
      return callback();
    }

    var folderInfo = null;
    try {
      folderInfo = JSON.parse(body);
    } catch (parseErr) {
      log.error({'err': parseErr, 'course': course.id}, 'Failed to parse Canvas response');
      errored.push(course.id);
      return callback();
    }

    var folderId = _.last(folderInfo).id;
    var updateFolderUrl = util.format('%s/api/v1/folders/%d', getCanvasBaseURI(course.canvas), folderId);
    var updateFolderOpts = {
      'url': updateFolderUrl,
      'method': 'PUT',
      'headers': {
        'Authorization': util.format('Bearer %s', course.canvas.api_key)
      },
      'json': {
      	'name': '_suitec',
      	'hidden': true
      }
    };

    request(updateFolderOpts, function(err, response, body) {
      if (err || (response.statusCode !== 200)) {
        log.error({'err': err, 'response': response, 'course': course.id}, 'Failed to update folder in Canvas');
        errored++;
        return callback();
      }

      log.info({'course': course.id}, 'Updated folder');
      updated.push(course.id);
      return callback();
    });
  });
};

var getCanvasBaseURI = function(canvas) {
  var canvasProtocol = (canvas.use_https ? 'https' : 'http');
  return util.format('%s://%s', canvasProtocol, canvas.canvas_api_domain);
};

init();
