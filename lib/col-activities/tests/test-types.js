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

var AssetsTestUtil = require('col-assets/tests/util');
var TestsUtil = require('col-tests');
var UsersTestUtil = require('col-users/tests/util');

var ActivitiesDefaults = require('col-activities/lib/default');
var ActivitiesTestsUtil = require('./util');

describe('Activity Types', function() {

  describe('Edit activity type configuration', function() {

    /**
     * Test that verifies that the configuration for a single activity type in a course can be edited
     */
    it('can be edited for a single activity type', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {

        // Verify that the points for a single activity type can be overridden
        var activityTypeOverride = [{
          'type': 'like',
          'points': 10
        }];
        ActivitiesTestsUtil.assertEditActivityTypeConfiguration(client, course, activityTypeOverride, function() {

          // Verify that a single activity type can be disabled
          activityTypeOverride = [{
            'type': 'asset_comment',
            'enabled': false
          }];
          ActivitiesTestsUtil.assertEditActivityTypeConfiguration(client, course, activityTypeOverride, function() {

            // Verify that setting the points for a single activity type and disabling can be done at the same time
            activityTypeOverride = [{
              'type': 'add_asset',
              'points': 100,
              'enabled': false
            }];
            ActivitiesTestsUtil.assertEditActivityTypeConfiguration(client, course, activityTypeOverride, function() {

              // Verify that these changes are reflected in the activity type configuration
              ActivitiesTestsUtil.assertGetActivityTypeConfiguration(client, course, function(configuration) {
                var likeActivityType = _.find(configuration, {'type': 'like'});
                assert.strictEqual(likeActivityType.points, 10);
                assert.strictEqual(likeActivityType.enabled, true);

                var commentActivityType = _.find(configuration, {'type': 'asset_comment'});
                assert.strictEqual(commentActivityType.points, _.find(ActivitiesDefaults, {'type': 'asset_comment'}).points);
                assert.strictEqual(commentActivityType.enabled, false);

                var addAssetActivityType = _.find(configuration, {'type': 'add_asset'});
                assert.strictEqual(addAssetActivityType.points, 100);
                assert.strictEqual(addAssetActivityType.enabled, false);

                // Verify that an activity type override can be overridden
                activityTypeOverride = [{
                  'type': 'add_asset',
                  'points': 1000,
                  'enabled': true
                }];
                ActivitiesTestsUtil.assertEditActivityTypeConfiguration(client, course, activityTypeOverride, function() {
                  ActivitiesTestsUtil.assertGetActivityTypeConfiguration(client, course, function(configuration) {
                    var addAssetActivityType = _.find(configuration, {'type': 'add_asset'});
                    assert.strictEqual(addAssetActivityType.points, 1000);
                    assert.strictEqual(addAssetActivityType.enabled, true);

                    return callback();
                  });
                });
              });
            });
          });
        });
      });
    });

    /**
     * Test that verifies that the configuration for multiple activity types in a course can be edited
     */
    it('can be edited for multiple activity types', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {

        // Verify that the points for multiple activity types can be overridden
        var activityTypeOverride = [
          {'type': 'like', 'points': 10},
          {'type': 'dislike', 'points': 20}
        ];
        ActivitiesTestsUtil.assertEditActivityTypeConfiguration(client, course, activityTypeOverride, function() {

          // Verify that multiple activity types can be disabled
          activityTypeOverride = [
            {'type': 'asset_comment', 'enabled': false},
            {'type': 'get_asset_comment', 'enabled': false}
          ];
          ActivitiesTestsUtil.assertEditActivityTypeConfiguration(client, course, activityTypeOverride, function() {

            // Verify that setting the points for multiple activity types and disabling them can be done at the same time
            activityTypeOverride = [
              {'type': 'discussion_topic', 'points': 40, 'enabled': false},
              {'type': 'discussion_entry', 'points': 50, 'enabled': false}
            ];
            ActivitiesTestsUtil.assertEditActivityTypeConfiguration(client, course, activityTypeOverride, function() {

              // Verify that these changes are reflected in the activity type configuration
              ActivitiesTestsUtil.assertGetActivityTypeConfiguration(client, course, function(configuration) {
                var likeActivityType = _.find(configuration, {'type': 'like'});
                assert.strictEqual(likeActivityType.points, 10);
                assert.strictEqual(likeActivityType.enabled, true);

                var likeActivityType = _.find(configuration, {'type': 'dislike'});
                assert.strictEqual(likeActivityType.points, 20);
                assert.strictEqual(likeActivityType.enabled, true);

                var commentActivityType = _.find(configuration, {'type': 'asset_comment'});
                assert.strictEqual(commentActivityType.points, _.find(ActivitiesDefaults, {'type': 'asset_comment'}).points);
                assert.strictEqual(commentActivityType.enabled, false);

                var commentActivityType = _.find(configuration, {'type': 'get_asset_comment'});
                assert.strictEqual(commentActivityType.points, _.find(ActivitiesDefaults, {'type': 'get_asset_comment'}).points);
                assert.strictEqual(commentActivityType.enabled, false);

                var addAssetActivityType = _.find(configuration, {'type': 'discussion_topic'});
                assert.strictEqual(addAssetActivityType.points, 40);
                assert.strictEqual(addAssetActivityType.enabled, false);

                var addAssetActivityType = _.find(configuration, {'type': 'discussion_entry'});
                assert.strictEqual(addAssetActivityType.points, 50);
                assert.strictEqual(addAssetActivityType.enabled, false);

                // Verify that an activity type override can be overridden
                activityTypeOverride = [{
                  'type': 'discussion_entry',
                  'points': 1000,
                  'enabled': true
                }];
                ActivitiesTestsUtil.assertEditActivityTypeConfiguration(client, course, activityTypeOverride, function() {
                  ActivitiesTestsUtil.assertGetActivityTypeConfiguration(client, course, function(configuration) {
                    var addAssetActivityType = _.find(configuration, {'type': 'discussion_entry'});
                    assert.strictEqual(addAssetActivityType.points, 1000);
                    assert.strictEqual(addAssetActivityType.enabled, true);

                    return callback();
                  });
                });
              });
            });
          });
        });
      });
    });

    /**
     * Test that verifies that impact scores do not change on configuration edits
     */
    it('retains default impact scores on edit', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {

        // Override multiple activity types
        var activityTypeOverride = [
          {'type': 'asset_comment', 'points': 40, 'enabled': false},
          {'type': 'remix_whiteboard', 'points': 50, 'enabled': false}
        ];
        ActivitiesTestsUtil.assertEditActivityTypeConfiguration(client, course, activityTypeOverride, function() {
          ActivitiesTestsUtil.assertGetActivityTypeConfiguration(client, course, function(configuration) {

            // Verify that 'points' and 'enabled' have changed, but 'impact' has not
            var assetCommentActivityType = _.find(configuration, {'type': 'asset_comment'});
            assert.strictEqual(assetCommentActivityType.points, 40);
            assert.strictEqual(assetCommentActivityType.enabled, false);
            assert.strictEqual(assetCommentActivityType.impact, 6);

            var remixWhiteboardActivityType = _.find(configuration, {'type': 'remix_whiteboard'});
            assert.strictEqual(remixWhiteboardActivityType.points, 50);
            assert.strictEqual(remixWhiteboardActivityType.enabled, false);
            assert.strictEqual(remixWhiteboardActivityType.impact, 10);

            return callback();
          });
        });
      });
    });

    /**
     * Test that verifies validation when editing the configuration for an activity type in a course
     */
    it('is validated', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {

        // Missing activity type overrides
        var activityTypeOverride = [];
        ActivitiesTestsUtil.assertEditActivityTypeConfigurationFails(client, course, activityTypeOverride, 400, function() {

          // Missing points and enabled
          activityTypeOverride = [{'type': 'like'}];
          ActivitiesTestsUtil.assertEditActivityTypeConfigurationFails(client, course, activityTypeOverride, 400, function() {
            activityTypeOverride = [
              {'type': 'comment', 'points': 10},
              {'type': 'like'}
            ];
            ActivitiesTestsUtil.assertEditActivityTypeConfigurationFails(client, course, activityTypeOverride, 400, function() {

              // Invalid type
              activityTypeOverride = [{'type': 'foo', 'points': 10}];
              ActivitiesTestsUtil.assertEditActivityTypeConfigurationFails(client, course, activityTypeOverride, 400, function() {
                activityTypeOverride = [
                  {'type': 'comment', 'points': 10},
                  {'type': 'foo', 'points': 10}
                ];
                ActivitiesTestsUtil.assertEditActivityTypeConfigurationFails(client, course, activityTypeOverride, 400, function() {

                  // Invalid points
                  activityTypeOverride = [{'type': 'comment', 'points': 'not a number'}];
                  ActivitiesTestsUtil.assertEditActivityTypeConfigurationFails(client, course, activityTypeOverride, 400, function() {
                    activityTypeOverride = [
                      {'type': 'comment', 'points': 10},
                      {'type': 'like', 'points': 'not a number'}
                    ];
                    ActivitiesTestsUtil.assertEditActivityTypeConfigurationFails(client, course, activityTypeOverride, 400, function() {

                      // Invalid enabled
                      activityTypeOverride = [{'type': 'comment', 'enabled': 'not a boolean'}];
                      ActivitiesTestsUtil.assertEditActivityTypeConfigurationFails(client, course, activityTypeOverride, 400, function() {
                        activityTypeOverride = [
                          {'type': 'comment', 'enabled': true},
                          {'type': 'like', 'enabled': 'not a boolean'}
                        ];
                        ActivitiesTestsUtil.assertEditActivityTypeConfigurationFails(client, course, activityTypeOverride, 400, function() {

                          // Verify that the activity type configuration has not changed
                          ActivitiesTestsUtil.assertGetActivityTypeConfiguration(client, course, function(configuration) {
                            _.each(ActivitiesDefaults, function(activityType) {
                              ActivitiesTestsUtil.assertActivityType(_.find(configuration, {'type': activityType.type}), {'expectedActivityType': activityType});
                            });

                            return callback();
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    /**
     * Test that verifies authorization when editing the configuration for an activity type in a course
     */
    it('verifies authorization', function(callback) {
      // Verify that the configuration for an activity type can not be edited by a non-administrator
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        var activityTypeOverride = [{'type': 'asset_comment', 'enabled': true}];
        ActivitiesTestsUtil.assertEditActivityTypeConfigurationFails(client, course, activityTypeOverride, 401, function() {

          return callback();
        });
      });
    });

    /**
     * Set up a set of course clients
     *
     * @param  {Function}     callback                            Standard callback function
     * @param  {Course}       callback.course                     The course that the clients are part of
     * @param  {Object}       callback.users                      The users in the course
     * @param  {Object}       callback.users.user1                The first user's information
     * @param  {RestClient}   callback.users.user1.client         The first user's rest client
     * @param  {Object}       callback.users.user1.me             The first user's me data
     * @param  {Object}       callback.users.user2                The second user's information
     * @param  {RestClient}   callback.users.user2.client         The second user's rest client
     * @param  {Object}       callback.users.user2.me             The second user's me data
     * @param  {Object}       callback.users.user3                The third user's information
     * @param  {RestClient}   callback.users.user3.client         The third user's rest client
     * @param  {Object}       callback.users.user3.me             The third user's me data
     * @param  {Object}       callback.users.instructor           The course instructor's information
     * @param  {RestClient}   callback.users.instructor.client    The course instructor's rest client
     * @param  {Object}       callback.users.instructor.me        The course instructor's me data
     */
    var setupClients = function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
        TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
          TestsUtil.getAssetLibraryClient(null, course, null, function(client3, course, user3) {
            var instructorUser = TestsUtil.generateInstructor();
            TestsUtil.getAssetLibraryClient(null, course, instructorUser, function(instructorClient, course, instructorUser) {

              // Get the me data for the users
              UsersTestUtil.assertGetMe(client1, course, null, function(me1) {
                UsersTestUtil.assertGetMe(client2, course, null, function(me2) {
                  UsersTestUtil.assertGetMe(client3, course, null, function(me3) {
                    UsersTestUtil.assertGetMe(instructorClient, course, null, function(instructorMe) {
                      var users = {
                        'user1': {'client': client1, 'me': me1},
                        'user2': {'client': client2, 'me': me2},
                        'user3': {'client': client3, 'me': me3},
                        'instructor': {'client': instructorClient, 'me': instructorMe}
                      };
                      return callback(course, users);
                    });
                  });
                });
              });
            });
          });
        });
      });
    };

    /**
     * Assert that the user has the correct points given a set of activities
     *
     * @param  {RestClient}         client                            The REST client to make the request with
     * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
     * @param  {Number}             userId                            The id of the user to get the points for
     * @param  {Object}             activities                        The activities associated to the user. The key should be one of the types out of `ActivitiesDefaults` and the value should be the number of times the user is associated to that activity
     * @param  {Function}           callback                          Standard callback function
     * @param  {Number}             callback.points                   The points for the user
     */
    var assertTotalPoints = function(client, course, userId, activities, callback) {
      ActivitiesTestsUtil.assertGetActivityTypeConfiguration(client, course, function(activityTypeConfiguration) {

        var expectedTotal = 0;
        _.each(activities, function(times, action) {
          var activityConfig = _.find(activityTypeConfiguration, {'type': action});
          if (activityConfig.enabled) {
            expectedTotal += times * activityConfig.points;
          }
        });

        UsersTestUtil.assertGetLeaderboard(client, course, null, true, function(leaderboard) {
          var user = _.find(leaderboard, {'id': userId});
          assert.ok(user);
          assert.strictEqual(user.points, expectedTotal);

          return callback(user.points);
        });
      });
    };

    /**
     * Get the points for each user in a course
     *
     * @param  {Course}       course                  The course to get the user's points for
     * @param  {Object}       courseUsers             The users for which to get the points
     * @param  {Function}     callback                Standard callback function
     * @param  {Object}       callback.points         The points for each user
     */
    var getPoints = function(course, courseUsers, callback) {
      assertTotalPoints(courseUsers.instructor.client, course, courseUsers.user1.me.id, {'add_asset': 1, 'get_like': 1, 'get_dislike': 1}, function(points1) {
        assertTotalPoints(courseUsers.instructor.client, course, courseUsers.user2.me.id, {'like': 1}, function(points2) {
          assertTotalPoints(courseUsers.instructor.client, course, courseUsers.user3.me.id, {'dislike': 1}, function(points3) {
            return callback({
              'user1': points1,
              'user2': points2,
              'user3': points3
            });
          });
        });
      });
    };

    /**
     * Test that verifies that editing the points configuration recalculates the points for each user
     * in the course
     */
    it('recalculates points for the entire course', function(callback) {
      setupClients(function(courseA, usersA) {
        setupClients(function(courseB, usersB) {

          // The first user in each course creates a a link which gets liked by the second user and
          // disliked by the third user
          AssetsTestUtil.assertCreateLink(usersA.user1.client, courseA, 'Google', 'http://www.google.come', null, function(assetA) {
            AssetsTestUtil.assertCreateLink(usersB.user1.client, courseB, 'Google', 'http://www.google.come', null, function(assetB) {
              AssetsTestUtil.assertLike(usersA.user2.client, courseA, assetA.id, true, function() {
                AssetsTestUtil.assertLike(usersB.user2.client, courseB, assetB.id, true, function() {
                  AssetsTestUtil.assertLike(usersA.user3.client, courseA, assetA.id, false, function() {
                    AssetsTestUtil.assertLike(usersB.user3.client, courseB, assetB.id, false, function() {

                      // Get the points for each user in both courses so we can assert they're correctly updated
                      getPoints(courseA, usersA, function(courseApoints) {
                        getPoints(courseB, usersB, function(courseBpoints) {

                          // Adjust the points for course A
                          var activityTypeOverride = [
                            {'type': 'add_asset', 'points': 300},
                            {'type': 'like', 'points': 200},
                            {'type': 'dislike', 'points': 100, 'enabled': false}
                          ];
                          ActivitiesTestsUtil.assertEditActivityTypeConfiguration(usersA.instructor.client, courseA, activityTypeOverride, function() {

                            // Get the points and assert they're correctly recalculated
                            getPoints(courseA, usersA, function(newCourseApoints) {
                              getPoints(courseB, usersB, function(newCourseBpoints) {

                                // Assert the points for each user of course A have been updated
                                assert.notStrictEqual(courseApoints.user1, newCourseApoints.user1);
                                assert.notStrictEqual(courseApoints.user2, newCourseApoints.user2);
                                assert.notStrictEqual(courseApoints.user3, newCourseApoints.user3);

                                // Assert the points for each user of course B are still the same
                                assert.deepEqual(courseBpoints.user1, newCourseBpoints.user1);
                                assert.deepEqual(courseBpoints.user2, newCourseBpoints.user2);
                                assert.deepEqual(courseBpoints.user3, newCourseBpoints.user3);
                                return callback();
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('Get activity type configuration', function() {

    /**
     * Test that verifies that the activity type configration for a course can be retrieved
     */
    it('can be retrieved', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course1, user1) {

        // Verify that the default configuration is returned by default
        ActivitiesTestsUtil.assertGetActivityTypeConfiguration(client1, course1, function(configuration) {
          _.each(ActivitiesDefaults, function(activityType) {
            ActivitiesTestsUtil.assertActivityType(_.find(configuration, {'type': activityType.type}), {'expectedActivityType': activityType});
          });

          return callback();
        });
      });
    });
  });
});
