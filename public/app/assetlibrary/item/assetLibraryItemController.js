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

  angular.module('collabosphere').controller('AssetLibraryItemController', function(assetLibraryItemFactory, userFactory, $routeParams, $sce, $scope) {

    // Variable that will keep track of the current asset id
    var assetId = $routeParams.assetId;

    // Variable that will keep track of the current asset
    $scope.asset = null;

    // Variable that will keep track of the new top-level comment
    $scope.newComment = null;

    /**
     * Get the current asset
     */
    var getCurrentAsset = function() {
      assetLibraryItemFactory.getAsset(assetId).success(function(asset) {
        // Ensure that the newest comments are at the top
        // TODO: Add sorting to allow for replies
        asset.comments = asset.comments.reverse();
        $scope.asset = asset;
      });
    };

    /**
     * Allow every URL as an iFrame source URL
     *
     * @param  {String}       url             The URL to trust as an iframe source
     */
    var trustIFrameSrc = $scope.trustIFrameSrc = function(url) {
      return $sce.trustAsResourceUrl(url);
    };

    /**
     * Create a new comment on the current asset
     */
    var createComment = $scope.createComment = function() {
      assetLibraryItemFactory.createComment(assetId, $scope.newComment.body).success(function(comment) {
        // Add the created comment to the comment list
        // TODO: Insert reply
        $scope.asset.comments.unshift(comment);
        $scope.asset.comment_count++;
        // Clear the new comment
        $scope.newComment = null;
      });
    };

    userFactory.getMe().success(function(me) {
      $scope.me = me;
      getCurrentAsset();
    });

  });

}(window.angular));
