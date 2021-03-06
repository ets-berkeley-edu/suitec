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

var Collabosphere = require('col-core');
var CollabosphereUtil = require('col-core/lib/util');

var CategoriesAPI = require('./api');

/*!
 * Get the categories for the current course
 */
Collabosphere.apiRouter.get('/categories', function(req, res) {
  var includeInvisible = CollabosphereUtil.getBooleanParam(req.query.includeInvisible, false);
  CategoriesAPI.getCategories(req.ctx, includeInvisible, false, function(err, categories) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.status(200).send(categories);
  });
});

/*!
 * Create a new category
 */
Collabosphere.apiRouter.post('/categories', function(req, res) {
  CategoriesAPI.createCategory(req.ctx, req.body.title, true, undefined, undefined, function(err, category) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.status(201).send(category);
  });
});

/*!
 * Edit a category
 */
Collabosphere.apiRouter.post('/categories/:categoryId', function(req, res) {
  var visible = CollabosphereUtil.getBooleanParam(req.body.visible);
  CategoriesAPI.editCategory(req.ctx, req.params.categoryId, req.body.title, visible, undefined, function(err, category) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.status(200).send(category);
  });
});

/*!
 * Delete a category
 */
Collabosphere.apiRouter.delete('/categories/:categoryId', function(req, res) {
  CategoriesAPI.deleteCategory(req.ctx, req.params.categoryId, null, function(err) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.sendStatus(200);
  });
});
