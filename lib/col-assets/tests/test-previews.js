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

var assert = require('assert');

var Collabosphere = require('col-core');
var TestsUtil = require('col-tests');

describe('Assets', function() {

  describe('Preview Service Callback Endpoint', function() {

    /**
     * Test that verifies that the previews endpoint is secured
     */
    it('requires authentication', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {

        // No header
        client.request('/api/assets-callback', 'POST', null, null, function(err, response) {
          assert.ok(err);
          assert.strictEqual(err.code, 401);

          // Incorrect header
          client.request('/api/assets-callback', 'POST', null, {'authorization': 'foo'}, function(err, response) {
            assert.ok(err);
            assert.strictEqual(err.code, 401);

            // A request with a valid header but missing data should result in a 400
            var header = Collabosphere.generatePreviewServiceSignature();
            client.request('/api/assets-callback', 'POST', null, {'authorization': header}, function(err, response) {
              assert.ok(err);
              assert.strictEqual(err.code, 400);
              assert.ok(err.msg.indexOf('"id" is required') !== -1);

              return callback();
            });
          });
        })
      });
    });
  });
});
