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

/**
 * Assert that a category has all expected properties
 *
 * @param  {Category}           category                      The category to assert the properties for
 * @param  {Object}             [opts]                        Optional parameters to verify the category with
 * @param  {Category}           [opts.expectedCategory]       The category to which the provided category should be compared
 * @param  {Boolean}            [opts.expectAssetCount]       Whether the number of assets associated to the category are expected to be included
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 */
var assertCategory = module.exports.assertCategory = function(category, opts) {
  opts = opts || {};

  // Ensure that all expected properties are present
  assert.ok(category);
  assert.ok(category.id);
  assert.ok(category.course_id);
  assert.ok(category.title);
  assert.ok(_.isBoolean(category.visible));
  assert.ok(category.created_at);
  assert.ok(category.updated_at);

  if (category.canvas_assignment_id) {
    assert.ok(_.isFinite(category.canvas_assignment_id));
  }

  if (opts.expectAssetCount) {
    assert.ok(_.isFinite(category.asset_count));
  }

  // Ensure that all the category properties are the same as the ones for
  // the expected category
  if (opts.expectedCategory) {
    assert.strictEqual(category.id, opts.expectedCategory.id);
    assert.strictEqual(category.course_id, opts.expectedCategory.course_id);
    assert.strictEqual(category.title, opts.expectedCategory.title);
    assert.strictEqual(category.visible, opts.expectedCategory.visible);
    assert.strictEqual(category.created_at, opts.expectedCategory.created_at);
    assert.strictEqual(category.updated_at, opts.expectedCategory.updated_at);

    if (opts.expectAssetCount) {
      assert.strictEqual(category.asset_count, opts.expectedCategory.asset_count);
    }

    // Ensure that all optional properties are the same as the ones for the
    // expected category
    if (category.canvas_assignment_id || opts.expectedCategory.canvas_assignment_id) {
      assert.strictEqual(category.canvas_assignment_id, opts.expectedCategory.canvas_assignment_id);
    }
  }
};

/**
 * Assert that a new category can be created
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {String}             title                           The name of the category
 * @param  {Function}           callback                        Standard callback function
 * @param  {Asset}              callback.asset                  The created category
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertCreateCategory = module.exports.assertCreateCategory = function(client, course, title, callback) {
  client.categories.createCategory(course, title, function(err, category) {
    assert.ifError(err);
    assert.ok(category);
    assertCategory(category, {'expectAssetCount': true});
    assert.strictEqual(category.title, title);
    assert.ok(!category.canvas_assignment_id);

    return callback(category);
  });
};

/**
 * Assert that a new category can not be created
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {String}             title                           The name of the category
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @param  {Asset}              callback.asset                  The created category
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertCreateCategoryFails = module.exports.assertCreateCategoryFails = function(client, course, title, code, callback) {
  client.categories.createCategory(course, title, function(err, category) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!category);

    return callback();
  });
};

/**
 * Assert that the categories for a course can be retrieved
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Boolean}            includeInvisible                Whether the invisible categories should be included
 * @param  {Number}             expectedTotal                   The expected total number of categories in the current course
 * @param  {Function}           callback                        Standard callback function
 * @param  {Category[]}         callback.categories             The categories in the current course
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertGetCategories = module.exports.assertGetCategories = function(client, course, includeInvisible, expectedTotal, callback) {
  client.categories.getCategories(course, includeInvisible, function(err, categories) {
    assert.ifError(err);
    assert.ok(categories);
    assert.strictEqual(categories.length, expectedTotal);
    _.each(categories, function(category) {
      assertCategory(category, {'expectAssetCount': true});
      if (!includeInvisible) {
        assert.strictEqual(category.visible, true);
      }
    });

    return callback(categories);
  });
};

/**
 * Assert that the categories for a course can not be retrieved
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Boolean}            includeInvisible                Whether the invisible categories should be included
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @param  {Category[]}         callback.categories             The categories in the current course
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertGetCategoriesFails = module.exports.assertGetCategoriesFails = function(client, course, includeInvisible, code, callback) {
  client.categories.getCategories(course, includeInvisible, function(err, categories) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!categories);

    return callback();
  });
};

/**
 * Assert that a category can be edited
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the category that is being edited
 * @param  {String}             title                           The updated category name
 * @param  {Boolean}            category                        Whether assets associated to this category will be visible in the Asset Library
 * @param  {Function}           callback                        Standard callback function
 * @param  {Category}           callback.category               The updated category
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertEditCategory = module.exports.assertEditCategory = function(client, course, id, title, visible, callback) {
  client.categories.editCategory(course, id, title, visible, function(err, category) {
    assert.ifError(err);
    assert.ok(category);
    assertCategory(category, {'expectAssetCount': true});
    assert.strictEqual(category.id, id);
    assert.strictEqual(category.title, title);
    assert.strictEqual(category.visible, visible);

    return callback(category);
  });
};

/**
 * Assert that a category can not be edited
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the category that is being edited
 * @param  {String}             title                           The updated category name
 * @param  {Boolean}            category                        Whether assets associated to this category will be visible in the Asset Library
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertEditCategoryFails = module.exports.assertEditCategoryFails = function(client, course, id, title, visible, code, callback) {
  client.categories.editCategory(course, id, title, visible, function(err, category) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!category);

    return callback();
  });
};

/**
 * Assert that a category can be deleted
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the category that is being deleted
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertDeleteCategory = module.exports.assertDeleteCategory = function(client, course, id, callback) {
  client.categories.deleteCategory(course, id, function(err) {
    assert.ifError(err);

    // Verify that the category no longer exists
    client.categories.getCategories(course, true, function(err, categories) {
      assert.ifError(err);
      assert.ok(categories);
      assert.ok(!_.find(categories, {'id': id}));

      return callback();
    });
  });
};

/**
 * Assert that a category can not be deleted
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the category that is being deleted
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertDeleteCategoryFails = module.exports.assertDeleteCategoryFails = function(client, course, id, code, callback) {
  client.categories.deleteCategory(course, id, function(err) {
    assert.ok(err);
    assert.strictEqual(err.code, code);

    return callback();
  });
};
