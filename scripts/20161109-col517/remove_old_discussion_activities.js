#!/usr/bin/env node

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

var ActivitiesAPI = require('col-activities');
var CollabosphereConstants = require('col-core/lib/constants');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/20161011-col509/remove_old_discussion_activities');

var init = function() {
  // Apply global utilities.
  require('col-core/lib/globals');

  // Connect to the database.
  DB.init(function(err) {
    if (err) {
      return log.error({'err': err}, 'Unable to set up a connection to the database');
    }
    log.info('Connected to the database');

    removeOldActivities();
  });
};

var removeOldActivities = function() {
  // Get all discussion activities.
  var options = {
    'where': {
      'type': ['discussion_entry', 'get_discussion_entry_reply'],
      'object_type': CollabosphereConstants.ACTIVITY.OBJECT_TYPES.CANVAS_DISCUSSION
    }
  };

  DB.Activity.findAll(options).complete(function(err, activities) {
    if (err) {
      log.error({'err': err}, 'Failed to retrieve activities');
      return;
    }

    var removed = 0;
    var notRemoved = 0;
    var errored = 0;

    async.eachSeries(activities, function(activity, done) {
      // Old discussion activities are those without an entryId. Activities with an entryId should be skipped.
      if (activity.metadata.entryId) {
        notRemoved++;
        return done();
      }

      activity.getUser().complete(function(err, user) {
        if (err) {
          log.error({'err': err}, 'Failed to get user for activity ' + activity.id + ', skipping.');
          errored++;
          return done();
        }

        // Retrieve the number of points that should be deducted from the user's total.
        ActivitiesAPI.getActivityTypeConfiguration(activity.course_id, function(err, configuration) {
          if (err) {
            log.error({'err': err}, 'Failed to get configuration for activity ' + activity.id + ', skipping.');
            errored++;
            return done();
          }

          // Deduct the points.
          var points = _.find(configuration, {'type': activity.type}).points;
          user.decrement('points', {'by': points}).complete(function(err) {
            if (err) {
              log.error({'err': err}, 'Failed to decrement user points for activity ' + activity.id + ', skipping.');
              errored++;
              return done();
            }

            // Delete the activity.
            var id = activity.id;
            activity.destroy().complete(function(err) {
              if (err) {
                log.error({'err': err, 'activity': activity}, 'Failed to delete activity ' + activity.id);
                errored++;
              } else {
                log.info('Delete activity ' + id);
                removed++;
              }
              return done();
            });
          });
        });
      });
    }, function(err, results) {
      if (err) {
        log.error({'err': err}, 'Failed to remove activities');
      } else {
        log.info('Finished. Removed ' + removed + ' activities; kept ' + notRemoved + ' activities; ' + errored + ' errors.');
      }
    });
  });
};

init();
