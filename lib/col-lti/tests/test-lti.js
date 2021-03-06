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

var DB = require('col-core/lib/db');
var TestsUtil = require('col-tests');
var UsersTestsUtil = require('col-users/tests/util');

var LtiTestsUtil = require('./util');

describe('LTI', function() {

  describe('Asset Library', function() {

    describe('Cartridge', function() {

      /**
       * Test that verifies that the Asset Library LTI cartridge can be retrieved and contains the correct information
       */
      it('can be retrieved', function(callback) {
        var client = TestsUtil.getAnonymousClient();
        LtiTestsUtil.assertAssetLibraryCartridgeSucceeds(client, function(cartridge) {
          return callback();
        });
      });
    });

    describe('Launch', function() {

      /**
       * Test that verifies that the Asset Library Tool can be launched
       */
      it('can be launched', function(callback) {
        var client = TestsUtil.getAnonymousClient();
        var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
        var user = TestsUtil.generateUser(global.tests.canvas.ucberkeley);
        LtiTestsUtil.assertAssetLibraryLaunchSucceeds(client, course, user, function() {
          return callback();
        });
      });
    });
  });

  describe('Engagement Index', function() {

    describe('Cartridge', function() {

      /**
       * Test that verifies that the Engagement Index LTI cartridge can be retrieved and contains the correct information
       */
      it('can be retrieved', function(callback) {
        var client = TestsUtil.getAnonymousClient();
        LtiTestsUtil.assertEngagementIndexCartridgeSucceeds(client, function(cartridge) {
          return callback();
        });
      });
    });

    describe('Launch', function() {

      /**
       * Test that verifies that the Engagement Index Tool can be launched
       */
      it('can be launched', function(callback) {
        var client = TestsUtil.getAnonymousClient();
        var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
        var user = TestsUtil.generateUser(global.tests.canvas.ucberkeley);
        LtiTestsUtil.assertEngagementIndexLaunchSucceeds(client, course, user, function() {
          return callback();
        });
      });
    });
  });

  describe('Whiteboards', function() {

    describe('Cartridge', function() {

      /**
       * Test that verifies that the Whiteboards LTI cartridge can be retrieved and contains the correct information
       */
      it('can be retrieved', function(callback) {
        var client = TestsUtil.getAnonymousClient();
        LtiTestsUtil.assertWhiteboardsCartridgeSucceeds(client, function(cartridge) {
          return callback();
        });
      });
    });

    describe('Launch', function() {

      /**
       * Test that verifies that the Whiteboards Tool can be launched
       */
      it('can be launched', function(callback) {
        var client = TestsUtil.getAnonymousClient();
        var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
        var user = TestsUtil.generateUser(global.tests.canvas.ucberkeley);
        LtiTestsUtil.assertWhiteboardsLaunchSucceeds(client, course, user, function() {
          return callback();
        });
      });
    });
  });

  describe('LTI', function() {

    /**
     * Test that verifies that LTI parameters are validated
     */
    it('validates the lti parameters', function(callback) {
      var client = TestsUtil.getAnonymousClient();
      var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
      var user = TestsUtil.generateUser(global.tests.canvas.ucberkeley);

      // Missing api domain
      delete course.canvas.canvas_api_domain;
      delete user.canvas.canvas_api_domain;
      LtiTestsUtil.assertAssetLibraryLaunchFails(client, course, user, 400, function() {

        // Missing course id
        course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
        delete course.id;
        LtiTestsUtil.assertAssetLibraryLaunchFails(client, course, user, 400, function() {
          return callback();
        });
      });
    });

    /**
     * Test that verifies that the LTI credentials need to be correct in order to do a successful launch
     */
    it('needs the correct lti credentials', function(callback) {
      var client = TestsUtil.getAnonymousClient();
      var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
      var user = TestsUtil.generateUser(global.tests.canvas.ucberkeley);

      // An missing LTI key will cause validation to fail
      course.canvas.lti_key = null;
      LtiTestsUtil.assertAssetLibraryLaunchFails(client, course, user, 400, function() {

        // An empty LTI key will cause validation to fail
        course.canvas.lti_key = '';
        LtiTestsUtil.assertAssetLibraryLaunchFails(client, course, user, 400, function() {

          // The wrong LTI key will cause the Canvas instance to not be found
          course.canvas.lti_key = '12345678901234567890123456789012';
          LtiTestsUtil.assertAssetLibraryLaunchFails(client, course, user, 404, function() {

            // A missing LTI secret will cause an authorization failure
            var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
            course.canvas.lti_secret = null;
            LtiTestsUtil.assertAssetLibraryLaunchFails(client, course, user, 401, function() {

              // An empty LTI secret will cause an authorization failure
              course.canvas.lti_secret = '';
              LtiTestsUtil.assertAssetLibraryLaunchFails(client, course, user, 401, function() {

                // The wrong LTI secret will cause an authorization failure
                course.canvas.lti_secret = 'wrong';
                LtiTestsUtil.assertAssetLibraryLaunchFails(client, course, user, 401, function() {
                  return callback();
                });
              });
            });
          });
        });
      });
    });

    /**
     * Test that verifies that the same client can interact with multiple courses concurrently. This test
     * will essentially ensure that the cookies that are generated by the system aren't overwriting each other
     */
    it('can support the same client in two courses concurrently', function(callback) {
      // Launch a user into a new course
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, courseA, user) {

        // Launch the same user into another course
        TestsUtil.getAssetLibraryClient(client, null, user, function(client, courseB, user) {

          // Getting the me feed in the context of course A should work
          UsersTestsUtil.assertGetMe(client, courseA, null, function(me) {
            assert.strictEqual(me.course.canvas_course_id, courseA.id);

            // Getting the me feed in the context of course B with the same client should work
            UsersTestsUtil.assertGetMe(client, courseB, null, function(me) {
              assert.strictEqual(me.course.canvas_course_id, courseB.id);
              return callback();
            });
          });
        });
      });
    });

    /**
     * Test that verifies that the same client can interact with multiple courses from multiple Canvas instances
     * concurrently. This test will essentially ensure that the cookies that are generated by the system aren't
     * overwriting each other
     */
    it('can support the same client in two courses concurrently', function(callback) {
      // Launch a client into a new course on the Berkeley Canvas instance
      var client = TestsUtil.getAnonymousClient();
      var courseBerkeley = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
      TestsUtil.getAssetLibraryClient(client, courseBerkeley, null, function() {

        // Launch the same client in a UC Davis course
        var courseDavis = TestsUtil.generateCourse(global.tests.canvas.ucdavis);
        TestsUtil.getAssetLibraryClient(client, courseDavis, null, function() {

          // Getting the me feed in the UC Berkeley course should work
          UsersTestsUtil.assertGetMe(client, courseBerkeley, null, function(me) {
            assert.strictEqual(me.course.canvas_course_id, courseBerkeley.id);

            // Getting the me feed in the context of the UC Davis course with the same client should work
            UsersTestsUtil.assertGetMe(client, courseDavis, null, function(me) {
              assert.strictEqual(me.course.canvas_course_id, courseDavis.id);
              return callback();
            });
          });
        });
      });
    });

    /**
     * Test that verifies that new courses are created on the fly
     */
    it('creates courses on the fly', function(callback) {
      // Launch a user into a new course
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, courseA, userA) {

        // Get the user's information
        UsersTestsUtil.assertGetMe(client, courseA, null, function(me) {
          assert.strictEqual(me.canvas_user_id, userA.id);
          assert.strictEqual(me.course.canvas_course_id, courseA.id);

          // Launching the tool for the same user in the same course should
          // not result in a new course
          TestsUtil.getAssetLibraryClient(null, courseA, userA, function(client) {
            UsersTestsUtil.assertGetMe(client, courseA, null, function(meReload) {
              assert.strictEqual(meReload.course.id, me.course.id);

              // Launching the tool for a new user in the same course should not result in a new course
              TestsUtil.getAssetLibraryClient(null, courseA, null, function(client, courseA, userB) {
                UsersTestsUtil.assertGetMe(client, courseA, null, function(meNewUser) {
                  assert.strictEqual(meNewUser.course.id, me.course.id);

                  // Launching the tool for the same user in another course should result in a new course
                  TestsUtil.getAssetLibraryClient(null, null, userA, function(client, courseB, userA) {
                    UsersTestsUtil.assertGetMe(client, courseB, null, function(meNewCourse) {
                      assert.notEqual(meNewCourse.course.id, me.course.id);

                      // Launching the tool for a different user in a different Canvas instance with the same
                      // Canvas course id should result in a new course
                      var davisCourse = TestsUtil.generateCourse(global.tests.canvas.ucdavis, me.course.canvas_course_id);
                      TestsUtil.getAssetLibraryClient(null, davisCourse, null, function(davisClient, davisCourse, davisUser) {
                        UsersTestsUtil.assertGetMe(davisClient, davisCourse, null, function(davisMe) {
                          assert.notEqual(me.course.id, davisMe.course.id);
                          assert.notEqual(me.course.canvas_api_domain, davisMe.course.canvas_api_domain);

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

    /**
     * Test that verifies that new users are created on the fly
     */
    it('creates users on the fly', function(callback) {
      // Launch a user into a new course
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, courseA, userA) {

        // Get the user's information
        UsersTestsUtil.assertGetMe(client, courseA, null, function(me) {
          assert.strictEqual(me.canvas_user_id, userA.id);
          assert.strictEqual(me.course.canvas_course_id, courseA.id);

          // Launching the tool for the same user in the same course should
          // authenticate the client to the same user
          TestsUtil.getAssetLibraryClient(null, courseA, userA, function(client) {
            UsersTestsUtil.assertGetMe(client, courseA, null, function(meReload) {
              assert.strictEqual(meReload.id, me.id);

              // Launching the tool for a new user in the same course should result in a new user
              TestsUtil.getAssetLibraryClient(null, courseA, null, function(client, courseA, userB) {
                UsersTestsUtil.assertGetMe(client, courseA, null, function(meNewUser) {
                  assert.notEqual(meNewUser.id, me.id);

                  // Launching the tool for the same user in another course should result in a new user
                  TestsUtil.getAssetLibraryClient(null, null, userA, function(client, courseB, userA) {
                    UsersTestsUtil.assertGetMe(client, courseB, null, function(meNewUser) {
                      assert.notEqual(meNewUser.id, me.id);
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
     * Test that verifies that returning users are updated
     */
    it('updates returning users', function(callback) {
      // Launch a user into a new course
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        UsersTestsUtil.assertGetMe(client, course, null, function(me) {

          // Update the name, role and image for the user
          user.fullName = 'Nicolaas Matthijs';
          user.roles = 'Assistant';
          user.userImage = 'http://www.foo.com/image.png';
          TestsUtil.getAssetLibraryClient(null, course, user, function(client, course, user) {
            UsersTestsUtil.assertGetMe(client, course, null, function(newMe) {
              assert.strictEqual(newMe.canvas_full_name, 'Nicolaas Matthijs');
              assert.strictEqual(newMe.canvas_course_role, 'Assistant');
              assert.strictEqual(newMe.canvas_image, 'http://www.foo.com/image.png');

              // Ensure that the bookmarklet token has not been updated
              assert.strictEqual(newMe.bookmarklet_token, me.bookmarklet_token);

              return callback();
            });
          });
        });
      });
    });

    /**
     * Test that verifies that site admins that launch one of the tools
     * are marked as inactive as they should not appear in the leader board
     */
    it('sets a different enrollment state based on the launched user\'s enrollment role', function(callback) {
      // Generate a regular student, an instructor and a canvas site admin
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        var instructorUser = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, course, instructorUser, function(instructorClient, course, instructorUser) {
          var adminUser = TestsUtil.generateCanvasAdmin();
          TestsUtil.getAssetLibraryClient(null, course, adminUser, function(adminClient, course, adminUser) {

            // The student should be an active user that's not an admin
            UsersTestsUtil.assertGetMe(client, course, null, function(me) {
              assert.strictEqual(me.canvas_enrollment_state, 'active');
              assert.strictEqual(me.is_admin, false);

              // The instructor should be an active user that is an admin
              UsersTestsUtil.assertGetMe(instructorClient, course, null, function(me) {
                assert.strictEqual(me.canvas_enrollment_state, 'active');
                assert.strictEqual(me.is_admin, true);

                // The site admin should be an inactive user that is an admin
                UsersTestsUtil.assertGetMe(adminClient, course, null, function(me) {
                  assert.strictEqual(me.canvas_enrollment_state, 'inactive');
                  assert.strictEqual(me.is_admin, true);

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
