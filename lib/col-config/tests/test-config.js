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

var TestsUtil = require('col-tests');

var ConfigTestUtil = require('./util');

describe('Configuration', function() {

  describe('Get configuration', function() {

    /**
     * Test that verifies that the configuration feed can be retrieved
     */
    it('can be retrieved', function(callback) {
      // Verify that the configuration feed can be retrieved as an admin
      var newInstructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, newInstructor, function(instructorClient, course, instructor) {

        ConfigTestUtil.assertGetConfiguration(instructorClient, course, function() {

          // Verify that the configuration feed can be retrieved as a regular user
          TestsUtil.getAssetLibraryClient(null, course, null, function(userClient, userCourse, user) {

            ConfigTestUtil.assertGetConfiguration(userClient, userCourse, function() {

              return callback();
            });
          });
        });
      });
    });
  });
});
