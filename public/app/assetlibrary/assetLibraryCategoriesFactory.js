/**
 * Copyright ©2016. The Regents of the University of California (Regents). All Rights Reserved.
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

(function(angular) {

  'use strict';

  angular.module('collabosphere').factory('assetLibraryCategoriesFactory', function(utilService, $http) {

    /**
     * Get the categories for the current course
     *
     * @param  {Boolean}              includeInvisible      Whether invisible categories should be included
     * @return {Promise<Category[]>}                        $http promise returning the categories for the current course
     */
    var getCategories = function(includeInvisible) {
      var url = '/categories';
      if (includeInvisible) {
        url += '?includeInvisible=true';
      }
      return $http.get(utilService.getApiUrl(url));
    };

    /**
     * Create a new category
     *
     * @param  {String}               title                 The name of the category
     * @return {Promise<Category>}                          $http promise returning the created category
     */
    var createCategory = function(title) {
      var category = {
        'title': title
      };
      return $http.post(utilService.getApiUrl('/categories'), category);
    };

    /**
     * Edit a category
     *
     * @param  {Number}               id                    The id of the category that is being edited
     * @param  {String}               title                 The updated category name
     * @param  {Boolean}              visible               Whether assets associated to this category should be visible in the Asset Library
     * @return {Promise<Category>}                          $http promise returning the updated category
     */
    var editCategory = function(id, title, visible) {
      var update = {
        'title': title,
        'visible': visible
      };
      return $http.post(utilService.getApiUrl('/categories/' + id), update);
    };

    /**
     * Delete a category
     *
     * @param  {Number}               id                    The id of the category that is being deleted
     * @return {Promise}                                    $http promise
     */
    var deleteCategory = function(id) {
      return $http.delete(utilService.getApiUrl('/categories/' + id));
    };

    return {
      'getCategories': getCategories,
      'createCategory': createCategory,
      'editCategory': editCategory,
      'deleteCategory': deleteCategory
    };

  });

}(window.angular));
