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

  angular.module('collabosphere').controller('AssetLibrarySearchController', function($scope, assetLibraryCategoriesFactory, userFactory) {

    // Variable that keeps track of whether the search component is in the advanced view state
    $scope.isAdvancedSearch = false;

    // Variables that keeps track of the search options
    $scope.searchOptions = {
      'keywords': '',
      'category': '',
      'user': '',
      'type': ''
    };

    // Variable that keeps track of the categories in the current course
    $scope.categories = null;

    // Variable that keeps track of the users in the current course
    $scope.users = [];

    /**
     * Emit an event indicating that we want to search through the assets
     */
    var search = $scope.search = function() {
      if ($scope.isAdvancedSearch) {
        $scope.$emit('assetLibrarySearchSearch', $scope.searchOptions);
      } else {
        $scope.$emit('assetLibrarySearchSearch', {'keywords': $scope.searchOptions.keywords});
      }
    };

    /**
     * Get the categories for the current course
     */
    var getCategories = function() {
      assetLibraryCategoriesFactory.getCategories().success(function(categories) {
        $scope.categories = categories;
      });
    };

    /**
     * Get the users for the current course
     */
    var getUsers = function() {
      userFactory.getUsers().success(function(response) {
        $scope.users = response;
      });
    };

    /**
     * Show the simple search view
     */
    var showSimpleView = $scope.showSimpleView = function() {
      $scope.isAdvancedSearch = false;
      $scope.searchOptions = {
        'keywords': '',
        'category': '',
        'user': '',
        'type': ''
      };
      emitViewToggleEvent();

      // Trigger a search so other components can re-initialize the list
      search();
    };

    /**
     * Show the advanced search view
     */
    var showAdvancedView = $scope.showAdvancedView = function() {
      $scope.isAdvancedSearch = true;
      emitViewToggleEvent();

      // If we haven't loaded the asset categories or users yet, we'll fetch them now
      if (!$scope.categories) {
        getCategories();
        getUsers();
      }
    };

    /**
     * Emit an event indicating the view has been changed
     */
    var emitViewToggleEvent = function() {
      $scope.$emit('assetLibrarySearchViewToggle', $scope.isAdvancedSearch);
    };

  });

}(window.angular));
