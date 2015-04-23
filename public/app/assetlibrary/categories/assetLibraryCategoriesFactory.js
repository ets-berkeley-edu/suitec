/**
 * Copyright 2015 UC Berkeley (UCB) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

(function(angular) {

  'use strict';

  angular.module('collabosphere').factory('assetLibraryCategoriesFactory', function(utilService, $http) {

    /**
     * Get the categories for the current course
     *
     * @return {Promise<Category[]>}              $http promise returning the categories for the current course
     */
    var getCategories = function() {
      return $http.get(utilService.getApiUrl('/categories'));
    };

    /**
     * Create a new category
     *
     * @param  {String}               title       The name of the category
     * @return {Promise<Category>}                $http promise returning the created category
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
     * @param  {Number}               id          The id of the category that is being edited
     * @param  {String}               title       The updated category name
     * @return {Promise<Category>}                $http promise returning the updated category
     */
    var editCategory = function(id, title) {
      var update = {
        'title': title
      };
      return $http.post(utilService.getApiUrl('/categories/' + id), update);
    };

    /**
     * Delete a category
     *
     * @param  {Number}               id          The id of the category that is being deleted
     * @return {Promise}                          $http promise
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
