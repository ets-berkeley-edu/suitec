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
var async = require('async');
var randomstring = require('randomstring');

var AssetsTestUtil = require('./util');
var CollabosphereConstants = require('col-core/lib/constants');
var TestsUtil = require('col-tests');
var UsersAPI = require('col-users');
var UsersTestUtil = require('col-users/tests/util');

describe('Bookmarklet', function() {
  var assetLibraryClient;
  var bookmarkletClient;
  var testCourse;
  var testMe;

  beforeEach(function(done) {
    TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
      UsersTestUtil.assertGetMe(client, course, null, function(me) {
        assetLibraryClient = client;
        testCourse = course;
        testMe = me;
        bookmarkletClient = TestsUtil.getAnonymousClient();
        return done();
      });
    });
  });

  it('creates links with no optional metadata', function(callback) {
    AssetsTestUtil.assertCreateLinkBookmarklet(bookmarkletClient, testCourse, testMe.id, testMe.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
      return callback();
    });
  });
  it('defaults the link title to the URL', function(callback) {
    var url = 'http://uci.edu';
    AssetsTestUtil.assertCreateLinkBookmarklet(bookmarkletClient, testCourse, testMe.id, testMe.bookmarklet_token, null, url, null, function (asset) {
      assert.equal(asset.title, url);
      return callback();
    });
  });
  it('creates links with optional metadata', function(callback) {
    var opts = {
      'description': 'University of California, Berkeley homepage',
      'source': 'http://www.universityofcalifornia.edu/uc-system'
    };
    AssetsTestUtil.assertCreateLinkBookmarklet(bookmarkletClient, testCourse, testMe.id, testMe.bookmarklet_token, 'UC Berkeley', 'http://www.berkeley.edu/', opts, function(asset) {
      return callback();
    });
  });

  describe('Validation checks', function() {
    it('does not allow long titles', function(callback) {
      AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, testCourse, testMe.id, testMe.bookmarklet_token, randomstring.generate(256), 'http://www.berkeley.edu/', null, 400, callback);
    });
    it('needs a URL string', function(callback) {
      AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, testCourse, testMe.id, testMe.bookmarklet_token, 'UC Berkeley', null, null, 400, callback);
    });
    it('validates the URL and the source option', function(callback) {
      var invalidUrls = [
        'invalid url',
        '/invalidurl'
      ];
      async.eachSeries(invalidUrls, function(url, done_url) {
        AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, testCourse, testMe.id, testMe.bookmarklet_token, 'UC Berkeley', url, null, 400, done_url);
      }, function() {
        async.eachSeries(invalidUrls, function(url, done_opt) {
          var opts = {'source': url};
          AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, testCourse, testMe.id, testMe.bookmarklet_token, 'UC Berkeley', 'http://www.berkeley.edu/', opts, 400, done_opt);
        }, callback);
      });
    });
    it('does not allow long URLs', function(callback) {
      var longUrl = 'http://www.berkeley.edu/?q=' + randomstring.generate(229);
      AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, testCourse, testMe.id, testMe.bookmarklet_token, 'UC Berkeley', longUrl, null, 400, callback);
    });
  });

  /**
   * Test that verifies authorization when creating a new link asset through the Bookmarklet
   */
  it('only lets active users add assets through bookmarklet', function(callback) {
    // Verify the user is able to create an asset through the bookmarklet while still enrolled
    AssetsTestUtil.assertCreateLinkBookmarklet(bookmarkletClient, testCourse, testMe.id, testMe.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
      // Change the enrollment state of the user and verify that adding an asset
      // through the bookmarklet is no longer possible
      var unenrolledStates = [
        CollabosphereConstants.ENROLLMENT_STATE.COMPLETED,
        CollabosphereConstants.ENROLLMENT_STATE.INACTIVE,
        CollabosphereConstants.ENROLLMENT_STATE.INVITED,
        CollabosphereConstants.ENROLLMENT_STATE.REJECTED
      ];
      async.eachSeries(unenrolledStates, function(unenrolledState, done) {
        UsersAPI.updateUsers([testMe.id], {'canvas_enrollment_state': unenrolledState}, function(err) {
          assert.ifError(err);
          AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, testCourse, testMe.id, testMe.bookmarklet_token, 'UC Berkeley', 'http://www.ucberkeley.edu/', null, 401, done);
        });
      }, function() {
        // Verify that only the first asset has been created
        AssetsTestUtil.assertGetAssets(assetLibraryClient, testCourse, null, null, null, null, 1, function(assets) {
          assert.ok(assets.results[0].id);
          assert.strictEqual(assets.results[0].id, asset.id);
          return callback();
        });
      });
    });
  });
});
