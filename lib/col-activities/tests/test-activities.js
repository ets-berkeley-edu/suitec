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
var assert = require('assert');

var ActivitiesAPI = require('col-activities');
var AssetsTestUtil = require('col-assets/tests/util');
var CollabosphereConstants = require('col-core/lib/constants');
var DB = require('col-core/lib/db');
var TestsUtil = require('col-tests');
var UsersTestUtil = require('col-users/tests/util');
var WhiteboardsTestUtil = require('col-whiteboards/tests/util');

var ActivitiesTestUtil = require('./util');

describe('Activities', function() {

  describe('Get activity series for user', function() {
    /**
     * Test that verifies the format of a per-user activity series
     */
    it('returns activities grouped by type', function(callback) {
      // Create some activities
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {

        // Aggregate activity counts for the course should remain consistent across queries
        var expectedCourseCounts = {
          'actions.counts.course': {
            'add_asset': 6,
            'asset_comment': 4
          },
          'impacts.counts.course': {
            'get_asset_comment': 4,
            'get_asset_comment_reply': 1
          },
          'actions.totals.course': 10,
          'impacts.totals.course': 5
        };

        ActivitiesTestUtil.assertGetActivitiesForUserId(users.oliver.client, course, users.oliver.me.id, function(activities) {
          // Oliver has created an asset and nothing else
          ActivitiesTestUtil.assertUserActivities(activities, users.oliver, _.merge({
            'actions.creations': 1,
            'actions.counts.user': {
              'add_asset': 1
            },
            'actions.totals.user': 1,
            'impacts.counts.user': {},
            'impacts.totals.user': 0
          }, expectedCourseCounts));

          ActivitiesTestUtil.assertGetActivitiesForUserId(users.nico.client, course, users.nico.me.id, function(activities) {
            // Nico left one comment and his asset got two comments
            ActivitiesTestUtil.assertUserActivities(activities, users.nico, _.merge({
              'actions.creations': 1,
              'actions.interactions': 1,
              'impacts.interactions': 2,
              'actions.counts.user': {
                'add_asset': 1,
                'asset_comment': 1
              },
              'actions.totals.user': 2,
              'impacts.counts.user': {
                'get_asset_comment': 2
              },
              'impacts.totals.user': 2
            }, expectedCourseCounts));

            ActivitiesTestUtil.assertGetActivitiesForUserId(users.simon.client, course, users.simon.me.id, function(activities) {
              // Simon left two comments
              ActivitiesTestUtil.assertUserActivities(activities, users.simon, _.merge({
                'actions.creations': 1,
                'actions.interactions': 2,
                'actions.counts.user': {
                  'add_asset': 1,
                  'asset_comment': 2
                },
                'actions.totals.user': 3,
                'impacts.counts.user': {},
                'impacts.totals.user': 0
              }, expectedCourseCounts));

              ActivitiesTestUtil.assertGetActivitiesForUserId(users.paul.client, course, users.paul.me.id, function(activities) {
                // Paul's asset got two comments
                ActivitiesTestUtil.assertUserActivities(activities, users.paul, _.merge({
                  'actions.creations': 1,
                  'impacts.interactions': 2,
                  'actions.counts.user': {
                    'add_asset': 1
                  },
                  'actions.totals.user': 1,
                  'impacts.counts.user': {
                    'get_asset_comment': 2,
                  },
                  'impacts.totals.user': 2
                }, expectedCourseCounts));

                ActivitiesTestUtil.assertGetActivitiesForUserId(users.annesophie.client, course, users.annesophie.me.id, function(activities) {
                  // Anne-Sophie left one comment, which got a reply
                  ActivitiesTestUtil.assertUserActivities(activities, users.annesophie, _.merge({
                    'actions.creations': 1,
                    'actions.interactions': 1,
                    'impacts.interactions': 1,
                    'actions.counts.user': {
                      'add_asset': 1,
                      'asset_comment': 1
                    },
                    'actions.totals.user': 2,
                    'impacts.counts.user': {
                      'get_asset_comment_reply': 1
                    },
                    'impacts.totals.user': 1
                  }, expectedCourseCounts));

                  return callback();
                });
              });
            });
          });
        });
      });
    });

    it('keeps track of reciprocals', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        ActivitiesTestUtil.assertReciprocals(course, 'get_asset_comment_reply', 'asset_comment', function() {
          ActivitiesTestUtil.assertReciprocals(course, 'get_asset_comment', 'asset_comment', function() {

            return callback();
          });
        });
      });
    });

    it('excludes deleted assets', function(callback) {
      // Create some assets and activities.
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {

        // An instructor deletes an asset.
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, course, instructor, function(instructorClient, course, instructor) {
          AssetsTestUtil.assertDeleteAsset(instructorClient, course, users.nico.asset.id, function() {

            // Actions and impacts relating to the deleted asset should not show up in the activity feed or contribute to totals.
            ActivitiesTestUtil.assertGetActivitiesForUserId(instructorClient, course, users.nico.me.id, function(activities) {
              assert.strictEqual(activities.actions.creations.length, 0);
              assert.strictEqual(activities.actions.totals.user, 1);
              assert.ok(!activities.actions.counts.user.add_asset);
              assert.strictEqual(activities.actions.counts.course.add_asset, 5);
              assert.strictEqual(activities.actions.counts.course.asset_comment, 2);

              assert.strictEqual(activities.impacts.interactions.length, 0);
              assert.strictEqual(activities.impacts.totals.user, 0);
              assert.ok(!activities.impacts.counts.user.get_asset_comment);
              assert.ok(!activities.impacts.counts.user.get_asset_comment_reply);
              assert.ok(!activities.impacts.counts.course.get_asset_comment_reply);
              assert.strictEqual(activities.impacts.counts.course.get_asset_comment, 2);

              return callback();
            });
          });
        });
      });
    });

    it('ignores activities generated by non-enrolled admins', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        // An administrator views Oliver's asset
        var adminUser = TestsUtil.generateCanvasAdmin();
        TestsUtil.getAssetLibraryClient(null, course, adminUser, function(adminClient, course, adminUser) {
          AssetsTestUtil.assertGetAsset(adminClient, course, users.oliver.asset.id, null, null, function(asset) {
            // But the view does not show up in Oliver's activity series or coursewide totals
            ActivitiesTestUtil.assertGetActivitiesForUserId(users.oliver.client, course, users.oliver.me.id, function(activities) {
              assert.ok(!activities.impacts.counts.user.get_view_asset);
              assert.ok(!activities.impacts.counts.course.get_view_asset);

              return callback();
            });
          });
        });
      });
    });

    it('includes activities with no assets', function(callback) {
      // Create some assets and asset-related activities.
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        // Create an additional Canvas discussion activity.
        DB.User.findOne({'where': {'canvas_user_id': users.annesophie.user.id}}).complete(function(err, dbUser) {
          ActivitiesAPI.createActivity(dbCourse, dbUser, 'discussion_topic', 999, CollabosphereConstants.ACTIVITY.OBJECT_TYPES.CANVAS_DISCUSSION, {}, null, function(err, activity) {
            assert.ifError(err);

            ActivitiesTestUtil.assertGetActivitiesForUserId(users.annesophie.client, course, users.annesophie.me.id, function(activities) {
              // The discussion topic shows up in the activities feed despite having no asset.
              assert.strictEqual(activities.actions.interactions.length, 2);
              assert.strictEqual(activities.actions.interactions[1].type, 'discussion_topic');
              assert.ok(!activities.actions.interactions[1].asset);

              // The discussion topics also shows up in course and user totals.
              assert.strictEqual(activities.actions.counts.user.discussion_topic, 1);
              assert.strictEqual(activities.actions.counts.course.discussion_topic, 1);
              assert.deepEqual(activities.actions.totals, {'user': 3, 'course': 11});

              return callback();
            });
          });
        });
      });
    });

    /**
     * Test that verifies authorization when retrieving a per-user activity series
     */
    it('verifies authorization', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        // Oliver can view Ray's activity
        ActivitiesTestUtil.assertGetActivitiesForUserId(users.oliver.client, course, users.ray.me.id, function(activities) {
          // A course instructor can view Ray's activity
          var instructor = TestsUtil.generateInstructor();
          TestsUtil.getAssetLibraryClient(null, course, instructor, function(instructorClient, course, instructor) {
            ActivitiesTestUtil.assertGetActivitiesForUserId(instructorClient, course, users.ray.me.id, function(activities) {

              // An instructor in a different course can't view Ray's activity
              var otherInstructor = TestsUtil.generateInstructor();
              TestsUtil.getAssetLibraryClient(null, null, otherInstructor, function(otherInstructorClient, otherCourse, otherInstructor) {
                ActivitiesTestUtil.assertGetActivitiesForUserIdFails(otherInstructorClient, otherCourse, users.ray.me.id, 404, function() {

                  return callback();
                });
              });
            });
          });
        });
      });
    });

    /**
     * Test that verifies validation when retrieving a per-user activity series
     */
    it('is validated', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, course, instructor, function(instructorClient, course, instructor) {
          // Return 400 on non-numeric user ID
          ActivitiesTestUtil.assertGetActivitiesForUserIdFails(instructorClient, course, 'Colonel Not-A-Number', 400, function() {
            // Return 404 on a nonexistent user ID
            ActivitiesTestUtil.assertGetActivitiesForUserIdFails(instructorClient, course, 99999, 404, function() {

              return callback();
            });
          });
        });
      });
    });
  });

  describe('Get activity series for asset', function() {
    /**
     * Test that verifies the format of a per-asset activity series
     */
    it('returns activities', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        ActivitiesTestUtil.assertGetActivitiesForAssetId(users.oliver.client, course, users.oliver.asset.id, function(activities) {
          // Nothing has happened to Oliver's asset since creation
          ActivitiesTestUtil.assertAssetActivities(activities, {});

          ActivitiesTestUtil.assertGetActivitiesForAssetId(users.oliver.client, course, users.nico.asset.id, function(activities) {
            // Nico's asset has two comments
            ActivitiesTestUtil.assertAssetActivities(activities, {'asset_comment': 2});

            return callback();
          });
        });
      });
    });

    it('ignores activities generated by non-enrolled admins', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        // An administrator views Oliver's asset
        var adminUser = TestsUtil.generateCanvasAdmin();
        TestsUtil.getAssetLibraryClient(null, course, adminUser, function(adminClient, course, adminUser) {
          AssetsTestUtil.assertGetAsset(adminClient, course, users.oliver.asset.id, null, null, function(asset) {
            // But the activity series returns nothing
            ActivitiesTestUtil.assertGetActivitiesForAssetId(users.oliver.client, course, users.oliver.asset.id, function(activities) {
              ActivitiesTestUtil.assertAssetActivities(activities, {});

              return callback();
            });
          });
        });
      });
    });

    /**
     * Test that verifies validation when retrieving a per-asset activity series
     */
    it('is validated', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        // Return 400 on non-numeric asset ID
        ActivitiesTestUtil.assertGetActivitiesForAssetIdFails(users.oliver.client, course, 'eggshell_white', 400, function() {
          // Return 404 on a nonexistent asset ID
          ActivitiesTestUtil.assertGetActivitiesForAssetIdFails(users.oliver.client, course, 99999, 404, function() {

            return callback();
          });
        });
      });
    });

    /**
     * Test that verifies authorization when retrieving a per-asset activity series
     */
    it('verifies authorization', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        // A user in a different course can't see asset activity
        TestsUtil.getAssetLibraryClient(null, null, null, function(otherClient, otherCourse, otherUser) {
          ActivitiesTestUtil.assertGetActivitiesForAssetIdFails(otherClient, otherCourse, users.oliver.asset.id, 404, function() {

            return callback();
          });
        });
      });
    });
  });

  describe('Get interaction data for course', function() {
    /**
     * Test that verifies the format of per-course interaction data
     */
    it('returns activities', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        ActivitiesTestUtil.assertGetInteractions(users.oliver.client, course, function(interactions) {
          assert.strictEqual(interactions.length, 5);
          assert.strictEqual(_.find(interactions, {'type': 'get_asset_comment', 'source': users.annesophie.me.id, 'target': users.nico.me.id}).count, 1);
          assert.strictEqual(_.find(interactions, {'type': 'get_asset_comment', 'source': users.simon.me.id, 'target': users.nico.me.id}).count, 1);
          assert.strictEqual(_.find(interactions, {'type': 'get_asset_comment', 'source': users.nico.me.id, 'target': users.paul.me.id}).count, 1);
          assert.strictEqual(_.find(interactions, {'type': 'get_asset_comment', 'source': users.simon.me.id, 'target': users.paul.me.id}).count, 1);
          assert.strictEqual(_.find(interactions, {'type': 'get_asset_comment_reply', 'source': users.simon.me.id, 'target': users.annesophie.me.id}).count, 1);

          return callback();
        });
      });
    });

    /**
     * Test that verifies that interactions involving instructors are ignored
     */
    it('is limited to interactions between students', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        // An instructor views Nico's asset.
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, course, instructor, function(instructorClient, course, instructor) {
          UsersTestUtil.assertGetMe(instructorClient, course, null, function(instructorMe) {
            AssetsTestUtil.assertGetAsset(instructorClient, course, users.nico.asset.id, null, null, function(asset) {
              // But no activity is included in the count.
              ActivitiesTestUtil.assertGetInteractions(users.oliver.client, course, function(interactions) {
                assert.ok(!_.find(interactions, {'type': 'get_view_asset', 'source': instructorMe.id, 'target': users.nico.me.id}))

                return callback();
              });
            });
          });
        });
      });
    });

    it('appends whiteboard co-creations if present', function(callback) {
      ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {
        WhiteboardsTestUtil.assertCreateWhiteboard(users.oliver.client, course, 'UC Davis Whiteboard', users.ray.me.id, function(whiteboard) {
          WhiteboardsTestUtil.addElementsToWhiteboard(users.oliver.client, course, whiteboard, function() {
            WhiteboardsTestUtil.assertExportWhiteboardToAsset(users.oliver.client, course, whiteboard.id, null, null, function(data) {
              ActivitiesTestUtil.assertGetInteractions(users.oliver.client, course, function(interactions) {
                assert.strictEqual(interactions.length, 6);
                assert.strictEqual(_.find(interactions, {'type': 'co_create_whiteboard', 'source': users.oliver.me.id, 'target': users.ray.me.id}).count, 1);

                return callback();
              });
            });
          });
        });
      });
    });
  });
});
