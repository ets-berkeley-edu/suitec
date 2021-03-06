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

var TestsUtil = require('col-tests');
var UsersTestUtil = require('col-users/tests/util');

describe('Users', function() {

  describe('Points', function() {

    describe('Update share status', function() {

      /**
       * Test that verifies that the share points status can be updated
       */
      it('can be updated', function(callback) {
        TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {

          // Verify that the share points status can be enabled
          UsersTestUtil.assertUpdateSharePoints(client1, course, true, function(me) {
            UsersTestUtil.assertGetMe(client1, course, me, function(me) {

              // Verify that the share points status can be disabled
              TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
                UsersTestUtil.assertUpdateSharePoints(client2, course, false, function(me) {
                  UsersTestUtil.assertGetMe(client2, course, me, function(me) {

                    // Verify that the share points status can be enabled after disabling
                    UsersTestUtil.assertUpdateSharePoints(client2, course, true, function(me) {
                      UsersTestUtil.assertGetMe(client2, course, me, function(me) {

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

      /**
       * Test that verifies validation when updating the share points status
       */
      it('is validated', function(callback) {
        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {

          // Invalid share points status
          UsersTestUtil.assertUpdateSharePointsFails(client, course, 'Not a boolean', 400, function() {
            UsersTestUtil.assertUpdateSharePointsFails(client, course, null, 400, function() {
              UsersTestUtil.assertUpdateSharePointsFails(client, course, undefined, 400, function() {

                // Verify that the share points status can not be set back to null
                UsersTestUtil.assertUpdateSharePoints(client, course, true, function(me) {
                  UsersTestUtil.assertUpdateSharePointsFails(client, course, null, 400, function() {

                    // Verify that the share points status has not been changed
                    UsersTestUtil.assertGetMe(client, course, me, function(me) {
                      assert.strictEqual(me.share_points, true);

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

    describe('Leaderboard', function() {

      /**
       * Test that verifies that the users for the current course and their points can be listed
       */
      it('can be retrieved', function(callback) {
        TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
          TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
            TestsUtil.getAssetLibraryClient(null, course, null, function(client3, course, user3) {

              // Set the first user to share their points with the course
              UsersTestUtil.assertUpdateSharePoints(client1, course, true, function(me1) {

                // Verify that only the first user is listed when retrieving the users in the course
                UsersTestUtil.assertGetLeaderboard(client1, course, 1, false, function(users) {
                  UsersTestUtil.assertUser(users[0], {'expectedUser': me1, 'expectEmail': false});

                  // Set the second user to not share their points with the course
                  UsersTestUtil.assertUpdateSharePoints(client2, course, false, function(me2) {

                    // Verify that the first user is still the only user listed when retrieving the users in the course
                    UsersTestUtil.assertGetLeaderboard(client1, course, 1, false, function(users) {
                      UsersTestUtil.assertUser(users[0], {'expectedUser': me1, 'expectEmail': false});

                      // Set the second user to share their points with the course
                      UsersTestUtil.assertUpdateSharePoints(client2, course, true, function(me2) {

                        // Verify that the first and second user are listed when retrieving the users in the course
                        UsersTestUtil.assertGetLeaderboard(client2, course, 2, false, function(users) {
                          UsersTestUtil.assertUser(users[0], {'expectedUser': me1, 'expectEmail': false});
                          UsersTestUtil.assertUser(users[1], {'expectedUser': me2, 'expectEmail': false});

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

      /**
       * Test that verifies that the users for the current course and their points can be listed as an instructor
       */
      it('can be retrieved as an instructor', function(callback) {
        var instructorUser = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructorUser, function(instructorClient, course, instructorUser) {
          TestsUtil.getAssetLibraryClient(null, course, null, function(client1, course, user1) {
            TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
              TestsUtil.getAssetLibraryClient(null, course, null, function(client3, course, user3) {

                // Verify that all users are returned
                UsersTestUtil.assertGetLeaderboard(instructorClient, course, 4, true, function(users) {
                  assert.strictEqual(users[0].share_points, null);
                  assert.strictEqual(users[1].share_points, null);
                  assert.strictEqual(users[2].share_points, null);
                  assert.strictEqual(users[3].share_points, null);

                  // Set the first user to share their points with the course
                  UsersTestUtil.assertUpdateSharePoints(client1, course, true, function(me1) {

                    // Verify that all users are returned
                    UsersTestUtil.assertGetLeaderboard(instructorClient, course, 4, true, function(users) {
                      assert.strictEqual(users[0].share_points, null);
                      assert.strictEqual(users[1].share_points, true);
                      assert.strictEqual(users[2].share_points, null);
                      assert.strictEqual(users[3].share_points, null);

                      // Set the second user to not share their points with the course
                      UsersTestUtil.assertUpdateSharePoints(client2, course, false, function(me2) {

                        // Verify that all users are returned
                        UsersTestUtil.assertGetLeaderboard(instructorClient, course, 4, true, function(users) {
                          assert.strictEqual(users[0].share_points, null);
                          assert.strictEqual(users[1].share_points, true);
                          assert.strictEqual(users[2].share_points, false);
                          assert.strictEqual(users[3].share_points, null);

                          // Set the second user to share their points with the course
                          UsersTestUtil.assertUpdateSharePoints(client2, course, true, function(me2) {

                            // Verify that all users are returned
                            UsersTestUtil.assertGetLeaderboard(instructorClient, course, 4, true, function(users) {
                              assert.strictEqual(users[0].share_points, null);
                              assert.strictEqual(users[1].share_points, true);
                              assert.strictEqual(users[2].share_points, true);
                              assert.strictEqual(users[3].share_points, null);

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
       * Test that verifies authorization when listing the users for the current course and their points
       */
      it('verifies authorization', function(callback) {
        TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
          TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
            TestsUtil.getAssetLibraryClient(null, course, null, function(client3, course, user3) {

              // Set the first user to share their points with the course
              UsersTestUtil.assertUpdateSharePoints(client1, course, true, function(me1) {

                // Verify that the second user is not able to retrieve the users in the course
                // when its share point status is not set
                UsersTestUtil.assertGetLeaderboardFails(client2, course, 401, function() {

                  // Set the second user to not share their points with the course
                  UsersTestUtil.assertUpdateSharePoints(client2, course, false, function(me2) {

                    // Verify that the second user is not able to retrieve the users in the course
                    // when not sharing their own points
                    UsersTestUtil.assertGetLeaderboardFails(client2, course, 401, function() {

                      // Set the second user to share their points with the course
                      UsersTestUtil.assertUpdateSharePoints(client2, course, true, function(me2) {

                        // Verify that the second user is now able to retrieve the users in the course
                        UsersTestUtil.assertGetLeaderboard(client2, course, 2, false, function(users) {
                          UsersTestUtil.assertUser(users[0], {'expectedUser': me1, 'expectEmail': false});
                          UsersTestUtil.assertUser(users[1], {'expectedUser': me2, 'expectEmail': false});

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
