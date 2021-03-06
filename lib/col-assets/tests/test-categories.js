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

var CategoriesTestUtil = require('col-categories/tests/util');
var TestsUtil = require('col-tests');
var UsersTestUtil = require('col-users/tests/util');

var AssetsTestUtil = require('./util');

describe('Assets', function() {

  describe('Categories', function() {

    describe('Create new assets', function() {

      /**
       * Test that verifies that a new asset can be created with associated categories
       */
      it('can be created', function(callback) {
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {
          CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category1) {
            CategoriesTestUtil.assertCreateCategory(client, course, 'Category 2', function(category2) {

              // Verify that a new asset can be created with a single associated category
              var opts = {'categories': category1.id};
              AssetsTestUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, function(asset) {
                CategoriesTestUtil.assertCategory(asset.categories[0], {'expectedCategory': category1});

                // Verify that a new asset can be created with multiple associated categories
                opts = {'categories': [category1.id, category2.id]};
                AssetsTestUtil.assertCreateLink(client, course, 'UC Berkeley', 'http://www.berkeley.edu/', opts, function(asset) {
                  CategoriesTestUtil.assertCategory(asset.categories[0], {'expectedCategory': category1});
                  CategoriesTestUtil.assertCategory(asset.categories[1], {'expectedCategory': category2});

                  return callback();
                });
              });
            });
          });
        });
      });

      /**
       * Test that verifies validation when creating a new asset with associated categories
       */
      it('is validated', function(callback) {
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {
          CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category) {

            // Invalid category id
            var opts = {'categories': 'Not a number'};
            AssetsTestUtil.assertCreateLinkFails(client, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, 400, function() {
              opts = {'categories': -1};
              AssetsTestUtil.assertCreateLinkFails(client, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, 404, function() {
                opts = {'categories': 234234233};
                AssetsTestUtil.assertCreateLinkFails(client, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, 404, function() {

                  // Invalid category id mixed in with valid category id
                  opts = {'categories': [category.id, 'Not a number']};
                  AssetsTestUtil.assertCreateLinkFails(client, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, 400, function() {
                    opts = {'categories': [category.id, -1]};
                    AssetsTestUtil.assertCreateLinkFails(client, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, 404, function() {
                      opts = {'categories': [category.id, 234234233]};
                      AssetsTestUtil.assertCreateLinkFails(client, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, 404, function() {

                        // Duplicate category id
                        opts = {'categories': [category.id, category.id]};
                        AssetsTestUtil.assertCreateLinkFails(client, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, 400, function() {

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
       * Test that verifies authorization when creating a new asset with associated categories
       */
      it('verifies authorization', function(callback) {
        var instructor1 = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor1, function(client1, course1, instructor1) {
          CategoriesTestUtil.assertCreateCategory(client1, course1, 'Category 1', function(category) {

            // Verify that a category in a different course can not be used
            TestsUtil.getAssetLibraryClient(null, null, null, function(client2, course2, user2) {
              var opts = {'categories': category.id};
              AssetsTestUtil.assertCreateLinkFails(client2, course2, 'UC Davis', 'http://www.ucdavis.edu/', opts, 404, function() {

                return callback();
              });
            });
          });
        });
      });
    });

    describe('Bookmarklet', function() {

      /**
       * Test that verifies that a new asset can be created with associated categories through the bookmarklet
       */
      it('can be created', function(callback) {
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {
          CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category1) {
            CategoriesTestUtil.assertCreateCategory(client, course, 'Category 2', function(category2) {

              UsersTestUtil.assertGetMe(client, course, null, function(me) {
                var bookmarkletClient = TestsUtil.getAnonymousClient();

                // Verify that a new asset can be created with a single associated category
                var opts = {'categories': category1.id};
                AssetsTestUtil.assertCreateLinkBookmarklet(bookmarkletClient, course, me.id, me.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', opts, function(asset) {
                  CategoriesTestUtil.assertCategory(asset.categories[0], {'expectedCategory': category1});

                  // Verify that a new asset can be created with multiple associated categories
                  opts = {'categories': [category1.id, category2.id]};
                  AssetsTestUtil.assertCreateLinkBookmarklet(client, course, me.id, me.bookmarklet_token, 'UC Berkeley', 'http://www.berkeley.edu/', opts, function(asset) {
                    CategoriesTestUtil.assertCategory(asset.categories[0], {'expectedCategory': category1});
                    CategoriesTestUtil.assertCategory(asset.categories[1], {'expectedCategory': category2});

                    return callback();
                  });
                });
              });
            });
          });
        });
      });

      /**
       * Test that verifies validation when creating a new asset with associated categories
       */
      it('is validated', function(callback) {
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {
          CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category) {

            UsersTestUtil.assertGetMe(client, course, null, function(me) {
              var bookmarkletClient = TestsUtil.getAnonymousClient();

              // Invalid category id
              var opts = {'categories': 'Not a number'};
              AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, course, me.id, me.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', opts, 400, function() {
                opts = {'categories': -1};
                AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, course, me.id, me.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', opts, 404, function() {
                  opts = {'categories': 234234233};
                  AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, course, me.id, me.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', opts, 404, function() {

                    // Invalid category id mixed in with valid category id
                    opts = {'categories': [category.id, 'Not a number']};
                    AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, course, me.id, me.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', opts, 400, function() {
                      opts = {'categories': [category.id, -1]};
                      AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, course, me.id, me.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', opts, 404, function() {
                        opts = {'categories': [category.id, 234234233]};
                        AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, course, me.id, me.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', opts, 404, function() {

                          // Duplicate category id
                          opts = {'categories': [category.id, category.id]};
                          AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, course, me.id, me.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', opts, 400, function() {

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
       * Test that verifies authorization when creating a new asset with associated categories
       */
      it('verifies authorization', function(callback) {
        var instructor1 = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor1, function(client1, course1, instructor1) {
          CategoriesTestUtil.assertCreateCategory(client1, course1, 'Category 1', function(category) {

            // Verify that a category in a different course can not be used
            TestsUtil.getAssetLibraryClient(null, null, null, function(client2, course2, user2) {
              UsersTestUtil.assertGetMe(client2, course2, null, function(me) {
                var bookmarkletClient = TestsUtil.getAnonymousClient();

                var opts = {'categories': category.id};
                AssetsTestUtil.assertCreateLinkBookmarkletFails(bookmarkletClient, course2, me.id, me.bookmarklet_token, 'UC Davis', 'http://www.ucdavis.edu/', opts, 404, function() {

                  return callback();
                });
              });
            });
          });
        });
      });
    });

    describe('Get asset', function() {

      /**
       * Test that verifies that the categories are included when retrieving an asset
       */
      it('can be retrieved', function(callback) {
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {
          CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category1) {
            CategoriesTestUtil.assertCreateCategory(client, course, 'Category 2', function(category2) {

              var opts = {'categories': [category1.id, category2.id]};
              AssetsTestUtil.assertCreateLink(client, course, 'UC Berkeley', 'http://www.berkeley.edu/', opts, function(asset) {
                CategoriesTestUtil.assertCategory(asset.categories[0], {'expectedCategory': category1});
                CategoriesTestUtil.assertCategory(asset.categories[1], {'expectedCategory': category2});

                // Ensure that the categories are returned when getting the asset
                AssetsTestUtil.assertGetAsset(client, course, asset.id, asset, 0, function(asset) {

                  return callback();
                });
              });
            });
          });
        });
      });
    });

    describe('Get assets', function() {

      /**
       * Test that verifies the visisbility of categories and associated assets
       */
      it('incorporates category visibility', function(callback) {
        // Set up 2 categories with an asset and an asset without a category
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor, function(instructorClient, course, instructor) {

          CategoriesTestUtil.assertCreateCategory(instructorClient, course, 'Visible Category', function(visibleCategory) {
            CategoriesTestUtil.assertCreateCategory(instructorClient, course, 'Invisible Category', function(invisibleCategory) {

              TestsUtil.getAssetLibraryClient(null, course, null, function(client, course, user) {
                var opts = {'categories': visibleCategory.id};
                AssetsTestUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, function(assetVisibleCategory) {
                  opts = {'categories': invisibleCategory.id};
                  AssetsTestUtil.assertCreateLink(client, course, 'UC Irvine', 'http://www.uci.edu/', opts, function(assetInvisibleCategory) {
                    AssetsTestUtil.assertCreateLink(client, course, 'UC Berkeley', 'http://www.berkeley.edu/', null, function(assetNoCategory) {

                      // Verify that all assets are returned
                      AssetsTestUtil.assertGetAssets(client, course, null, null, null, null, 3, function(assets) {
                        AssetsTestUtil.assertAsset(assets.results[0], {'expectedAsset': assetNoCategory});
                        AssetsTestUtil.assertAsset(assets.results[1], {'expectedAsset': assetInvisibleCategory});
                        AssetsTestUtil.assertAsset(assets.results[2], {'expectedAsset': assetVisibleCategory});

                        // Make a category invisible
                        CategoriesTestUtil.assertEditCategory(instructorClient, course, invisibleCategory.id, 'Invisible Category', false, function(invisibleCategory) {

                          // Verify that the assets associated with this category are no longer returned
                          AssetsTestUtil.assertGetAssets(client, course, null, null, null, null, 2, function(assets) {
                            AssetsTestUtil.assertAsset(assets.results[0], {'expectedAsset': assetNoCategory});
                            AssetsTestUtil.assertAsset(assets.results[1], {'expectedAsset': assetVisibleCategory});

                            // Make the category visible again
                            CategoriesTestUtil.assertEditCategory(instructorClient, course, invisibleCategory.id, 'Invisible Category', true, function(invisibleCategory) {

                              // Verify that the assets associated with this category are returned again
                              AssetsTestUtil.assertGetAssets(client, course, null, null, null, null, 3, function(assets) {
                                AssetsTestUtil.assertAsset(assets.results[0], {'expectedAsset': assetNoCategory});
                                AssetsTestUtil.assertAsset(assets.results[1], {'expectedAsset': assetInvisibleCategory});
                                AssetsTestUtil.assertAsset(assets.results[2], {'expectedAsset': assetVisibleCategory});
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

    describe('Edit asset', function() {

      /**
       * Test that verifies that an asset can be edited with associated categories
       */
      it('can be edited', function(callback) {
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor, function(client1, course, instructor) {
          CategoriesTestUtil.assertCreateCategory(client1, course, 'Category 1', function(category1) {
            CategoriesTestUtil.assertCreateCategory(client1, course, 'Category 2', function(category2) {
              CategoriesTestUtil.assertCreateCategory(client1, course, 'Category 3', function(category3) {

                TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
                  AssetsTestUtil.assertCreateLink(client2, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

                    // Verify that an asset can be edited to have a single associated category
                    var opts = {'categories': category1.id};
                    AssetsTestUtil.assertEditAsset(client2, course, asset.id, 'UC Davis', opts, function(asset) {
                      CategoriesTestUtil.assertCategory(asset.categories[0], {'expectedCategory': category1});

                      // Verify that an asset can be edited to have multiple associated categories
                      opts = {'categories': [category2.id, category3.id]};
                      AssetsTestUtil.assertEditAsset(client2, course, asset.id, 'UC Davis', opts, function(asset) {
                        CategoriesTestUtil.assertCategory(asset.categories[0], {'expectedCategory': category2});
                        CategoriesTestUtil.assertCategory(asset.categories[1], {'expectedCategory': category3});

                        // Verify that an asset can be edited to not have any associated categories
                        AssetsTestUtil.assertEditAsset(client2, course, asset.id, 'UC Davis', null, function(asset) {
                          assert.strictEqual(asset.categories.length, 0);

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
       * Test that verifies validation when editing an asset with associated categories
       */
      it('is validated', function(callback) {
        var instructor = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor, function(client1, course, instructor) {
          CategoriesTestUtil.assertCreateCategory(client1, course, 'Category 1', function(category) {

            TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
              AssetsTestUtil.assertCreateLink(client2, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

                // Invalid category id
                var opts = {'categories': 'Not a number'};
                AssetsTestUtil.assertEditAssetFails(client2, course, asset.id, 'UC Davis', opts, 400, function() {
                  opts = {'categories': -1};
                  AssetsTestUtil.assertEditAssetFails(client2, course, asset.id, 'UC Davis', opts, 404, function() {
                    opts = {'categories': 234234233};
                    AssetsTestUtil.assertEditAssetFails(client2, course, asset.id, 'UC Davis', opts, 404, function() {

                      // Invalid category id mixed in with valid category id
                      opts = {'categories': [category.id, 'Not a number']};
                      AssetsTestUtil.assertEditAssetFails(client2, course, asset.id, 'UC Davis', opts, 400, function() {
                        opts = {'categories': [category.id, -1]};
                        AssetsTestUtil.assertEditAssetFails(client2, course, asset.id, 'UC Davis', opts, 404, function() {
                          opts = {'categories': [category.id, 234234233]};
                          AssetsTestUtil.assertEditAssetFails(client2, course, asset.id, 'UC Davis', opts, 404, function() {

                            // Duplicate category id
                            opts = {'categories': [category.id, category.id]};
                            AssetsTestUtil.assertEditAssetFails(client2, course, asset.id, 'UC Davis', opts, 400, function() {

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
       * Test that verifies authorization when editing an asset with associated categories
       */
      it('verifies authorization', function(callback) {
        var instructor1 = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructor1, function(client1, course1, instructor1) {
          CategoriesTestUtil.assertCreateCategory(client1, course1, 'Category 1', function(category) {

            // Verify that a category in a different course can not be used
            TestsUtil.getAssetLibraryClient(null, null, null, function(client2, course2, user2) {
              AssetsTestUtil.assertCreateLink(client2, course2, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

                var opts = {'categories': category.id};
                AssetsTestUtil.assertEditAssetFails(client2, course2, asset.id, 'UC Davis', opts, 404, function() {

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
