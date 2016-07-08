/**
 * Copyright ©2016. The Regents of the University of California (Regents). All Rights Reserved.
 *
 * Permission to use, copy, modify, and distribute this software and its documentation
 * for educational, research, and not-for-profit purposes, without fee and without a
 * signed licensing agreement, is hereby granted, provided that the above copyright
 * notice, this paragraph and the following two paragraphs appear in all copies,
 * modifications, and distributions.
 *
 * Contact The Office of Technology Licensing, UC Berkeley, 2150 Shattuck Avenue,
 * Suite 510, Berkeley, CA 94720-1620, (510) 643-7201, otl@berkeley.edu,
 * http://ipira.berkeley.edu/industry-info for commercial licensing opportunities.
 *
 * IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT, SPECIAL,
 * INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF
 * THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF REGENTS HAS BEEN ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE
 * SOFTWARE AND ACCOMPANYING DOCUMENTATION, IF ANY, PROVIDED HEREUNDER IS PROVIDED
 * "AS IS". REGENTS HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
 * ENHANCEMENTS, OR MODIFICATIONS.
 */

(function(angular) {

  'use strict';

  angular.module('collabosphere').controller('AssetLibraryItemController', function(assetLibraryFactory, me, utilService, $rootScope, $sce, $scope, $state, $stateParams) {

    // Make the me object available to the scope
    $scope.me = me;

    // Variable that will keep track of the current asset id
    var assetId = $stateParams.assetId;

    // Variable that will keep track of whether the user has come in via a whiteboard
    $scope.whiteboardReferral = $stateParams.whiteboard_referral;

    // Variable that will keep track of the current asset
    $scope.asset = null;

    // Variable that will keep track of the new top-level comment
    $scope.newComment = null;

    // Variable that will keep track of the timeout id when a preview is pending and its status is being retrieved
    var previewTimeout = null;

    // Clear the preview timers if the user goes away
    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
      if (fromState.name === 'assetlibrarylist.item' && toState.name !== 'assetlibrarylist.item.edit') {
        if (previewTimeout) {
          clearTimeout(previewTimeout);
          previewTimeout = null;
        }
      }
    });

    // Add the asset id to the parent container's to allow for deep linking to the asset
    utilService.setParentHash({'asset': assetId});

    /**
     * Get the current asset
     *
     * @param  {Boolean}      [incrementViews]      Whether the total number of views for the asset should be incremented by 1. Defaults to `true`
     */
    var getCurrentAsset = function(incrementViews) {
      assetLibraryFactory.getAsset(assetId, incrementViews).success(function(asset) {
        // Build the asset comment tree
        buildCommentTree(asset);

        if (asset.preview_status === 'done') {
          if (asset.type === 'file') {
            if (asset.pdf_url) {
              asset.embedUrl = '/viewer/viewer.html?file=' + asset.pdf_url;
            }
          } else if (asset.type === 'link') {
            if (asset.preview_metadata.youtubeId) {
              asset.embedUrl = $sce.trustAsResourceUrl('//www.youtube.com/embed/' + asset.preview_metadata.youtubeId + '?autoplay=false');
            } else {
              var currentProtocol = document.location.protocol;
              var isHttpEmbeddable = asset.preview_metadata.httpEmbeddable;
              var isHttpsEmbeddable = asset.preview_metadata.httpsEmbeddable;
              asset.isEmbeddable = (
                (currentProtocol === 'http:' && isHttpEmbeddable) ||
                (currentProtocol === 'https:' && isHttpsEmbeddable)
              );
              asset.embedUrl = $sce.trustAsResourceUrl(asset.url.replace(/^https?:/, ''));
            }
          }
        }

        $scope.asset = asset;

        // Make the latest metadata of the asset available
        $scope.$emit('assetLibraryAssetUpdated', $scope.asset);

        // If the preview is still being generated, wait a few seconds and try again
        if ((asset.type === 'file' || asset.type === 'link') && asset.preview_status === 'pending') {
          previewTimeout = setTimeout(getCurrentAsset, 2000, false);
        }
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
        return ($scope.me.is_admin || _.findWhere($scope.asset.users, {'id': $scope.me.id}));
      }
    };

    /**
     * Delete the current asset
     */
    var deleteAsset = $scope.deleteAsset = function() {
      if (confirm('Are you sure you want to delete this asset?')) {
        assetLibraryFactory.deleteAsset($scope.asset.id).then(function() {
          $scope.$emit('assetLibraryAssetDeleted', $scope.asset.id);
          $state.go('assetlibrarylist');
        }, function(err) {
          // An interaction in another session might cause the user to lose delete authorization
          alert('This asset cannot be deleted.');
        });
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
          // case we proceed as if the request succeeded as the comment no longer exists
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

    /**
     * Restore the asset library search options when navigating back to the asset library list. As navigating
     * back to the asset library list doesn't trigger a new search, the easiest solution is to restore the hash
     * value here
     */
    var backToAssetLibrary = $scope.backToAssetLibrary = function() {
      utilService.setParentHash($scope.$parent.searchOptions);
    };

    /**
     * Close the current browser window. This is used when an asset has been opened
     * in a separate tab and the user wants to be taken back to where the asset was
     * launched from
     */
    var closeWindow = $scope.closeWindow = function() {
      window.close();
    };

    // Load the selected asset
    getCurrentAsset();
    // Scroll to the top of the page as the current scroll position could be somewhere
    // deep in the asset library list
    utilService.scrollToTop();

  });

}(window.angular));
