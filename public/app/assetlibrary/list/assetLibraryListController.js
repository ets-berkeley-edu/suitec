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

  angular.module('collabosphere').controller('AssetLibraryListController', function(assetLibraryListFactory, userFactory, $scope) {

    // Variable that keeps track of whether the search component is in the advanced view state
    $scope.isAdvancedSearch = false;

    // Variable that keeps track of the search options
    $scope.searchOptions = {};

    // Variable that keeps track of the assets in the list
    $scope.assets = [];
    $scope.list = {
      'page': 0,
      'isLoading': false
    };

    /**
     * Get the assets for the current course through an infinite scroll
     */
    var getAssets = $scope.getAssets = function() {
      // Indicate the no further REST API requests should be made
      // until the current request has completed
      $scope.list.isLoading = true;
      assetLibraryListFactory.getAssets($scope.list.page, $scope.searchOptions).success(function(assets) {
        $scope.assets = $scope.assets.concat(assets.results);
        // Only request another page of results if the number of items in the
        // current result set is the same as the maximum number of items in a
        // retrieved asset library page
        if (assets.results.length === 10) {
          $scope.list.isLoading = false;
        }
      });
      // Ensure that the next page is requested the next time
      $scope.list.page++;
    };

    userFactory.getMe().success(function(me) {
      $scope.me = me;
    });

    /**
     * Listen for events indicating that the user wants to search through the asset library
     */
    $scope.$on('assetLibrarySearchSearch', function(ev, searchOptions) {
      $scope.list.page = 0;
      $scope.assets = [];
      $scope.searchOptions = searchOptions;
      getAssets();
    });

    /**
     * Listen for events indicating that the search view is toggled to or from the advanced view
     */
    $scope.$on('assetLibrarySearchViewToggle', function(ev, isAdvancedView) {
      $scope.isAdvancedSearch = isAdvancedView;
    });
  });

}(window.angular));
