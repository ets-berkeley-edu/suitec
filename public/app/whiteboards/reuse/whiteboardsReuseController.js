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

  angular.module('collabosphere').controller('WhiteboardsReuseController', function(assetLibraryListFactory, $scope, $modalInstance) {

    $scope.searchOptions = {};
    $scope.assets = [];
    $scope.list = {
      'page': 0,
      'isLoading': false
    };

    // TODO
    var addSelectedAssets = $scope.addSelectedAssets = function() {
      $modalInstance.close(getSelectedAssets());
    };

    /**
     * TODO
     */
    var getSelectedAssets = $scope.getSelectedAssets = function() {
      var selectedAssets = [];
      for (var i = 0; i < $scope.assets.length; i++) {
        var asset = $scope.assets[i];
        if (asset.selected) {
          selectedAssets.push($scope.assets[i]);
        }
      }
      return selectedAssets;
    };

    /**
     * TODO
     */
    var selectAsset = $scope.selectAsset = function(asset) {
      asset.selected = !asset.selected;
    };

    /**
     * TODO
     */
    var closeModal = $scope.closeModal = function() {
      $modalInstance.close();
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

    /**
     * Listen for events indicating that the user wants to search through the asset library
     */
    $scope.$on('assetLibrarySearchSearch', function(ev, searchOptions) {
      $scope.list.page = 0;
      $scope.assets = [];
      $scope.searchOptions = searchOptions;
      getAssets();
    });

  });

}(window.angular));
