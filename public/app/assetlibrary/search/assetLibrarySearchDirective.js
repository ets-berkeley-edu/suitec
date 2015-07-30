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
    return {
      // Restrict the directive to only match element names. See https://docs.angularjs.org/guide/directive#template-expanding-directive
      // for more information
      'restrict': 'E',

      // Define how the directive's scope is separated from the caller's scope. See https://docs.angularjs.org/guide/directive#isolating-the-scope-of-a-directive
      // for more information
      'scope': {
        'isAdvancedSearch': '=isAdvancedSearch',
        'keywords': '=searchOptionsKeywords',
        'category': '=searchOptionsCategory',
        'user': '=searchOptionsUser',
        'type': '=searchOptionsType'
      },
      'templateUrl': '/app/assetlibrary/search/search.html',
      'controller': function($scope, assetLibraryCategoriesFactory, userFactory) {

        // Variable that keeps track of the categories in the current course
        $scope.categories = null;

        // Variable that keeps track of the users in the current course
        $scope.users = null;

        /**
         * Emit an event indicating that we want to search through the assets
         */
        var search = $scope.search = function() {
          if ($scope.isAdvancedSearch) {
            var searchOptions = {
              'keywords': $scope.keywords,
              'category': $scope.category,
              'user': $scope.user,
              'type': $scope.type
            };
            $scope.$emit('assetLibrarySearchSearch', searchOptions);
          } else {
            $scope.$emit('assetLibrarySearchSearch', {'keywords': $scope.keywords});
          }
        };

        /**
         * Show the simple search view
         */
        var showSimpleView = $scope.showSimpleView = function() {
          $scope.isAdvancedSearch = false;

          // Trigger a search so other components can re-initialize the list
          search();
        };

        /**
         * Show the advanced search view
         */
        var showAdvancedView = $scope.showAdvancedView = function() {
          $scope.isAdvancedSearch = true;
          getAdvancedViewData();
        };

        /**
         * Get all users and categories in the current course
         */
        var getAdvancedViewData = function() {
          if (!$scope.users) {
            userFactory.getAllUsers().success(function(users) {
              $scope.users = users;
            });
          }

          if (!$scope.categories) {
            assetLibraryCategoriesFactory.getCategories().success(function(categories) {
              $scope.categories = categories;
            });
          }
        };

        if ($scope.isAdvancedSearch) {
          getAdvancedViewData();
        }
      }
    };
  });

}(window.angular));
