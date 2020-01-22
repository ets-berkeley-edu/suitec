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

var ActivitiesAPI = require('col-activities');
var ActivitiesUtil = require('col-activities/lib/util');
var AssetsTestUtil = require('./util');
var CategoriesTestUtil = require('col-categories/tests/util');
var DB = require('col-core/lib/db');
var TestsUtil = require('col-tests');
var UsersAPI = require('col-users');

describe('Search', function() {

  /**
   * Utility function that verifies that searching through the assets returns the expected assets
   *
   * @param  {RestClient}         client                    The REST client to make the request with
   * @param  {Course}             course                    The Canvas course in which the user is interacting with the API
   * @param  {Object}             [filters]                 A set of options to filter the results by
   * @param  {String}             [filters.keywords]        A string to filter the assets by
   * @param  {Number}             [filters.category]        The id of the category to filter the assets by
   * @param  {Number}             [filters.user]            The id of the user who created the assets
   * @param  {String}             [filters.section]         The name of the section in which owners of the assets are enrolled
   * @param  {Number}             [filters.type]            The type of assets. One of `CollabosphereConstants.ASSET.ASSET_TYPES`
   * @param  {Boolean}            [filters.hasComments]     If true then exclude zero comment_count; if false then zero comment_count only; if null do nothing
   * @param  {Boolean}            [filters.hasImpact]       If true then exclude zero impact; if false then zero impact only; if null do nothing
   * @param  {Boolean}            [filters.hasLikes]        If true then exclude zero likes; if false then zero likes only; if null do nothing
   * @param  {Boolean}            [filters.hasPins]         If true then exclude assets with zero pins; if false then zero pins only; if null do nothing
   * @param  {Boolean}            [filters.hasTrending]     If true then exclude zero trending score; if false then zero trending score only; if null do nothing
   * @param  {Boolean}            [filters.hasViews]        If true then exclude zero views; if false then zero views only; if null do nothing
   * @param  {Asset[]}            expectedAssets            The expected assets
   * @param  {Function}           callback                  Standard callback function
   * @throws {AssertionError}                               Error thrown when an assertion failed
   * @api private
   */
  var verifySearch = function(client, course, filters, expectedAssets, callback) {
    AssetsTestUtil.assertGetAssets(client, course, filters, null, null, null, expectedAssets.length, function(assets) {
      expectedAssets = _.sortBy(expectedAssets, 'id').reverse();

      // We allow timestamp discrepancies; the alternative is to re-getAsset when, for example, comments are made on expectedAssets.
      AssetsTestUtil.assertAssets(assets, expectedAssets, expectedAssets.length, {'allowTimestampDiscrepancy': true});

      return callback();
    });
  };

  /**
   * Get course by Canvas course id
   *
   * @param  {Number}           canvasCourseId          The id of the course in Canvas
   * @param  {Function}         callback                Invoked when the course has been retrieved
   * @param  {Course}           callback.course         The retrieved course object
   * @throws {AssertionError}                           Error thrown when an assertion failed
   */
  var getCourse = function(canvasCourseId, callback) {
    var options = {
      'where': {
        'canvas_course_id': canvasCourseId
      },
      'include': [{
        'model': DB.Canvas,
        'as': 'canvas'
      }]
    };
    DB.Course.findOne(options).complete(function(err, course) {
      assert.ifError(err);
      assert.ok(course);

      return callback(course);
    });
  };

  /**
   * Get user from database via Canvas user data
   *
   * @param  {User}             canvasUser              The user of the course
   * @param  {Course}           course                  The course in Canvas
   * @param  {String[]}         sections                The sections of the course in which user is enrolled
   * @param  {Function}         callback                Invoked when the user has been retrieved
   * @param  {User}             callback.user           The retrieved user object
   * @throws {AssertionError}                           Error thrown when an assertion failed
   */
  var findUser = function(canvasUser, course, sections, callback) {
    var options = {
      'where': {
        'canvas_user_id': canvasUser.id
      }
    };
    DB.User.findOne(options).complete(function(err, user) {
      assert.ifError(err);

      var profile = {
        'canvas_course_role': canvasUser.roles,
        'canvas_full_name': canvasUser.fullName,
        'canvas_course_sections': sections
      };
      UsersAPI.getOrCreateUser(canvasUser.id, course, profile, function(err, user) {
        assert.ifError(err);

        callback(user);
      });
    });
  };

  /**
   * Utility function that verifies that assets are returned in the expected sort order
   *
   * @param  {RestClient}         client                    The REST client to make the request with
   * @param  {Course}             course                    The Canvas course in which the user is interacting with the API
   * @param  {Object}             [filters]                 A set of options to filter the results by
   * @param  {String}             [filters.keywords]        A string to filter the assets by
   * @param  {Number}             [filters.category]        The id of the category to filter the assets by
   * @param  {Number}             [filters.user]            The id of the user who created the assets
   * @param  {Number}             [filters.type]            The type of assets. One of `CollabosphereConstants.ASSET.ASSET_TYPES`
   * @param  {String}             sort                      A criterion to sort by
   * @param  {Asset[]}            expectedAssets            The expected assets
   * @param  {Function}           callback                  Standard callback function
   * @throws {AssertionError}                               Error thrown when an assertion failed
   * @api private
   */
  var verifySort = function(client, course, filters, sort, expectedAssets, callback) {
    AssetsTestUtil.assertGetAssets(client, course, filters, sort, null, null, expectedAssets.length, function(assets) {
      // Impact scores applied after asset retrieval may have changed the updated_at timestamp.
      AssetsTestUtil.assertAssets(assets, expectedAssets, expectedAssets.length, {'allowTimestampDiscrepancy': true});

      return callback();
    });
  };

  describe('Assets', function() {
    /**
     * Test that verifies that the assets in a course can be retrieved
     */
    it('can be retrieved', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course, user1) {
        // Retrieve the empty course asset list
        AssetsTestUtil.assertGetAssets(client1, course, null, null, null, null, 0, function(assets) {

          // Add a link and verify that is returned as part of the course asset list
          AssetsTestUtil.assertCreateLink(client1, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset1) {
            AssetsTestUtil.assertGetAssets(client1, course, null, null, null, null, 1, function(assets) {
              AssetsTestUtil.assertAsset(assets.results[0], {'expectedAsset': asset1});

              // Add another link as a second user and verify that is also returned as part of the course asset list
              TestsUtil.getAssetLibraryClient(null, course, null, function(client2, course, user2) {
                AssetsTestUtil.assertCreateLink(client2, course, 'UC Berkeley', 'http://www.berkeley.edu/', null, function(asset2) {
                  AssetsTestUtil.assertGetAssets(client2, course, null, null, null, null, 2, function(assets) {
                    // The results are expected to return in descending creation date order
                    AssetsTestUtil.assertAsset(assets.results[0], {'expectedAsset': asset2});
                    AssetsTestUtil.assertAsset(assets.results[1], {'expectedAsset': asset1});

                    // Add a file and verify that it is returned as part of the course asset list
                    var opts = {
                      'description': 'University of California, Berkeley logo',
                      'source': 'http://www.universityofcalifornia.edu/uc-system'
                    };
                    AssetsTestUtil.assertCreateFile(client2, course, 'UC Berkeley', AssetsTestUtil.getFileStream('logo-ucberkeley.png'), opts, function(asset3) {
                      AssetsTestUtil.assertGetAssets(client2, course, null, null, null, null, 3, function(assets) {
                        // The results are expected to return in descending creation date order
                        AssetsTestUtil.assertAsset(assets.results[0], {'expectedAsset': asset3});
                        AssetsTestUtil.assertAsset(assets.results[1], {'expectedAsset': asset2});
                        AssetsTestUtil.assertAsset(assets.results[2], {'expectedAsset': asset1});

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
     * Test that verifies that the assets in a course can be paged
     */
    it('can be paged', function(callback) {
      // Generate a number of test assets for a course
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
        TestsUtil.generateTestAssets(client, course, 12, function(assets) {

          // The results are expected to return in descending creation date order
          assets = _.sortBy(assets, 'id').reverse();

          // Verify that the page size defaults to 10 and the page defaults to the first page
          AssetsTestUtil.assertGetAssets(client, course, null, null, null, null, 12, function(pagedAssets) {
            AssetsTestUtil.assertAssets(pagedAssets, _.slice(assets, 0, 10), 12);

            // Verify that the second page can be retrieved
            AssetsTestUtil.assertGetAssets(client, course, null, null, null, 10, 12, function(pagedAssets) {
              AssetsTestUtil.assertAssets(pagedAssets, _.slice(assets, 10, 12), 12);

              // Verify that a custom page size can be specified
              AssetsTestUtil.assertGetAssets(client, course, null, null, 5, null, 12, function(pagedAssets) {
                AssetsTestUtil.assertAssets(pagedAssets, _.slice(assets, 0, 5), 12);
                // Get the second page using the custom page size
                AssetsTestUtil.assertGetAssets(client, course, null, null, 5, 5, 12, function(pagedAssets) {
                AssetsTestUtil.assertAssets(pagedAssets, _.slice(assets, 5, 10), 12);
                  // Get the last page using the custom page size
                  AssetsTestUtil.assertGetAssets(client, course, null, null, 5, 10, 12, function(pagedAssets) {
                    AssetsTestUtil.assertAssets(pagedAssets, _.slice(assets, 10, 12), 12);
                    // Verify that further pages will be empty
                    AssetsTestUtil.assertGetAssets(client, course, null, null, 5, 15, 12, function(pagedAssets) {
                      AssetsTestUtil.assertAssets(pagedAssets, [], 12);

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
     * Verify that assets can be filtered by pinned status
     */
    it('can filter by pinned assets', function(callback) {
      AssetsTestUtil.setupPinnedAssets(function(client1, client2, course, user1, user2, assets1, assets2, pinnedBy1, pinnedBy2) {

        // We expect all assets pinned by user1
        verifySearch(client1, course, {'hasPins': true}, pinnedBy1, function() {

          // Get user1 id for pin lookup
          DB.User.findOne({'where': {'canvas_user_id': user1.id}}).complete(function(err, dbUser1) {
            assert.ifError(err);

            // We expect all assets pinned by user1 ordered by pin.created_at (descending)
            AssetsTestUtil.assertGetAssets(client1, course, {'hasPins': true}, 'pins', null, null, pinnedBy1.length, function(assets) {
              // Verify that we order by the `created_at` date of user1 pins
              var previous = null;
              _.each(assets.results, function(asset, index) {
                var pin = _.find(asset.pins, function(p) { return p.user_id === dbUser1.id; });
                assert.ok(pin);

                var pinCreatedAt = new Date(pin.created_at).getTime();

                // First element in the list gets a pass
                assert.ok(index === 0 || previous > pinCreatedAt);
                previous = pinCreatedAt;
              });

              // Get course id and user2 id from db (needed by search filter)
              getCourse(course.id, function(dbCourse) {

                DB.User.findOne({'where': {'canvas_user_id': user2.id}}).complete(function(err, dbUser2) {
                  assert.ifError(err);

                  // user1 wants to see what user2 has pinned
                  verifySearch(client1, course, {'user': dbUser2.id, 'hasPins': true}, pinnedBy2, function() {

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
     * Test that verifies that the assets in a course can be sorted
     */
    it('can be sorted', function(callback) {
      AssetsTestUtil.setupImpactfulAssets(function(assets, client1, client2, client3, client4, course, user1, user2, user3, user4) {
        // Verify that sorting by 'recent' returns two pages of assets in reverse creation order
        AssetsTestUtil.assertGetAssets(client1, course, null, 'recent', null, null, 12, function(pagedAssets) {
          AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), 12);

          AssetsTestUtil.assertGetAssets(client1, course, null, 'recent', null, 10, 12, function(pagedAssets) {
            AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [10, 11]), 12);

            // Verify that sorting by 'likes' returns two pages of assets ordered by 1) like count, 2) creation time
            AssetsTestUtil.assertGetAssets(client1, course, null, 'likes', null, null, 12, function(pagedAssets) {
              AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [7, 8, 6, 9, 0, 1, 2, 3, 4, 5]), 12);

              AssetsTestUtil.assertGetAssets(client1, course, null, 'likes', null, 10, 12, function(pagedAssets) {
                AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [10, 11]), 12);

                // Verify that sorting by 'views' returns two pages of assets ordered by 1) view count, 2) creation time
                AssetsTestUtil.assertGetAssets(client1, course, null, 'views', null, null, 12, function(pagedAssets) {
                  AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [7, 8, 2, 1, 6, 9, 0, 3, 4, 5]), 12);

                  AssetsTestUtil.assertGetAssets(client1, course, null, 'views', null, 10, 12, function(pagedAssets) {
                    AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [10, 11]), 12);

                    // Verify that sorting by 'comments' returns two pages of assets ordered by 1) comment count, 2) creation time
                    AssetsTestUtil.assertGetAssets(client1, course, null, 'comments', null, null, 12, function(pagedAssets) {
                      AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [9, 10, 8, 11, 0, 1, 2, 3, 4, 5]), 12);

                      AssetsTestUtil.assertGetAssets(client1, course, null, 'comments', null, 10, 12, function(pagedAssets) {
                        AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [6, 7]), 12);

                        // Verify that sorting by 'impact' returns two pages of assets ordered by:
                        // - 1) weighted total of comments (6 pts), likes (3 pts), views (2 pts);
                        // - 2) creation time
                        AssetsTestUtil.assertGetAssets(client1, course, null, 'impact', null, null, 12, function(pagedAssets) {
                          AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [8, 9, 7, 10, 2, 6, 11, 3, 1, 0]), 12);

                          AssetsTestUtil.assertGetAssets(client1, course, null, 'impact', null, 10, 12, function(pagedAssets) {
                            AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [4, 5]), 12);

                            // Verify that before trending scores are calculated, a search for trending assets with hasTrending: true returns nothing
                            AssetsTestUtil.assertGetAssets(client1, course, {'hasTrending': true}, 'trending', null, null, 0, function(pagedAssets) {
                              assert.ok(_.isEmpty(pagedAssets.results));

                              // Verify that after trending scores are calculated, a search for trending assets returns the same results as sorting by impact
                              ActivitiesUtil.recalculateTrendingScores(null, function() {
                                AssetsTestUtil.assertGetAssets(client1, course, null, 'trending', null, null, 12, function(pagedAssets) {
                                  AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [8, 9, 7, 10, 2, 6, 11, 3, 1, 0]), 12, {'allowTimestampDiscrepancy': true});

                                  AssetsTestUtil.assertGetAssets(client1, course, null, 'trending', null, 10, 12, function(pagedAssets) {
                                    AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [4, 5]), 12, {'allowTimestampDiscrepancy': true});

                                    // Verify that a search for trending assets with hasTrending: true omits assets 3, 4, 5, which got no love
                                    AssetsTestUtil.assertGetAssets(client1, course, {'hasTrending': true}, 'trending', null, null, 10, function(pagedAssets) {
                                      AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [8, 9, 7, 10, 2, 6, 11, 3, 1, 0]), 10, {'allowTimestampDiscrepancy': true});

                                      // Verify that a search for assets with `hasPins: true` omits unpinned assets
                                      AssetsTestUtil.assertGetAssets(client1, course, {'hasPins': true}, 'recent', null, null, 1, function(pagedAssets) {
                                        AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, [1]), 1, {'allowTimestampDiscrepancy': true});

                                        AssetsTestUtil.assertUnpinAsset(client2, course, assets[2].id, function(asset) {
                                          AssetsTestUtil.assertGetAssets(client2, course, {'hasPins': true}, 'recent', null, null, 0, function(pagedAssets) {
                                            AssetsTestUtil.assertAssets(pagedAssets, _.at(assets, []), 0, {'allowTimestampDiscrepancy': true});

                                            // Verify that a search for assets with `hasPins: false` omits pinned assets
                                            AssetsTestUtil.assertGetAssets(client1, course,  {'hasPins': false}, 'recent', null, null, 11, function(notPinnedAssets) {
                                              AssetsTestUtil.assertAssets(notPinnedAssets, _.at(notPinnedAssets, [0, 2, 4, 5, 6, 7, 8, 9, 10, 11]), 11, {'allowTimestampDiscrepancy': true});

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
        });
      });
    });

    /**
     * Test that verifies validation when getting the assets
     */
    it('is validated', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {

        // Invalid asset type
        AssetsTestUtil.assertGetAssetsFails(client, course, {'types': 'invalid'}, null, null, null, 400, function() {
          AssetsTestUtil.assertGetAssetsFails(client, course, {'types': 42}, null, null, null, 400, function() {
            AssetsTestUtil.assertGetAssetsFails(client, course, {'types': ['invalid']}, null, null, null, 400, function() {
              AssetsTestUtil.assertGetAssetsFails(client, course, {'types': [42]}, null, null, null, 400, function() {
                AssetsTestUtil.assertGetAssetsFails(client, course, null, 'bogus', null, null, 400, function() {

                  return callback();
                });
              });
            });
          });
        });
      });
    });

    /**
     * Set up a few categories in a course
     *
     * @param  {CanvasCourse}   course                  The course in which the categories should be created
     * @param  {Function}       callback                Standard callback function
     * @param  {Category}       callback.category1      The first category
     * @param  {Category}       callback.category2      The second category
     * @throws {AssertionError}                         Error thrown when an assertion failed
     * @api private
     */
    var setupCategories = function(course, callback) {
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, course, instructor, function(client, course, instructor) {
        CategoriesTestUtil.assertCreateCategory(client, course, 'Category 1', function(category1) {
          CategoriesTestUtil.assertCreateCategory(client, course, 'Category 2', function(category2) {
            return callback(category1, category2);
          });
        });
      });
    };

    /**
     * Enroll user in section(s)
     *
     * @param  {CanvasCourse}   course                  The course in which sections belong
     * @param  {User}           canvasUser              The user in Canvas
     * @param  {String[]}       sections                Sections of course
     * @param  {Function}       callback                Standard callback function
     * @param  {Category}       callback.user           Updated user
     * @api private
     */
    var setUpSectionStudent = function(course, canvasUser, sections, callback) {
      TestsUtil.getAssetLibraryClient(null, course, canvasUser, function(client, course, canvasUser) {
        var canvasCourseId = course.id;

        getCourse(canvasCourseId, function(course) {
          findUser(canvasUser, course, sections, function(user) {
            callback(user);
          });
        });
      });
    };

    /**
     * Create a few assets in a course
     *
     * @param  {CanvasCourse}   course                      The course in which the categories should be created
     * @param  {User}           user                        The user in Canvas. Defaults to a new user in the `ucberkeley` Canvas instance
     * @param  {Category}       category1                   The first category
     * @param  {Category}       category2                   The second category
     * @param  {Function}       callback                    Standard callback function
     * @param  {Asset}          callback.berkeleyAsset      A link asset in the first category
     * @param  {Asset}          callback.davisAsset         A link asset in the second category
     * @param  {Asset}          callback.uclaAsset          A link asset in the first and second category
     * @param  {Asset}          callback.logoAsset          A file asset
     * @throws {AssertionError}                             Error thrown when an assertion failed
     * @api private
     */
    var setupAssets = function(course, user, category1, category2, callback) {
      TestsUtil.getAssetLibraryClient(null, course, user, function(client, course, user) {
        // Create a few assets with lots of metadata
        var opts = {
          'categories': [category1.id],
          'description': 'University of California, Berkeley homepage, #ucberk',
          'source': 'http://www.universityofcalifornia.edu/uc-system',
          'comment': 'Life is what happens to you while you are busy making an Impact'
        };
        AssetsTestUtil.assertCreateLink(client, course, 'UC Berkeley', 'http://www.berkeley.edu/', opts, function(berkeleyAsset) {
          CategoriesTestUtil.assertCategory(berkeleyAsset.categories[0], {'expectedCategory': category1});

          opts = {
            'categories': [category2.id],
            'description': 'University of California, Davis homepage, #ucdav',
            'source': 'http://www.universityofcalifornia.edu/uc-system'
          };
          AssetsTestUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', opts, function(davisAsset) {
            CategoriesTestUtil.assertCategory(davisAsset.categories[0], {'expectedCategory': category2});

            opts = {
              'categories': [category1.id, category2.id],
              'description': 'University of California, Los Angeles homepage, #ucla',
              'source': 'http://www.universityofcalifornia.edu/uc-system',
              'comment': 'It\'s better to burn out than to have no Impact'
            };
            AssetsTestUtil.assertCreateLink(client, course, 'UC Los Angeles', 'http://www.ucla.edu/', opts, function(uclaAsset) {
              CategoriesTestUtil.assertCategory(uclaAsset.categories[0], {'expectedCategory': category1});
              CategoriesTestUtil.assertCategory(uclaAsset.categories[1], {'expectedCategory': category2});

              var opts = {
                'description': 'University of California, Berkeley logo, #ucberk',
                'source': 'http://www.universityofcalifornia.edu/uc-system'
              };
              AssetsTestUtil.assertCreateFile(client, course, 'UC Berkeley', AssetsTestUtil.getFileStream('logo-ucberkeley.png'), opts, function(logoAsset) {

                return callback(client, user, berkeleyAsset, davisAsset, uclaAsset, logoAsset);
              });
            });
          });
        });
      });
    };

    /**
     * Test that verifies that assets can be searched through
     */
    it('can be searched through', function(callback) {
      var canvasCourse = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
      var canvasUser1 = TestsUtil.generateUser(global.tests.canvas.ucberkeley);
      var canvasUser2 = TestsUtil.generateUser(global.tests.canvas.ucberkeley);

      setupCategories(canvasCourse, function(category1, category2) {
        setUpSectionStudent(canvasCourse, canvasUser1, ['Section 001'], function(user1) {
          assert.ok(user1.canvas_course_sections);

          setupAssets(canvasCourse, canvasUser1, category1, category2, function(client, canvasUser1, berkeleyAsset1, davisAsset1, uclaAsset1, logoAsset1) {
            setUpSectionStudent(canvasCourse, canvasUser2, ['Section 002'], function(user2) {
              assert.ok(user2.canvas_course_sections);

              setupAssets(canvasCourse, canvasUser2, category1, category2, function(client, canvasUser2, berkeleyAsset2, davisAsset2, uclaAsset2, logoAsset2) {

                // All assets should be returned when no filters are specified
                var allAssets = [berkeleyAsset1, davisAsset1, uclaAsset1, logoAsset1, berkeleyAsset2, davisAsset2, uclaAsset2, logoAsset2];
                verifySearch(client, canvasCourse, null, allAssets, function() {

                  // Simple searches
                  verifySearch(client, canvasCourse, {'keywords': 'Los'}, [uclaAsset1, uclaAsset2], function() {
                    verifySearch(client, canvasCourse, {'keywords': 'Los Angeles'}, [uclaAsset1, uclaAsset2], function() {
                      verifySearch(client, canvasCourse, {'keywords': 'This totally does not match anything'}, [], function() {
                        verifySearch(client, canvasCourse, {'keywords': 'university Angeles'}, [uclaAsset1, uclaAsset2], function() {
                          verifySearch(client, canvasCourse, {'keywords': 'Uni ang'}, [uclaAsset1, uclaAsset2], function() {
                            verifySearch(client, canvasCourse, {'keywords': 'erkel'}, [berkeleyAsset1, berkeleyAsset2, logoAsset1, logoAsset2], function() {
                              verifySearch(client, canvasCourse, {'category': category1.id}, [berkeleyAsset1, berkeleyAsset2, uclaAsset1, uclaAsset2], function() {
                                verifySearch(client, canvasCourse, {'types': ['file']}, [logoAsset1, logoAsset2], function() {
                                  verifySearch(client, canvasCourse, {'types': ['file', 'link']}, [logoAsset1, logoAsset2, berkeleyAsset1, berkeleyAsset2, davisAsset1, davisAsset2, uclaAsset1, uclaAsset2], function() {
                                    verifySearch(client, canvasCourse, {'user': user1.id}, [berkeleyAsset1, davisAsset1, uclaAsset1, logoAsset1], function() {
                                      verifySearch(client, canvasCourse, {'section': user1.canvas_course_sections[0]}, [berkeleyAsset1, davisAsset1, uclaAsset1, logoAsset1], function() {

                                        // Permutations of 2 options
                                        verifySearch(client, canvasCourse, {'keywords': 'Los Angeles', 'category': category1.id}, [uclaAsset1, uclaAsset2], function() {
                                          verifySearch(client, canvasCourse, {'keywords': 'Los Angeles', 'types': ['file']}, [], function() {
                                            verifySearch(client, canvasCourse, {'keywords': 'Los Angeles', 'user': user2.id}, [uclaAsset2], function() {
                                              verifySearch(client, canvasCourse, {'category': category1.id, 'types': ['file']}, [], function() {
                                                verifySearch(client, canvasCourse, {'category': category1.id, 'user': user1.id}, [berkeleyAsset1, uclaAsset1], function() {
                                                  verifySearch(client, canvasCourse, {'types': ['file'], 'user': user1.id}, [logoAsset1], function() {
                                                    verifySearch(client, canvasCourse, {'types': ['file', 'link'], 'user': user1.id}, [logoAsset1, berkeleyAsset1, davisAsset1, uclaAsset1], function() {
                                                      verifySearch(client, canvasCourse, {'section': user1.canvas_course_sections[0], 'types': ['file']}, [logoAsset1], function() {

                                                        // Permutations of 3 options
                                                        verifySearch(client, canvasCourse, {'keywords': 'Los Angeles', 'category': category1.id, 'types': ['file']}, [], function() {
                                                          verifySearch(client, canvasCourse, {'keywords': 'Los Angeles', 'category': category1.id, 'user': user1.id}, [uclaAsset1], function() {
                                                            verifySearch(client, canvasCourse, {'keywords': 'Los Angeles', 'types': ['file'], 'user': user2.id}, [], function() {
                                                              verifySearch(client, canvasCourse, {'category': category1.id, 'types': ['link'], 'user': user2.id}, [berkeleyAsset2, uclaAsset2], function() {
                                                                verifySearch(client, canvasCourse, {'category': category1.id, 'types': ['link', 'file'], 'user': user2.id}, [berkeleyAsset2, uclaAsset2], function() {
                                                                  verifySearch(client, canvasCourse, {'category': category1.id, 'section': user2.canvas_course_sections[0], 'types': ['link']}, [berkeleyAsset2, uclaAsset2], function() {

                                                                    // Permutations of 4 options
                                                                    verifySearch(client, canvasCourse, {'category': category1.id, 'section': user1.canvas_course_sections[0], 'user': user2.id, 'types': ['link']}, [], function() {

                                                                      // Create a like and comment, and get updated asset data
                                                                      AssetsTestUtil.assertLike(client, canvasCourse, uclaAsset1.id, true, function() {
                                                                        AssetsTestUtil.assertCreateComment(client, canvasCourse, berkeleyAsset1.id, 'Comment', null, function() {
                                                                          AssetsTestUtil.assertGetAsset(client, canvasCourse, uclaAsset1.id, null, null, function(uclaAsset1) {
                                                                            AssetsTestUtil.assertGetAsset(client, canvasCourse, berkeleyAsset1.id, null, null, function(berkeleyAsset1) {
                                                                              // Verify that sorting works in conjunction with search filters
                                                                              verifySort(client, canvasCourse, {'category': category1.id, 'user': user1.id}, 'likes', [uclaAsset1, berkeleyAsset1], function() {
                                                                                verifySort(client, canvasCourse, {'category': category1.id, 'user': user1.id}, 'comments', [berkeleyAsset1, uclaAsset1], function() {

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
        });
      });
    });

    /**
     * Test that verifies that the search query searches through ALL assets and not the first ten
     * as this is a common Sequelize mistake
     */
    it('can search through many assets', function(callback) {
      // Create a couple of assets that we will eventually search for
      var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
      var canvasUser = TestsUtil.generateUser(global.tests.canvas.ucberkeley);

      setupCategories(course, function(category1, category2) {
        setUpSectionStudent(course, canvasUser, ['Section 001'], function(user1) {
          setupAssets(course, canvasUser, category1, category2, function(client, canvasUser, berkeleyAsset1, davisAsset1, uclaAsset1, logoAsset1) {

            // Now create a bunch of irrelevant assets
            setupCategories(course, function(category3, category4) {
              setupAssets(course, null, category3, category4, function(client, user2, berkeleyAsset3, davisAsset3, uclaAsset3, logoAsset3) {
                setupAssets(course, null, category3, category4, function(client, user3, berkeleyAsset4, davisAsset4, uclaAsset4, logoAsset4) {
                  setupAssets(course, null, category3, category4, function(client, user4, berkeleyAsset5, davisAsset5, uclaAsset5, logoAsset5) {

                    // Search for the first assets
                    verifySearch(client, course, {'keywords': 'Los Angeles', 'category': category1.id}, [uclaAsset1], function() {
                      verifySearch(client, course, {'user': user1.id}, [berkeleyAsset1, davisAsset1, uclaAsset1, logoAsset1], function() {
                        verifySearch(client, course, {'user': user1.id, 'types': 'link'}, [berkeleyAsset1, davisAsset1, uclaAsset1], function() {

                          // Test inclusion with respect to comment_count
                          verifySearch(client, course, {'user': user1.id, 'hasComments': true}, [berkeleyAsset1, uclaAsset1], function() {
                            verifySearch(client, course, {'user': user1.id, 'hasComments': false}, [davisAsset1, logoAsset1], function() {
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

    /**
     * Test that verifies that hashtags can be searched for
     */
    it('can search for hashtags', function(callback) {
      // Create a couple of assets that we will search for
      var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
      TestsUtil.getAssetLibraryClient(null, course, null, function(client, course, user) {
        setupCategories(course, function(category1, category2) {
          setupAssets(course, user, category1, category2, function(client, user, berkeleyAsset, davisAsset, uclaAsset, logoAsset) {

            // Verify that including the pound sign doesn't influence the hashtag search results
            verifySearch(client, course, {'keywords': 'ucla'}, [uclaAsset], function() {
              verifySearch(client, course, {'keywords': '#ucla'}, [uclaAsset], function() {
                return callback();
              });
            });
          });
        });
      });
    });

  });

  describe('Hidden assets', function() {
    /**
     * Test that verifies that hidden files are not included when searching
     */
    it('can not search hidden assets', function(callback) {
      TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {

        // Create a visible UC Berkeley file asset
        AssetsTestUtil.assertCreateFile(client, course, 'UC Berkeley File Visible', AssetsTestUtil.getFileStream('logo-ucberkeley.png'), null, function(visibleBerkeleyFile) {
          // Create a visible UC Berkeley link asset
          AssetsTestUtil.assertCreateLink(client, course, 'UC Berkeley Link Visible', 'http://www.berkeley.edu/', null, function(visibleBerkeleyLink) {
            // Create a visible UC Davis asset
            AssetsTestUtil.assertCreateLink(client, course, 'UC Davis Link Visible', 'http://www.davis.edu/', null, function(visibleDavisLink) {
              // Create a hidden UC Berkeley file asset
              AssetsTestUtil.assertCreateFile(client, course, 'UC Berkeley File Hidden', AssetsTestUtil.getFileStream('logo-ucberkeley.png'), {'visible': false}, function(hiddenBerkeleyFile) {
                // Create a hidden UC Berkeley link asset
                AssetsTestUtil.assertCreateLink(client, course, 'UC Berkeley Link Hidden', 'http://www.berkeley.edu/', {'visible': false}, function(hiddenBerkeleyLink) {

                  // Verify that searching through the assets doesn't return hidden assets
                  verifySearch(client, course, {'keywords': 'berkeley'}, [visibleBerkeleyLink, visibleBerkeleyFile], function() {
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
