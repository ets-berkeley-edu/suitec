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

  angular.module('collabosphere').controller('AssetLibraryCategoriesController', function(assetLibraryCategoriesFactory, $scope) {

    // Variable that will keep track of the categories in the current course
    $scope.categories = null;

    // Variable that will keep track of the new category
    $scope.newCategory = null;

    /**
     * Get the categories for the current course
     */
    var getCategories = function() {
      assetLibraryCategoriesFactory.getCategories().success(function(categories) {
        $scope.categories = categories;
      });
    };

    /**
     * Create a new category
     */
    var createCategory = $scope.createCategory = function() {
      assetLibraryCategoriesFactory.createCategory($scope.newCategory).success(function(category) {
        // Add the created category to the category list
        $scope.categories.push(category);
        // Clear the new category
        $scope.newCategory = null;
      });
    };

    /**
     * Delete a category
     *
     * @param  {Category}       category          The category that is being deleted
     */
    var deleteCategory = $scope.deleteCategory = function(category) {
      if (confirm('Are you sure you want to delete this category?')) {
        assetLibraryCategoriesFactory.deleteCategory(category.id).success(function() {
          // Delete the category from the category list
          for (var i = 0; i < $scope.categories.length; i++) {
            if ($scope.categories[i].id === category.id) {
              $scope.categories.splice(i, 1);
            }
          }
        });
      }
    };

    getCategories();

  });

}(window.angular));
