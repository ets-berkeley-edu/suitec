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

  angular.module('collabosphere').controller('WhiteboardsReuseController', function(assetLibraryFactory, $scope) {

    $scope.searchOptions = {};
    $scope.assets = [];
    $scope.list = {
      'page': 0,
      'ready': false
    };

    // Variable that keeps track of whether a search is being done. Note that we can't make this
    // into a function that checks `$scope.searchOptions` as the options are passed into the search
    // directive which will update the options as soon as an input field changes. If we were to do
    // that, we might start showing certain interactions too soon (e.g., the "No assets could be found" alert)
    $scope.isSearch = false;

    /**
     * Add the selected assets to the current whiteboard
     */
    var addSelectedAssets = $scope.addSelectedAssets = function() {
      // The `closeModal` is added on the scope by the caller and allows
      // the caller to deal with the results coming out of the modal
      $scope.closeModal(getSelectedAssets());
    };

    /**
     * Get the selected assets from the asset list
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
     * Toggle the selection of an asset
     *
     * @param  {Asset}          asset           The asset that should be toggled
     */
    var selectAsset = $scope.selectAsset = function(asset) {
      asset.selected = !asset.selected;
    };

    /**
     * Get the assets for the current course through an infinite scroll
     */
    var getAssets = $scope.getAssets = function() {
      // Indicate the no further REST API requests should be made
      // until the current request has completed
      $scope.list.ready = false;
      $scope.isSearch = false;
      assetLibraryFactory.getAssets($scope.list.page, $scope.searchOptions).success(function(assets) {
        // Indicate whether a search was performed
        if ($scope.searchOptions.keywords || $scope.searchOptions.category || $scope.searchOptions.user || $scope.searchOptions.type) {
          $scope.isSearch = true;
        }

        // Add the new assets
        $scope.assets = $scope.assets.concat(assets.results);

        // Only request another page of results if the number of items in the
        // current result set is the same as the maximum number of items in a
        // retrieved asset library page
        if (assets.results.length === 10) {
          $scope.list.ready = true;
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
