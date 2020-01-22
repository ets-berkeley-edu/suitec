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

var AssetsTestUtil = require('./util');

describe('Assets', function() {

  describe('Like', function() {

    /**
     * Test that verifies that an asset can be liked
     */
    it('can be liked', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
        AssetsTestUtil.assertCreateLink(client1, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

          // Verify that the asset can be liked
          TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
            AssetsTestUtil.assertLike(client2, course, asset.id, true, function() {

              // Verify that the like is reflected when retrieving the asset
              AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                assert.strictEqual(asset.liked, true);
                assert.strictEqual(asset.likes, 1);
                assert.strictEqual(asset.dislikes, 0);

                // Verify that the like is reflected when retrieving the asset as other user
                AssetsTestUtil.assertGetAsset(client1, course, asset.id, null, 0, function(asset) {
                  assert.strictEqual(asset.liked, null);
                  assert.strictEqual(asset.likes, 1);
                  assert.strictEqual(asset.dislikes, 0);

                  // Verify that the like is reflected when retrieving the assets for the course
                  AssetsTestUtil.assertGetAssets(client2, course, null, null, null, null, 1, function(assets) {
                    assert.strictEqual(assets.results[0].liked, true);
                    assert.strictEqual(assets.results[0].likes, 1);
                    assert.strictEqual(assets.results[0].dislikes, 0);

                    // Verify that the like is reflected when retrieving the assets for the course as other user
                    AssetsTestUtil.assertGetAssets(client1, course, null, null, null, null, 1, function(assets) {
                      assert.strictEqual(assets.results[0].liked, null);
                      assert.strictEqual(assets.results[0].likes, 1);
                      assert.strictEqual(assets.results[0].dislikes, 0);

                      // Verify that re-liking an asset doesn't increase the counts
                      AssetsTestUtil.assertLike(client2, course, asset.id, true, function() {
                        AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                          assert.strictEqual(asset.liked, true);
                          assert.strictEqual(asset.likes, 1);
                          assert.strictEqual(asset.dislikes, 0);

                          // Verify that an additional like is also reflected
                          TestsUtil.getAssetLibraryClient(null, course, null, function(client3, course, user3) {
                            AssetsTestUtil.assertLike(client3, course, asset.id, true, function() {
                              AssetsTestUtil.assertGetAsset(client3, course, asset.id, null, 0, function(asset) {
                                assert.strictEqual(asset.liked, true);
                                assert.strictEqual(asset.likes, 2);
                                assert.strictEqual(asset.dislikes, 0);

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

    /**
     * Test that verifies that an asset can be disliked
     */
    it('can be disliked', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
        AssetsTestUtil.assertCreateLink(client1, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

          // Verify that the asset can be liked
          TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
            AssetsTestUtil.assertLike(client2, course, asset.id, false, function() {

              // Verify that the like is reflected when retrieving the asset
              AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                assert.strictEqual(asset.liked, false);
                assert.strictEqual(asset.likes, 0);
                assert.strictEqual(asset.dislikes, 1);

                // Verify that the like is reflected when retrieving the asset as other user
                AssetsTestUtil.assertGetAsset(client1, course, asset.id, null, 0, function(asset) {
                  assert.strictEqual(asset.liked, null);
                  assert.strictEqual(asset.likes, 0);
                  assert.strictEqual(asset.dislikes, 1);

                  // Verify that the like is reflected when retrieving the assets for the course
                  AssetsTestUtil.assertGetAssets(client2, course, null, null, null, null, 1, function(assets) {
                    assert.strictEqual(assets.results[0].liked, false);
                    assert.strictEqual(assets.results[0].likes, 0);
                    assert.strictEqual(assets.results[0].dislikes, 1);

                    // Verify that the like is reflected when retrieving the assets for the course as other user
                    AssetsTestUtil.assertGetAssets(client1, course, null, null, null, null, 1, function(assets) {
                      assert.strictEqual(assets.results[0].liked, null);
                      assert.strictEqual(assets.results[0].likes, 0);
                      assert.strictEqual(assets.results[0].dislikes, 1);

                      // Verify that re-disliking an asset doesn't increase the counts
                      AssetsTestUtil.assertLike(client2, course, asset.id, false, function() {
                        AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                          assert.strictEqual(asset.liked, false);
                          assert.strictEqual(asset.likes, 0);
                          assert.strictEqual(asset.dislikes, 1);

                          // Verify that an additional like is also reflected
                          TestsUtil.getAssetLibraryClient(null, course, null, function(client3, course, user3) {
                            AssetsTestUtil.assertLike(client3, course, asset.id, false, function() {
                              AssetsTestUtil.assertGetAsset(client3, course, asset.id, null, 0, function(asset) {
                                assert.strictEqual(asset.liked, false);
                                assert.strictEqual(asset.likes, 0);
                                assert.strictEqual(asset.dislikes, 2);

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

    /**
     * Test that verifies that a like or dislike can be updated
     */
    it('can be updated', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
        AssetsTestUtil.assertCreateLink(client1, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

          // Verify that a like can be undone
          TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
            AssetsTestUtil.assertLike(client2, course, asset.id, true, function() {
              AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                assert.strictEqual(asset.liked, true);
                assert.strictEqual(asset.likes, 1);
                assert.strictEqual(asset.dislikes, 0);
                AssetsTestUtil.assertLike(client2, course, asset.id, null, function() {
                  AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                    assert.strictEqual(asset.liked, null);
                    assert.strictEqual(asset.likes, 0);
                    assert.strictEqual(asset.dislikes, 0);

                    // Verify that a dislike can be undone
                    AssetsTestUtil.assertLike(client2, course, asset.id, false, function() {
                      AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                        assert.strictEqual(asset.liked, false);
                        assert.strictEqual(asset.likes, 0);
                        assert.strictEqual(asset.dislikes, 1);
                        AssetsTestUtil.assertLike(client2, course, asset.id, null, function() {
                          AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                            assert.strictEqual(asset.liked, null);
                            assert.strictEqual(asset.likes, 0);
                            assert.strictEqual(asset.dislikes, 0);

                            // Verify that a like can be switched to a dislike
                            AssetsTestUtil.assertLike(client2, course, asset.id, true, function() {
                              AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                                assert.strictEqual(asset.liked, true);
                                assert.strictEqual(asset.likes, 1);
                                assert.strictEqual(asset.dislikes, 0);
                                AssetsTestUtil.assertLike(client2, course, asset.id, false, function() {
                                  AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                                    assert.strictEqual(asset.liked, false);
                                    assert.strictEqual(asset.likes, 0);
                                    assert.strictEqual(asset.dislikes, 1);

                                    // Verify that a dislike can be switched to a like
                                    AssetsTestUtil.assertLike(client2, course, asset.id, true, function() {
                                      AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                                        assert.strictEqual(asset.liked, true);
                                        assert.strictEqual(asset.likes, 1);
                                        assert.strictEqual(asset.dislikes, 0);

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
        });
      });
    });

    /**
     * Test that verifies validation when liking or disliking a comment
     */
    it('is validated', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
        AssetsTestUtil.assertCreateLink(client1, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

          // Invalid asset id
          TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
            AssetsTestUtil.assertLikeFails(client2, course, 'Not a number', true, 400, function() {
              AssetsTestUtil.assertLikeFails(client2, course, -1, true, 404, function() {
                AssetsTestUtil.assertLikeFails(client2, course, 234234233, true, 404, function() {

                  // Verify that no likes or dislikes were added
                  AssetsTestUtil.assertGetAsset(client2, course, asset.id, null, 0, function(asset) {
                    assert.strictEqual(asset.liked, null);
                    assert.strictEqual(asset.likes, 0);
                    assert.strictEqual(asset.dislikes, 0);

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
     * Test that verifies authorization when liking or disliking an asset
     */
    it('verifies authorization', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course1, user1) {
        AssetsTestUtil.assertCreateLink(client1, course1, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

          // Verify that a user is not able to like or dislike their own assets
          AssetsTestUtil.assertLikeFails(client1, course1, asset.id, true, 401, function() {

            // Verify that a user in a different course can not like or dislike the asset
            TestsUtil.getAssetLibraryClient(null, null, null, function(client2, course2, user2) {
              AssetsTestUtil.assertLikeFails(client2, course2, asset.id, true, 404, function() {

                // Verify that no likes or dislikes were added
                AssetsTestUtil.assertGetAsset(client1, course1, asset.id, null, 0, function(asset) {
                  assert.strictEqual(asset.liked, null);
                  assert.strictEqual(asset.likes, 0);
                  assert.strictEqual(asset.dislikes, 0);

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
