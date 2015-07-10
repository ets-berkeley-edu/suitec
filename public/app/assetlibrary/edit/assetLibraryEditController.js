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

  angular.module('collabosphere').controller('AssetLibraryEditController', function(assetLibraryCategoriesFactory, assetLibraryFactory, userFactory, $state, $stateParams, $scope) {

    // Variable that keeps track of the current asset id
    var assetId = $stateParams.assetId;

    // Variable that keeps track of the current asset
    $scope.asset = null;

    // Variable that keeps track of the categories in the current course
    $scope.categories = null;

    /**
     * Get the current asset
     */
    var getCurrentAsset = function() {
      assetLibraryFactory.getAsset(assetId).success(function(asset) {
        // As the UI currently only allows for a single category to be selected,
        // set the categories value to make it easier to work with
        if (asset.categories.length > 0) {
          asset.categories = asset.categories[0].id;
        }
        $scope.asset = asset;
      });
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
     * Edit the current asset
     */
    var editAsset = $scope.editAsset = function() {
      assetLibraryFactory.editAsset($scope.asset.id, $scope.asset).success(function(updatedAsset) {
        // Indicate that the asset has been updated
        $scope.$emit('assetLibraryAssetUpdated', updatedAsset);
        // Redirect back to the asset item view
        $state.go('assetlibrarylist.item', {'assetId': updatedAsset.id});
      });
    };

    userFactory.getMe().success(function(me) {
      $scope.me = me;
      // Load the categories for the current course
      getCategories();
      // Load the selected asset
      getCurrentAsset();
    });

  });

}(window.angular));
