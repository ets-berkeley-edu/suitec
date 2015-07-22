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

  angular.module('collabosphere').directive('search', function() {

    // This controller will be used by the search directive.
    // Unfortunately, the controller doesn't seem to inherit from the parent scope when it's
    // passed in by reference, so we declare it in the directive statement
    // It will inherit the following parameters from the parent scope:
    //  - isAdvancedSearch   -   Whether the advanced search view should be toggled
    //  - searchOptions      -   The `keywords`, `category`, `user` and `type` search options
    //
    var controller = function($scope, assetLibraryCategoriesFactory, userFactory) {

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
       * Get all users in the current course
       */
      var getAllUsers = function() {
        userFactory.getAllUsers().success(function(response) {
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

        // Trigger a search so other components can re-initialize the list
        search();
      };

      /**
       * Show the advanced search view
       */
      var showAdvancedView = $scope.showAdvancedView = function() {
        $scope.isAdvancedSearch = true;

        // If we haven't loaded the asset categories or users yet, we'll fetch them now
        if (!$scope.categories) {
          getCategories();
          getAllUsers();
        }
      };

      if ($scope.isAdvancedSearch && !$scope.categories) {
        getCategories();
        getAllUsers();
      }

    };

    return {
      'controller': controller,
      'restrict': 'E',
      'templateUrl': '/app/assetlibrary/search/search.html'
    };
  });

}(window.angular));
