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

  angular.module('collabosphere').controller('WhiteboardsExportAsAssetController', function(assetLibraryCategoriesFactory, whiteboardsFactory, $scope) {

    // Variable that will keep track of the new asset to be created
    $scope.asset = {};

    // Variable that will keep track of the categories in the current course
    $scope.categories = null;

    // Variable that will keep track of whether a whiteboard is being exported to an asset
    $scope.isExporting = false;

    /**
     * Export the whiteboard as an asset
     */
    var exportAsAsset = $scope.exportAsAsset = function() {
      $scope.isExporting = true;
      whiteboardsFactory.exportWhiteboardAsAsset($scope.whiteboard.id, $scope.asset).success(function(asset) {
        $scope.isExporting = false;
        $scope.closeModal(asset);
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
     * Get the latest whiteboard. Because a user might have made significant changes right before
     * exporting the whiteboard, the thumbnail url could be out of date. By fetching the latest
     * whiteboard data we get a newer thumbnail
     */
    var getWhiteboard = function() {
      whiteboardsFactory.getWhiteboard($scope.whiteboard.id).success(function(whiteboard) {
        $scope.whiteboard = whiteboard;
      });
    };

    getCategories();
    getWhiteboard();
  });

}(window.angular));
