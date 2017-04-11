/**
 * Copyright ©2017. The Regents of the University of California (Regents). All Rights Reserved.
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

  angular.module('collabosphere').controller('ProfileController', function(assetLibraryFactory, profileFactory, deepLinkId, me, userFactory, $scope) {

    // Value of 'id' in toolUrlDirective can be router-state, asset id, etc.
    $scope.routerStateAddLink = 'assetlibraryaddlink';
    $scope.routerStateBookmarkletInfo = 'assetlibraryaddbookmarklet';
    $scope.routerStateUploadAsset = 'assetlibraryupload';

    $scope.me = me;
    $scope.sortAssetsBy = 'recent';
    $scope.sortCommunityBy = 'recent';

    var getUserActivity = function(userId) {
      profileFactory.getActivitiesForUser(userId).success(function(activities) {
        $scope.userActivity = {
          'Added an asset': activities.add_asset,
          'Liked an asset': activities.like,
          'Viewed an asset': activities.view_asset,
          'Commented on an asset': activities.asset_comment,
          'Added an asset to a whiteboard': activities.whiteboard_add_asset,
          'Exported a whiteboard': activities.export_whiteboard
        };

        $scope.userAssetActivity = {
          'Viewed my assets': activities.get_view_asset,
          'Liked my assets': activities.get_like,
          'Commented on my assets': activities.get_asset_comment,
          'Replied to my comments': activities.get_asset_comment_reply,
          'Added my assets to a whiteboard': activities.get_whiteboard_add_asset
        };
      });
    };

    /**
     * Get custom type of asset list (e.g., 'Most Impactful') per user.
     */
    var sortFeaturedAssets = $scope.sortFeaturedAssets = function(sortType) {
      var searchOptions = {
        'sort': sortType,
        'user': $scope.user,
        'limit': 4
      };

      assetLibraryFactory.getAssets(0, searchOptions).success(function(assets) {
        $scope.featuredAssets = assets.results;
      }).then(function() {
        $scope.sortAssetsBy = sortType;
      });
    };

    /**
     * "Community" represents all users of the course site.
     */
    var sortCommunityAssets = $scope.sortCommunityAssets = function(sortType) {
      var searchOptions = {
        'sort': sortType,
        'limit': 4
      };

      assetLibraryFactory.getAssets(0, searchOptions).success(function(assets) {
        $scope.communityAssets = assets.results;
      }).then(function() {
        $scope.sortCommunityBy = sortType;
      });
    };

    var loadProfile = function() {
      if (deepLinkId) {
        userFactory.getUser(deepLinkId).success(function(user) {
          $scope.isMyProfile = user.id === me.id;
          $scope.user = user;
          if (me.is_admin || user.id === me.id) {
            getUserActivity(user.id);
          }
        });
      } else {
        $scope.isMyProfile = true;
        $scope.user = me;
        getUserActivity(me.id);
      }

      sortFeaturedAssets($scope.sortAssetsBy);
      sortCommunityAssets($scope.sortCommunityBy);
    };

    loadProfile();
  });

}(window.angular));
