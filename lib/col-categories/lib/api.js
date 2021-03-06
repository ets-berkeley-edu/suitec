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
var Joi = require('joi');

var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('col-categories');

/**
 * Get a category
 *
 * @param  {Context}        ctx                         Standard context containing the current user and the current course
 * @param  {Number}         id                          The id of the category that should be retrieved
 * @param  {Function}       callback                    Standard callback function
 * @param  {Object}         callback.err                An error that occurred, if any
 * @param  {Category}       callback.category           The retrieved category
 * @api private
 */
var getCategory = module.exports.getCategory = function(ctx, id, callback) {
  var options = {
    'where': {
      'course_id': ctx.course.id,
      'id': id
    }
  };

  DB.Category.findOne(options).complete(function(err, category) {
    if (err) {
      log.error({'err': err, 'id': id}, 'Failed to retrieve a category');
      return callback({'code': 500, 'msg': err.message});
    } else if (!category) {
      log.debug({'err': err, 'id': id}, 'The category could not be found');
      return callback({'code': 404, 'msg': 'The category could not be found'});
    }

    return callback(null, category);
  });
};

/**
 * Get the categories for the current course. By default, this will only include the visible categories
 *
 * @param  {Context}        ctx                         Standard context containing the current user and the current course
 * @param  {Boolean}        includeInvisible            Whether invisible categories should be included. Defaults to `false`
 * @param  {Boolean}        includeDeleted              Whether deleted categories should be included. Defaults to `false`
 * @param  {Function}       callback                    Standard callback function
 * @param  {Object}         callback.err                An error that occurred, if any
 * @param  {Category[]}     callback.categories         The categories in the current course
 */
var getCategories = module.exports.getCategories = function(ctx, includeInvisible, includeDeleted, callback) {
  includeInvisible = (includeInvisible === true) ? true : false;
  // Only administrators are allowed to list the invisible categories
  if (!ctx.user.is_admin) {
    includeInvisible = false;
  }

  // Get the categories from the DB. As we need to include the number of assets per category,
  // a raw query is used
  var sqlQuery = 'SELECT category.*, (SELECT COUNT(*)::int FROM assets_categories WHERE category_id = category.id) AS asset_count';
  sqlQuery +=    ' FROM categories AS category';
  sqlQuery +=    ' WHERE category.course_id = ?';
  if (!includeInvisible) {
    sqlQuery += ' AND category.visible = ?';
  }
  if (!includeDeleted) {
    sqlQuery += ' AND category.deleted_at is null';
  }
  sqlQuery +=    ' ORDER BY category.created_at ASC';
  var options = {
    'model': DB.Category,
    'replacements': [ctx.course.id, true],
    'type': 'SELECT'
  };
  DB.getSequelize().query(sqlQuery, options).complete(function(err, results) {
    if (err) {
      log.error({'err': err, 'course': ctx.course}, 'Failed to get the categories in the current course');
      return callback({'code': 500, 'msg': err.message});
    }

    return callback(null, results);
  });
};

/**
 * Get a set of categories by their id
 *
 * @param  {Context}        ctx                         Standard context containing the current user and the current course
 * @param  {Number[]}       ids                         The ids of the categories that should be retrieved
 * @param  {Function}       callback                    Standard callback function
 * @param  {Object}         callback.err                An error that occurred, if any
 * @param  {Category[]}     callback.categories         The retrieved categories
 */
var getCategoriesById = module.exports.getCategoriesById = function(ctx, ids, callback) {
  // Return immediately if no category ids have been provided
  if (_.isEmpty(ids)) {
    return callback(null, []);
  }

  // Parameter validation
  var validationSchema = Joi.object().keys({
    'ids': Joi.array().unique().items(Joi.number()).required()
  });

  var validationResult = Joi.validate({
    'ids': ids
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Get the categories from the DB
  var options = {
    'where': {
      'course_id': ctx.course.id,
      'id': ids
    }
  };

  DB.Category.findAll(options).complete(function(err, categories) {
    if (err) {
      log.error({'err': err, 'ids': ids}, 'Failed to get a set of categories');
      return callback({'code': 500, 'msg': err.message});
    } else if (categories.length !== ids.length) {
      log.error({'err': err, 'ids': ids}, 'Could not retrieve all requested categories');
      return callback({'code': 404, 'msg': 'Could not retrieve all requested categories'});
    }

    return callback(null, categories);
  });
};

/**
 * Create a new category
 *
 * @param  {Context}        ctx                         Standard context containing the current user and the current course
 * @param  {String}         title                       The name of the category
 * @param  {Boolean}        [visible]                   Whether assets associated to this category will be visible in the Asset Library. By default, this will be set to `true`
 * @param  {Number}         [canvasAssignmentId]        The id of the assignment to which this category is linked
 * @param  {String}         [canvasAssignmentName]      The name of the assignment in Canvas to which this category is linked
 * @param  {Function}       callback                    Standard callback function
 * @param  {Object}         callback.err                An error that occurred, if any
 * @param  {Category}       callback.category           The created category
 */
var createCategory = module.exports.createCategory = function(ctx, title, visible, canvasAssignmentId, canvasAssignmentName, callback) {
  // Default the visible setting
  visible = (visible === false) ? false : true;

  // Parameter validation
  var validationSchema = Joi.object().keys({
    'title': Joi.string().max(255).required(),
    'visible': Joi.boolean().required(),
    'canvasAssignmentId': Joi.number().optional(),
    'canvasAssignmentName': Joi.string().max(255).optional()
  });

  var validationResult = Joi.validate({
    'title': title,
    'visible': visible,
    'canvasAssignmentId': canvasAssignmentId,
    'canvasAssignmentName': canvasAssignmentName
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Only course instructors are allowed to create new categories
  if (!ctx.user.is_admin) {
    log.error({'course': ctx.course}, 'Unauthorized to create a new category');
    return callback({'code': 401, 'msg': 'Unauthorized to create a new category'});
  }

  // Create the category in the DB
  var category = {
    'course_id': ctx.course.id,
    'title': title,
    'visible': visible,
    'canvas_assignment_id': canvasAssignmentId,
    'canvas_assignment_name': canvasAssignmentName
  };

  DB.Category.create(category).complete(function(err, category) {
    if (err) {
      log.error({'err': err}, 'Failed to create a new category');
      return callback({'code': 500, 'msg': err.message});
    }

    // Add the asset count to the category
    category = category.toJSON();
    category.asset_count = 0;

    return callback(null, category);
  });
};

/**
 * Edit a category
 *
 * @param  {Context}        ctx                             Standard context containing the current user and the current course
 * @param  {Number}         id                              The id of the category that is being edited
 * @param  {String}         title                           The updated category name
 * @param  {Boolean}        visible                         Whether assets associated to this category should be visible in the Asset Library
 * @param  {String}         [canvasAssignmentName]          The updated name of the linked assignment in Canvas
 * @param  {Function}       callback                        Standard callback function
 * @param  {Object}         callback.err                    An error that occurred, if any
 * @param  {Category}       callback.category               The updated category
 */
var editCategory = module.exports.editCategory = function(ctx, id, title, visible, canvasAssignmentName, callback) {
  // Parameter validation
  var validationSchema = Joi.object().keys({
    'id': Joi.number().required(),
    'title': Joi.string().max(255).required(),
    'visible': Joi.boolean().required(),
    'canvasAssignmentName': Joi.string().max(255).optional()
  });

  var validationResult = Joi.validate({
    'id': id,
    'title': title,
    'visible': visible,
    'canvasAssignmentName': canvasAssignmentName
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Only course instructors are allowed to edit a category
  if (!ctx.user.is_admin) {
    log.error({'id': id}, 'Unauthorized to edit a category');
    return callback({'code': 401, 'msg': 'Unauthorized to edit a category'});
  }

  // Retrieve the category that is being edited
  getCategory(ctx, id, function(err, category) {
    if (err) {
      return callback(err);
    }

    // Update the category in the DB
    var update = {
      'title': title,
      'visible': visible
    };
    if (canvasAssignmentName) {
      update.canvas_assignment_name = canvasAssignmentName;
    }

    category.update(update).complete(function(err, category) {
      if (err) {
        log.error({'err': err, 'id': id}, 'Failed to update a category');
        return callback({'code': 500, 'msg': err.message});
      }

      // Retrieve the number of assets associated to the category
      var sqlQuery = 'SELECT COUNT(*)::int AS count FROM assets_categories WHERE category_id = ?';
      var replacements = [category.id];
      DB.getSequelize().query(sqlQuery, {'replacements': replacements}).complete(function(err, result) {
        if (err) {
          log.error({'err': err, 'category': category.id}, 'Failed to get the number of assets associated to a category');
          return callback({'code': 500, 'msg': err.message});
        }

        // Add the asset count to the category
        category = category.toJSON();
        category.asset_count = result[0][0].count;

        return callback(null, category);
      });
    });
  });
};

/**
 * Delete a category
 *
 * @param  {Context}        ctx                             Standard context containing the current user and the current course
 * @param  {Number}         id                              The id of the category that is being deleted
 * @param  {Object}         [opts]                          Options, if any
 * @param  {Boolean}        [opts.force]                    If true, forcibly remove the category rather than using paranoid mode
 * @param  {Function}       callback                        Standard callback function
 * @param  {Object}         callback.err                    An error that occurred, if any
 */
var deleteCategory = module.exports.deleteCategory = function(ctx, id, opts, callback) {
  opts = opts || {};

  // Parameter validation
  var validationSchema = Joi.object().keys({
    'id': Joi.number().required()
  });

  var validationResult = Joi.validate({
    'id': id
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Only course instructors are allowed to delete a category
  if (!ctx.user.is_admin) {
    log.error({'id': id}, 'Unauthorized to delete a category');
    return callback({'code': 401, 'msg': 'Unauthorized to delete a category'});
  }

  // Retrieve the category that is being deleted
  getCategory(ctx, id, function(err, category) {
    if (err) {
      return callback(err);
    }

    // Delete the category from the DB
    category.destroy(opts).complete(function(err) {
      if (err) {
        log.error({'err': err, 'category': category.id}, 'Failed to delete a category');
        return callback({'code': 500, 'msg': err.message});
      }

      return callback();
    });
  });
};
