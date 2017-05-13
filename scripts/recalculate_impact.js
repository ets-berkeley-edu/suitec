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

var argv = require('yargs')
    .usage('Usage: $0 --course [course]')
    .demand([ 'course' ])
    .describe('course', 'The SuiteC id of the course for which to recalculate impact scores; or \'all\' to recalculate all scores.')
    .argv;

var ActivitiesAPI = require('col-activities');
var CourseAPI = require('col-course');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/recalculate_impact');

var recalculate = function(callback) {
  // Apply global utilities
  require('col-core/lib/globals');

  // Connect to the database
  DB.init(function(dbErr) {
    if (dbErr) {
      log.error('Unable to set up a connection to the database');
      return callback(dbErr);
    }

    if (argv.course === 'all') {
      // Recalculate impact scores for all courses
      ActivitiesAPI.recalculateImpactScores(null, function(err) {
        if (err) {
          log.error('Could not recalculate impact scores for all courses');
          return callback(err);
        }

        return callback();
      });
    } else {
      // Get the course from the database
      CourseAPI.getCourse(argv.course, function(courseErr, course) {
        if (courseErr) {
          log.error({'courseId': argv.course}, 'Could not retrieve course for provided id');
          return callback(courseErr);
        }

        // Recalculate impact scores
        ActivitiesAPI.recalculateImpactScores(course, function(err) {
          if (err) {
            log.error({'courseId': argv.course}, 'Could not recalculate impact scores for course');
            return callback(err);
          }

          return callback();
        });
      });
    }
  });
};

recalculate(function(err) {
  if (err) {
    log.error({'err': err}, 'Recalculation failed.');
  } else {
    log.info('Recalculation complete.');
  }

  DB.getSequelize().close();
});
