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

var AssetsTestUtil = require('./util');

describe('Assets', function() {

  describe('Create comment', function() {

    /**
     * Test that verifies that a new comment can be created
     */
    it('can be created', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
        AssetsTestUtil.assertCreateLink(client1, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
          // Verify that the created asset has no comments
          AssetsTestUtil.assertGetAsset(client1, course, asset.id, asset, 0, function(asset) {

            // Create a new comment
            AssetsTestUtil.assertCreateComment(client1, course, asset.id, 'Comment 1', null, function(comment1) {

              // Verify that the comment is returned when retrieving the asset
              AssetsTestUtil.assertGetAsset(client1, course, asset.id, asset, 1, function(asset) {
                AssetsTestUtil.assertComment(asset.comments[0], {'expectedComment': comment1});

                // Verify that a second user can make a comment as well
                TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
                  AssetsTestUtil.assertCreateComment(client2, course, asset.id, 'Comment 2', null, function(comment2) {
                    AssetsTestUtil.assertGetAsset(client2, course, asset.id, asset, 2, function(asset) {
                      AssetsTestUtil.assertComment(asset.comments[0], {'expectedComment': comment1});
                      AssetsTestUtil.assertComment(asset.comments[1], {'expectedComment': comment2});

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
     * Test that verifies validation when creating a new comment
     */
    it('is validated', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        AssetsTestUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

          // Invalid asset id
          AssetsTestUtil.assertCreateCommentFails(client, course, 'Not a number', 'Comment', null, 400, function() {
            AssetsTestUtil.assertCreateCommentFails(client, course, -1, 'Comment', null, 404, function() {
              AssetsTestUtil.assertCreateCommentFails(client, course, 234234233, 'Comment', null, 404, function() {

                // Missing body
                AssetsTestUtil.assertCreateCommentFails(client, course, asset.id, null, null, 400, function() {

                  // Verify that no comments were created
                  AssetsTestUtil.assertGetAsset(client, course, asset.id, asset, 0, function(asset) {

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
     * Test that verifies that a comment can be replied to
     */
    it('allows replying', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
        AssetsTestUtil.assertCreateLink(client1, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

          // Create a top-level comment
          AssetsTestUtil.assertCreateComment(client1, course, asset.id, 'Comment 1', null, function(comment1) {

            // Verify that a reply to this comment can be made
            AssetsTestUtil.assertCreateComment(client1, course, asset.id, 'Comment 1 Reply 1', comment1.id, function(comment1Reply1) {

              // Verify that a second reply to this comment can be made
              TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
                AssetsTestUtil.assertCreateComment(client2, course, asset.id, 'Comment 1 Reply 2', comment1.id, function(comment1Reply2) {

                  // Verify that a reply to a reply can be made. Even though the UI will not expose this
                  // as a feature, it is still supported through the REST API
                  AssetsTestUtil.assertCreateComment(client2, course, asset.id, 'Comment 1 Reply 1 Reply', comment1Reply1.id, function(comment1Reply1Reply) {

                    // Verify that a regular top-level comment can also still be made
                    AssetsTestUtil.assertCreateComment(client1, course, asset.id, 'Comment 2', null, function(comment2) {

                      // Verify that all created comments are present when getting the asset
                      AssetsTestUtil.assertGetAsset(client1, course, asset.id, asset, 5, function(asset) {
                        AssetsTestUtil.assertComment(asset.comments[0], {'expectedComment': comment1});
                        AssetsTestUtil.assertComment(asset.comments[1], {'expectedComment': comment1Reply1});
                        AssetsTestUtil.assertComment(asset.comments[2], {'expectedComment': comment1Reply2});
                        AssetsTestUtil.assertComment(asset.comments[3], {'expectedComment': comment1Reply1Reply});
                        AssetsTestUtil.assertComment(asset.comments[4], {'expectedComment': comment2});

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
     * Test that verifies validation when replying to a comment
     */
    it('is validated when replying', function(callback) {
      // Generate a number of test assets for a course
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        TestsUtil.generateTestAssets(client, course, 2, function(assets) {

          // Invalid parent id
          AssetsTestUtil.assertCreateCommentFails(client, course, assets[0].id, 'Comment', 'Not a number', 400, function() {
            AssetsTestUtil.assertCreateCommentFails(client, course, assets[0].id, 'Comment', -1, 400, function() {
              AssetsTestUtil.assertCreateCommentFails(client, course, assets[0].id, 'Comment', 234234233, 400, function() {

                // Parent id from a different asset
                AssetsTestUtil.assertCreateComment(client, course, assets[1].id, 'Comment', null, function(comment) {
                  AssetsTestUtil.assertCreateCommentFails(client, course, assets[0].id, 'Comment', comment.id, 400, function() {

                    // Verify that no comments were created
                    AssetsTestUtil.assertGetAsset(client, course, assets[0].id, assets[0], 0, function(asset) {

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

  describe('Edit comment', function() {

    /**
     * Test that verifies that a comment can be edited
     */
    it('can be edited', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        AssetsTestUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
          AssetsTestUtil.assertCreateComment(client, course, asset.id, 'Comment 1', null, function(comment1) {

            // Verify that the comment can be edited
            AssetsTestUtil.assertEditComment(client, course, asset.id, comment1.id, 'Updated comment 1', function(comment1) {

              // Verify that a reply can be edited
              AssetsTestUtil.assertCreateComment(client, course, asset.id, 'Comment 2', comment1.id, function(comment2) {
                AssetsTestUtil.assertEditComment(client, course, asset.id, comment2.id, 'Updated comment 2', function(comment2) {

                  return callback();
                });
              });
            });
          });
        });
      });
    });

    /**
     * Test that verifies validation when editing a comment
     */
    it('is validated', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        AssetsTestUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
          AssetsTestUtil.assertCreateComment(client, course, asset.id, 'Comment 1', null, function(comment) {

            // Invalid comment id
            AssetsTestUtil.assertEditCommentFails(client, course, asset.id, 'Not a number', 'Comment', 400, function() {
              AssetsTestUtil.assertEditCommentFails(client, course, asset.id, -1, 'Comment', 404, function() {
                AssetsTestUtil.assertEditCommentFails(client, course, asset.id, 234234233, 'Comment', 404, function() {

                  // Missing body
                  AssetsTestUtil.assertEditCommentFails(client, course, asset.id, comment.id, null, 400, function() {

                    // Verify that the comment has not been updated
                    AssetsTestUtil.assertGetAsset(client, course, asset.id, asset, 1, function(asset) {
                      AssetsTestUtil.assertComment(asset.comments[0], {'expectedComment': comment});

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
     * Test that verifies authorization when editing a comment
     */
    it('verifies authorization', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course1, user1) {
        AssetsTestUtil.assertCreateLink(client1, course1, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
          AssetsTestUtil.assertCreateComment(client1, course1, asset.id, 'Comment 1', null, function(comment) {

            // Verify that the comment can be edited by the creator of the comment
            AssetsTestUtil.assertEditComment(client1, course1, asset.id, comment.id, 'Comment 1 Edit 1', function(comment) {

              // Verify that the comment can be edited by an instructor of the course
              var adminCourse = TestsUtil.generateInstructor();
              TestsUtil.getAssetLibraryClient(null, course1, adminCourse, function(client2, course1, user2) {
                AssetsTestUtil.assertEditComment(client2, course1, asset.id, comment.id, 'Comment 1 Edit 2', function(comment) {

                  // Verify that the comment can not be edited by a regular student of the course
                  TestsUtil.getAssetLibraryClient(null, course1, null, function(client3, course1, user3) {
                    AssetsTestUtil.assertEditCommentFails(client3, course1, asset.id, comment.id, 'Comment 1 Edit 3', 401, function() {

                      // Verify that an instructor in a different course can not edit the comment
                      var adminOtherCourse = TestsUtil.generateInstructor();
                      TestsUtil.getAssetLibraryClient(null, null, adminOtherCourse, function(client4, course2, user4) {
                        AssetsTestUtil.assertEditCommentFails(client4, course2, asset.id, comment.id, 'Comment 1 Edit 3', 404, function() {

                          // Verify that the comment has not been updated
                          AssetsTestUtil.assertGetAsset(client1, course1, asset.id, asset, 1, function(asset) {
                            AssetsTestUtil.assertComment(asset.comments[0], {'expectedComment': comment});

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

  describe('Delete comment', function() {

    /**
     * Test that verifies that a comment can be deleted
     */
    it('can be deleted', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        AssetsTestUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
          AssetsTestUtil.assertCreateComment(client, course, asset.id, 'Comment 1', null, function(comment1) {

            // Verify that the comment can be deleted
            AssetsTestUtil.assertDeleteComment(client, course, asset.id, comment1.id, function() {

              // Verify that a reply can be deleted
              AssetsTestUtil.assertCreateComment(client, course, asset.id, 'Comment 2', null, function(comment2) {
                AssetsTestUtil.assertCreateComment(client, course, asset.id, 'Comment 2 reply', comment2.id, function(comment3) {
                  AssetsTestUtil.assertDeleteComment(client, course, asset.id, comment3.id, function() {

                    // TODO: Test that you can delete a reply on someone else's comment

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
     * Test that verifies that a comment can only be deleted when it has no replies
     */
    it('verifies replies', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        AssetsTestUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
          // Create a top level comment and 2 replies
          AssetsTestUtil.assertCreateComment(client, course, asset.id, 'Comment 1', null, function(comment1) {
            AssetsTestUtil.assertCreateComment(client, course, asset.id, 'Comment 1 Reply 1', comment1.id, function(comment2) {
              AssetsTestUtil.assertCreateComment(client, course, asset.id, 'Comment 1 Reply 2', comment1.id, function(comment3) {

                // Verify that the top level comment can not be deleted
                AssetsTestUtil.assertDeleteCommentFails(client, course, asset.id, comment1.id, 400, function() {

                  // Verify that a reply can be deleted
                  AssetsTestUtil.assertDeleteComment(client, course, asset.id, comment2.id, function() {
                    // Verify that the second reply can also be deleted
                    AssetsTestUtil.assertDeleteComment(client, course, asset.id, comment3.id, function() {

                      // Verify that the top level comment can now be deleted
                      AssetsTestUtil.assertDeleteComment(client, course, asset.id, comment1.id, function() {

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
     * Test that verifies validation when deleting a comment
     */
    it('is validated', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        AssetsTestUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
          AssetsTestUtil.assertCreateComment(client, course, asset.id, 'Comment 1', null, function(comment) {

            // Invalid comment id
            AssetsTestUtil.assertDeleteCommentFails(client, course, asset.id, 'Not a number', 400, function() {
              AssetsTestUtil.assertDeleteCommentFails(client, course, asset.id, -1, 404, function() {
                AssetsTestUtil.assertDeleteCommentFails(client, course, asset.id, 234234233, 404, function() {

                  // Verify that the comment has not been deleted
                  AssetsTestUtil.assertGetAsset(client, course, asset.id, asset, 1, function(asset) {
                    AssetsTestUtil.assertComment(asset.comments[0], {'expectedComment': comment});

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
     * Test that verifies authorization when editing a comment
     */
    it('verifies authorization', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course1, user1) {
        AssetsTestUtil.assertCreateLink(client1, course1, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
          AssetsTestUtil.assertCreateComment(client1, course1, asset.id, 'Comment 1', null, function(comment1) {

            // Verify that a comment can be deleted by the creator of the comment
            AssetsTestUtil.assertDeleteComment(client1, course1, asset.id, comment1.id, function() {

              // Verify that a comment can be deleted by an instructor of the course
              AssetsTestUtil.assertCreateComment(client1, course1, asset.id, 'Comment 2', null, function(comment2) {
                var adminCourse = TestsUtil.generateInstructor();
                TestsUtil.getAssetLibraryClient(null, course1, adminCourse, function(client2, course1, user2) {
                  AssetsTestUtil.assertDeleteComment(client2, course1, asset.id, comment2.id, function() {

                    // Verify that a comment can not be deleted by a regular student of the course
                    AssetsTestUtil.assertCreateComment(client1, course1, asset.id, 'Comment 3', null, function(comment3) {
                      TestsUtil.getAssetLibraryClient(null, course1, null, function(client3, course1, user3) {
                        AssetsTestUtil.assertDeleteCommentFails(client3, course1, asset.id, comment3.id, 401, function() {

                          // Verify that an instructor in a different course can not delete the comment
                          var adminOtherCourse = TestsUtil.generateInstructor();
                          TestsUtil.getAssetLibraryClient(null, null, adminOtherCourse, function(client4, course2, user4) {
                            AssetsTestUtil.assertDeleteCommentFails(client4, course2, asset.id, comment3.id, 404, function() {

                              // Verify that the comment has not been deleted
                              AssetsTestUtil.assertGetAsset(client1, course1, asset.id, asset, 1, function(asset) {
                                AssetsTestUtil.assertComment(asset.comments[0], {'expectedComment': comment3});

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
