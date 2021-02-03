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

var AssetsTestUtil = require('col-assets/tests/util');
var TestsUtil = require('col-tests');
var UsersTestUtil = require('col-users/tests/util');

describe('CSRF Protection', function() {

  /**
   * Test that verifies that CSRF validation passes
   */
  it('succeeds CSRF validation', function(callback) {
    TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
      UsersTestUtil.assertGetMe(client, course, null, function(me) {

        // Verify that an empty referer header succeeds when using a trusted method
        client.options.referer = '';
        UsersTestUtil.assertGetMe(client, course, me, function() {

          // Verify that a correct absolute referer header succeeds
          client.options.referer = 'http://localhost:2000/';
          AssetsTestUtil.assertCreateLink(client, course, 'UC Berkeley', 'http://www.berkeley.edu/', null, function() {

            // Verify that a relative referer header succeeds
            client.options.referer = '/test';
            AssetsTestUtil.assertCreateLink(client, course, 'UC Berkeley', 'http://www.berkeley.edu/', null, function() {

              // Verify that an invalid referer header succeeds when providing
              // the bookmarklet token
              client.options.referer = 'http://www.domain.com/';
              AssetsTestUtil.assertCreateLinkBookmarklet(client, course, me.id, me.bookmarklet_token, 'UC Berkeley', 'http://www.berkeley.edu/', null, function() {

                return callback();
              });
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies that CSRF validation fails
   */
  it('fails CSRF validation', function(callback) {
    TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {

      // Verify that an empty referer header fails CSRF validation
      client.options.referer = '';
      AssetsTestUtil.assertCreateLinkFails(client, course, 'UC Berkeley', 'http://www.berkeley.edu/', null, 500, function() {

        // Verify that a different referer header fails CSRF validation
        client.options.referer = 'http://www.domain.com/';
        AssetsTestUtil.assertCreateLinkFails(client, course, 'UC Berkeley', 'http://www.berkeley.edu/', null, 500, function() {

          return callback();
        });
      });
    });
  });
});
