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
var randomstring = require('randomstring');

var AssetsTestUtil = require('col-assets/tests/util');
var TestsUtil = require('col-tests');
var UsersTestUtil = require('col-users/tests/util');

var CategoriesTestUtil = require('./util');

describe('Categories', function() {

  describe('Create new categories', function() {

    /**
     * Test that verifies that a new category can be created
     */
    it('can be created', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {

        CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category) {

          return callback();
        });
      });
    });

    /**
     * Test that verifies validation when creating a new category
     */
    it('is validated', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {

        // Missing title
        CategoriesTestUtil.assertCreateCategoryFails(client, course, null, 400, function() {
          CategoriesTestUtil.assertCreateCategoryFails(client, course, '', 400, function() {

            // Too long title
            CategoriesTestUtil.assertCreateCategoryFails(client, course, randomstring.generate(256), 400, function() {

              return callback();
            });
          });
        });
      });
    });

    /**
     * Test that verifies authorization when creating a new category
     */
    it('verifies authorization', function(callback) {
      // Verify that a new category can not be created by a non-administrator
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        CategoriesTestUtil.assertCreateCategoryFails(client, course, 'Category 1', 401, function() {

          return callback();
        });
      });
    });
  });

  describe('Get categories', function() {

    /**
     * Test that verifies that the categories in a course can be retrieved
     */
    it('can be retrieved', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
        // Retrieve the empty categories list
        CategoriesTestUtil.assertGetCategories(client1, course, false, 0, function(categories) {

          // Add a category and verify that is returned as part of the category list
          var instructor = TestsUtil.generateInstructor();
          TestsUtil.getAssetLibraryClient(null, course, instructor, function(client2, course, instructor) {
            CategoriesTestUtil.assertCreateCategory(client2, course, 'Category 1', function(category1) {
              CategoriesTestUtil.assertGetCategories(client1, course, false, 1, function(categories) {
                CategoriesTestUtil.assertCategory(categories[0], {'expectedCategory': category1, 'expectAssetCount': true});

                // Add another category and verify that it is also returned as part of the category list
                CategoriesTestUtil.assertCreateCategory(client2, course, 'Category 2', function(category2) {
                  CategoriesTestUtil.assertGetCategories(client1, course, false, 2, function(categories) {
                    CategoriesTestUtil.assertCategory(categories[0], {'expectedCategory': category1, 'expectAssetCount': true});
                    CategoriesTestUtil.assertCategory(categories[1], {'expectedCategory': category2, 'expectAssetCount': true});

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
     * Test that verifies that invisible categories are only returned when requested by an administrator
     */
    it('incorporates category visibility', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client1, course, instructor) {

        // Set up visible and invisible category
        CategoriesTestUtil.assertCreateCategory(client1, course, 'Visible Category', function(visibleCategory) {
          CategoriesTestUtil.assertCreateCategory(client1, course, 'Invisible Category', function(invisibleCategory) {
            CategoriesTestUtil.assertEditCategory(client1, course, invisibleCategory.id, 'Invisible Category', false, function(invisibleCategory) {

              // Verify that retrieving the categories as an admin only returns the invisible one when requested
              CategoriesTestUtil.assertGetCategories(client1, course, false, 1, function(categories) {
                CategoriesTestUtil.assertCategory(categories[0], {'expectedCategory': visibleCategory});

                CategoriesTestUtil.assertGetCategories(client1, course, true, 2, function(categories) {
                  CategoriesTestUtil.assertCategory(categories[0], {'expectedCategory': visibleCategory});
                  CategoriesTestUtil.assertCategory(categories[1], {'expectedCategory': invisibleCategory});

                  // Verify that retrieving the categories as a non-admin never returns the invisible categorie
                  TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user) {
                    CategoriesTestUtil.assertGetCategories(client2, course, false, 1, function(categories) {
                      CategoriesTestUtil.assertCategory(categories[0], {'expectedCategory': visibleCategory});

                      CategoriesTestUtil.assertGetCategories(client2, course, true, 1, function(categories) {
                        CategoriesTestUtil.assertCategory(categories[0], {'expectedCategory': visibleCategory});

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
     * Test that verifies that the correct number of assets associated to a category is returned
     */
    it('returns asset count', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client1, course, instructor) {
        CategoriesTestUtil.assertCreateCategory(client1, course, 'Category 1', function(category1) {
          CategoriesTestUtil.assertCreateCategory(client1, course, 'Category 2', function(category2) {

            // Verify that no assets are associated
            TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
              CategoriesTestUtil.assertGetCategories(client2, course, false, 2, function(categories) {
                assert.strictEqual(categories[0].asset_count, 0);

                // Associate an asset to the category and verify that the asset count is updated
                var opts = {'categories': category1.id};
                AssetsTestUtil.assertCreateLink(client2, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, function(asset) {
                  CategoriesTestUtil.assertGetCategories(client2, course, false, 2, function(categories) {
                    assert.strictEqual(categories[0].asset_count, 1);
                    assert.strictEqual(categories[1].asset_count, 0);

                    // Associate an asset to multiple category and verify that the asset count for both categories is updated
                    opts = {'categories': [category1.id, category2.id]};
                    AssetsTestUtil.assertCreateLink(client2, course, 'UC Berkeley', 'http://www.berkeley.edu/', opts, function(asset) {
                      CategoriesTestUtil.assertGetCategories(client2, course, false, 2, function(categories) {
                        assert.strictEqual(categories[0].asset_count, 2);
                        assert.strictEqual(categories[1].asset_count, 1);

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

  describe('Edit category', function() {

    /**
     * Test that verifies that a category can be edited
     */
    it('can be edited', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {
        CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category) {

          // Verify that the category title can be edited
          CategoriesTestUtil.assertEditCategory(client, course, category.id, 'Updated category 1', category.visible, function(category) {
            // Verify that the category visibility can be edited
            CategoriesTestUtil.assertEditCategory(client, course, category.id, category.title, false, function(category) {

              return callback();
            });
          });
        });
      });
    });

    /**
     * Test that verifies validation when editing a category
     */
    it('is validated', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {
        CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category) {

          // Invalid category id
          CategoriesTestUtil.assertEditCategoryFails(client, course, 'Not a number', 'Updated category 1', true, 400, function() {
            CategoriesTestUtil.assertEditCategoryFails(client, course, -1, 'Updated category 1', true, 404, function() {
              CategoriesTestUtil.assertEditCategoryFails(client, course, 234234233, 'Updated category 1', true, 404, function() {

                // Missing title
                CategoriesTestUtil.assertEditCategoryFails(client, course, category.id, null, category.visible, 400, function() {
                  CategoriesTestUtil.assertEditCategoryFails(client, course, category.id, '', category.visible, 400, function() {

                    // Too long title
                    CategoriesTestUtil.assertEditCategoryFails(client, course, category.id, randomstring.generate(256), category.visible, 400, function() {

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
     * Test that verifies authorization when editing a category
     */
    it('verifies authorization', function(callback) {
      var instructor1 = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor1, function(client1, course1, instructor1) {
        CategoriesTestUtil.assertCreateCategory(client1, course1, 'Category 1', function(category1) {

          // Verify that a category can not be edited by a non-administrator
          TestsUtil.getAssetLibraryClient(null, course1, null, function(client2, course1, user2) {
            CategoriesTestUtil.assertEditCategoryFails(client2, course1, category1.id, 'Updated category 1', category1.visible, 401, function() {

              // Verify that the category has not been updated
              CategoriesTestUtil.assertGetCategories(client2, course1, false, 1, function(categories) {
                CategoriesTestUtil.assertCategory(categories[0], {'expectedCategory': category1, 'expectAssetCount': true});

                // Verify that a category in a different course can not be updated
                var instructor2 = TestsUtil.generateInstructor();
                TestsUtil.getAssetLibraryClient(null, null, instructor2, function(client3, course2, instructor2) {
                  CategoriesTestUtil.assertCreateCategory(client3, course2, 'Category 2', function(category2) {
                    CategoriesTestUtil.assertEditCategoryFails(client1, course2, category2.id, 'Updated category 2', category2.visible, 401, function() {

                      // Verify that the category has not been updated
                      CategoriesTestUtil.assertGetCategories(client3, course2, false, 1, function(categories) {
                        CategoriesTestUtil.assertCategory(categories[0], {'expectedCategory': category2, 'expectAssetCount': true});

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

  describe('Delete category', function() {

    /**
     * Test that verifies that a category can be deleted
     */
    it('can be deleted', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {
        CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category) {

          // Verify that the category can be deleted
          CategoriesTestUtil.assertDeleteCategory(client, course, category.id, function() {

            return callback();
          });
        });
      });
    });

    /**
     * Test that verifies that categories can be deleted when associated to assets
     */
    it('can be deleted when associated to assets', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client1, course, instructor) {
        CategoriesTestUtil.assertCreateCategory(client1, course, 'Category 1', function(category1) {
          CategoriesTestUtil.assertCreateCategory(client1, course, 'Category 2', function(category2) {

            // Associate an asset to one of the categories
            TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
              var opts = {'categories': category1.id};
              AssetsTestUtil.assertCreateLink(client2, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, function(asset1) {
                CategoriesTestUtil.assertCategory(asset1.categories[0], {'expectedCategory': category1});

                // Associate an asset to both categories
                var opts = {'categories': [category1.id, category2.id]};
                AssetsTestUtil.assertCreateLink(client2, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, function(asset2) {
                  CategoriesTestUtil.assertCategory(asset2.categories[0], {'expectedCategory': category1});
                  CategoriesTestUtil.assertCategory(asset2.categories[1], {'expectedCategory': category2});

                  // Remove the category that's associated to both assets
                  CategoriesTestUtil.assertDeleteCategory(client1, course, category1.id, function() {
                    // Verify that the assets are no longer associated with the deleted category
                    AssetsTestUtil.assertGetAsset(client2, course, asset1.id, null, 0, function(asset) {
                      assert.strictEqual(asset.categories.length, 0);

                      AssetsTestUtil.assertGetAsset(client2, course, asset2.id, null, 0, function(asset) {
                        assert.strictEqual(asset.categories.length, 1);
                        CategoriesTestUtil.assertCategory(asset.categories[0], {'expectedCategory': category2});

                        // Remove the category that's associated to one asset
                        CategoriesTestUtil.assertDeleteCategory(client1, course, category2.id, function() {
                          // Verify that the asset is no longer associated with the deleted category
                          AssetsTestUtil.assertGetAsset(client2, course, asset2.id, null, 0, function(asset) {
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
      });
    });

    /**
     * Test that verifies validation when deleting a category
     */
    it('is validated', function(callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor, function(client, course, instructor) {
        CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category) {

          // Invalid category id
          CategoriesTestUtil.assertDeleteCategoryFails(client, course, 'Not a number', 400, function() {
            CategoriesTestUtil.assertDeleteCategoryFails(client, course, -1, 404, function() {
              CategoriesTestUtil.assertDeleteCategoryFails(client, course, 234234233, 404, function() {

                return callback();
              });
            });
          });
        });
      });
    });

    /**
     * Test that verifies authorization when deleting a category
     */
    it('verifies authorization', function(callback) {
      var instructor1 = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, null, instructor1, function(client1, course1, instructor1) {
        CategoriesTestUtil.assertCreateCategory(client1, course1, 'Category 1', function(category1) {

          // Verify that a category can not be deleted by a non-administrator
          TestsUtil.getAssetLibraryClient(null, course1, null, function(client2, course, user2) {
            CategoriesTestUtil.assertDeleteCategoryFails(client2, course1, category1.id, 401, function() {

              // Verify that the category has not been deleted
              CategoriesTestUtil.assertGetCategories(client2, course1, false, 1, function(categories) {
                CategoriesTestUtil.assertCategory(categories[0], {'expectedCategory': category1, 'expectAssetCount': true});

                // Verify that a category in a different course can not be updated
                var instructor2 = TestsUtil.generateInstructor();
                TestsUtil.getAssetLibraryClient(null, null, instructor2, function(client3, course2, instructor2) {
                  CategoriesTestUtil.assertCreateCategory(client3, course2, 'Category 2', function(category2) {
                    CategoriesTestUtil.assertDeleteCategoryFails(client1, course2, category2.id, 401, function() {

                      // Verify that the category has not been deleted
                      CategoriesTestUtil.assertGetCategories(client3, course2, false, 1, function(categories) {
                        CategoriesTestUtil.assertCategory(categories[0], {'expectedCategory': category2, 'expectAssetCount': true});

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
