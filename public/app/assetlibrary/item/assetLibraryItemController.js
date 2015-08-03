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

  angular.module('collabosphere').controller('AssetLibraryItemController', function(assetLibraryFactory, userFactory, utilService, $filter, $stateParams, $scope) {

    // Variable that will keep track of the current asset id
    var assetId = $stateParams.assetId;

    // Variable that will keep track of the current asset
    $scope.asset = null;

    // Variable that will keep track of the new top-level comment
    $scope.newComment = null;

    /**
     * Get the current asset
     */
    var getCurrentAsset = function() {
      assetLibraryFactory.getAsset(assetId).success(function(asset) {
        // Build the asset comment tree
        buildCommentTree(asset);

        $scope.asset = asset;

        // Make the latest metadata of the asset available
        $scope.$emit('assetLibraryAssetUpdated', $scope.asset);
      });
    };

    /**
     * Build the comment tree for an asset. The comment tree will hold a flat list of all comment
     * in the order in which they should be displayed. Replies should therefore come right after
     * their parent
     *
     * @param  {Asset}        asset           The asset to build the comment tree for. The comments will be replaced with the comment tree
     */
    var buildCommentTree = function(asset) {
      // Order the comments from oldest to newest
      asset.comments.sort(function(a, b) {
        return a.id - b.id;
      });

      // Extract the top-level comments
      var comments = [];
      for (var i = 0; i < asset.comments.length; i++) {
        var comment = asset.comments[i];
        if (!comment.parent_id) {
          comment.level = 0;
          comment.has_replies = false;
          comments.unshift(comment);

          // Find all replies for the current comment
          for (var r = 0; r < asset.comments.length; r++) {
            var reply = asset.comments[r];
            if (reply.parent_id === comment.id) {
              reply.level = 1;
              comment.has_replies = true;
              comments.splice(1, 0, reply);
            }
          }
        }
      }

      asset.comments = comments;
    };

    /**
     * Check whether the current user is able to manage the current asset
     *
     * @return {Boolean}                      Whether the current user can manage the current asset
     */
    var canManageAsset = $scope.canManageAsset = function() {
      if ($scope.asset && $scope.me) {
        return ($scope.me.is_admin || $filter('filter')($scope.asset.users, {'id': $scope.me.id}).length > 0);
      }
    };

    /**
     * Create a new comment on the current asset
     */
    var createComment = $scope.createComment = function() {
      assetLibraryFactory.createComment(assetId, $scope.newComment.body).success(function(comment) {
        // Add the created comment to the comment list
        comment.level = 0;
        $scope.asset.comments.unshift(comment);
        $scope.asset.comment_count++;
        // Clear the new comment
        $scope.newComment = null;
        // Indicate that the asset has been updated
        $scope.$emit('assetLibraryAssetUpdated', $scope.asset);
      });
    };

    /**
     * Show or hide the reply form for a comment
     *
     * @param  {Comment}      comment         The comment for which the reply form should be shown or hidden
     */
    var toggleReplyComment = $scope.toggleReplyComment = function(comment) {
      comment.replying = !comment.replying;
    };

    /**
     * Reply to a comment on the current asset
     *
     * @param  {Comment}      comment         The comment to which this is a reply
     * @param  {String}       body            The body of the reply
     */
    var replyComment = $scope.replyComment = function(comment, body) {
      assetLibraryFactory.createComment(assetId, body, comment.id).success(function(reply) {
        reply.level = 1;
        // Add the created comment to the comment list
        for (var i = 0; i < $scope.asset.comments.length; i++) {
          if ($scope.asset.comments[i].id === comment.id) {
            $scope.asset.comments.splice(i + 1, 0, reply);
            break;
          }
        }
        $scope.asset.comment_count++;
        // Re-build the comment tree
        buildCommentTree($scope.asset);
        // Hide the reply form
        toggleReplyComment(comment);
        // Indicate that the asset has been updated
        $scope.$emit('assetLibraryAssetUpdated', $scope.asset);
      });
    };

    /**
     * Show or hide the edit form for a comment
     *
     * @param  {Comment}      comment         The comment for which the edit form should be shown or hidden
     */
    var toggleEditComment = $scope.toggleEditComment = function(comment) {
      // When the comment is not being edited yet, the body is cached
      // and the edit form is shown
      if (!comment.editing) {
        comment.newBody = comment.body;
        comment.editing = true;
      } else {
        comment.editing = false;
      }
    };

    /**
     * Edit a comment on the current asset
     *
     * @param  {Comment}      comment         The comment that is being edited
     */
    var editComment = $scope.editComment = function(comment) {
      assetLibraryFactory.editComment(assetId, comment.id, comment.newBody).success(function() {
        comment.body = comment.newBody;
        toggleEditComment(comment);
      });
    };

    /**
     * Delete a comment on the current asset
     *
     * @param  {Comment}      comment         The comment that is being deleted
     */
    var deleteComment = $scope.deleteComment = function(comment) {
      if (confirm('Are you sure you want to delete this comment?')) {

        /*!
         * Delete the comment from the comments in the current scope and indicate that the asset
         * has been updated
         */
        var localDelete = function() {
          // Delete the comment from the comment list
          for (var i = 0; i < $scope.asset.comments.length; i++) {
            if ($scope.asset.comments[i].id === comment.id) {
              $scope.asset.comments.splice(i, 1);
            }
          }
          // Re-build the comment tree
          buildCommentTree($scope.asset);
          $scope.asset.comment_count--;
          // Indicate that the asset has been updated
          $scope.$emit('assetLibraryAssetUpdated', $scope.asset);
        };

        assetLibraryFactory.deleteComment(assetId, comment.id).then(localDelete, function(err) {
          // When the comment is removed in another session this request will return a 404. In that
          // case we proceed as if the request succeeded as the comment no longer exists, which is
          // what was desired in the first place
          if (err.status === 404) {
            localDelete();
          }
        });
      }
    };

    /**
     * Listen for events indicating that the current asset has been updated
     */
    $scope.$on('assetLibraryAssetUpdated', function(ev, updatedAsset) {
      if ($scope.asset.id === updatedAsset.id) {
        // Build a tree for the asset's comments
        buildCommentTree(updatedAsset);

        // Keep track of the updated asset
        $scope.asset = updatedAsset;
      }
    });

    userFactory.getMe().success(function(me) {
      $scope.me = me;
      // Load the selected asset
      getCurrentAsset();
      // Scroll to the top of the page as the current scroll position could be somewhere
      // deep in the asset library list
      utilService.scrollToTop();
    });

  });

}(window.angular));
