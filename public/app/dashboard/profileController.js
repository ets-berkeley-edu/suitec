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

  angular.module('collabosphere').controller('ProfileController', function(assetLibraryFactory, me, profileFactory, referringTool, userFactory, utilService, $scope, $state, $stateParams) {

    // Value of 'id' in toolUrlDirective can be router-state, asset id, etc.
    $scope.routerStateAddLink = 'assetlibraryaddlink';
    $scope.routerStateBookmarkletInfo = 'assetlibraryaddbookmarklet';
    $scope.routerStateUploadAsset = 'assetlibraryupload';

    $scope.me = me;

    $scope.user = {
      assets: {
        items: null,
        isLoading: true,
        sortBy: 'recent'
      }
    };

    $scope.community = {
      assets: {
        items: null,
        isLoading: true,
        sortBy: 'recent'
      }
    };

    $scope.$watch('nextUserId', function() {
      if ($scope.nextUserId) {
        $state.go('userprofile', {'userId': $scope.nextUserId});
      }
    }, true);

    $scope.color = utilService.getColorConstants();

    var getUserActivity = function(userId) {
      profileFactory.getActivitiesForUser(userId).success(function(activities) {
        $scope.user.activity = [
          // "My Actions" swimlanes.
          {
            'name': 'Engagements',
            'data': activities.actions.engagements,
            'color': $scope.color.ACTIVITY_TIMELINE_BLUE
          },
          {
            'name': 'Interactions',
            'data': activities.actions.interactions,
            'color': $scope.color.ACTIVITY_TIMELINE_BLUE
          },
          {
            'name': 'Creations',
            'data': activities.actions.creations,
            'color': $scope.color.ACTIVITY_TIMELINE_BLUE
          },
          // "My Impacts" swimlanes. For the moment these get leading spaces under 'name' because duplicate names
          // seem to confuse EventDrops. This is not a great long-term solution.
          {
            'name': ' Engagements',
            'data': activities.impacts.engagements,
            'color': $scope.color.ACTIVITY_TIMELINE_RED
          },
          {
            'name': ' Interactions',
            'data': activities.impacts.interactions,
            'color': $scope.color.ACTIVITY_TIMELINE_RED
          },
          {
            'name': ' Creations',
            'data': activities.impacts.creations,
            'color': $scope.color.ACTIVITY_TIMELINE_RED
          }
        ];
      });
    };

    /**
     * Get custom type of asset list (e.g., 'Most Impactful') per user.
     *
     * @param  {String}         sortType              Name of field to sort by
     * @return {void}
     */
    var sortUserAssets = $scope.sortUserAssets = function(sortType) {
      $scope.user.assets.isLoading = true;

      var searchOptions = {
        'sort': sortType,
        'user': $scope.user.id,
        'limit': 4
      };

      assetLibraryFactory.getAssets(0, searchOptions).success(function(assets) {
        $scope.user.assets.items = assets.results;
      }).then(function() {
        $scope.user.assets.sortBy = sortType;
        $scope.user.assets.isLoading = false;
      });
    };

    /**
     * "Community" represents all users of the course site.
     *
     * @param  {String}               sortType              Name of field to sort by
     * @return {void}
     */
    var sortCommunityAssets = $scope.sortCommunityAssets = function(sortType) {
      $scope.community.assets.isLoading = true;

      var searchOptions = {
        'sort': sortType,
        'limit': 4
      };

      assetLibraryFactory.getAssets(0, searchOptions).success(function(assets) {
        $scope.community.assets.items = assets.results;
      }).then(function() {
        $scope.community.assets.sortBy = sortType;
        $scope.community.assets.isLoading = false;
      });
    };

    /**
     * Get user rank in course per engagement index
     *
     * @param  {Object}               user              User being rendered in profile
     * @return {void}
     */
    var determineRank = function(user) {
      if (me.is_admin || user.share_points) {
        userFactory.getLeaderboard().then(function(users) {
          $scope.courseUserCount = users.length;

          // Extract user's rank then break
          for (var i = 0; i < $scope.courseUserCount; i++) {
            if (users[i].id === user.id) {
              $scope.userRank = utilService.appendOrdinalSuffix(users[i].rank);
              break;
            }
          }
        });
      }
    };

    var loadProfile = function(user) {
      $scope.isMyProfile = user.id === me.id;

      // Combine activity metadata and standard user data
      angular.extend($scope.user, user);
      $scope.user.canvasCourseSections = user.canvas_course_sections && user.canvas_course_sections.sort();

      $scope.showEngagementIndexBox = me.course.engagementindex_url && ($scope.isMyProfile || me.is_admin || (user.share_points && me.share_points));
      determineRank(user);

      if ($scope.isMyProfile || me.is_admin) {
        getUserActivity(user.id);
      }
      // Featured assets of user (current profile)
      sortUserAssets($scope.user.assets.sortBy);

      // Only show 'Everyone's Assets' swimlane when user is on his/her own profile
      if ($scope.isMyProfile) {
        sortCommunityAssets($scope.community.assets.sortBy);
      }

      $scope.user.hashtags = ['#badminton', '#bridge', '#break-dancing'];

      // Set page context information for activity timeline directive
      $scope.pageContext = {
        'course': me.course,
        'tool': 'dashboard',
        'id': user.id
      };
    };

    var loadOtherUsers = function(user) {
      // The dropdown of 'search for other users' needs the following
      // list of otherUsers. We exclude user.id of current profile view.
      userFactory.getAllUsers().then(function(response) {
        $scope.otherUsers = _.reject(response.data, {'id': user.id});
      });
    };

    var init = function() {
      // Determine user
      var otherUserId = $stateParams.userId || (referringTool && referringTool.requestedId);
      if (otherUserId) {
        userFactory.getUser(otherUserId).success(function(user) {
          loadProfile(user);
          loadOtherUsers(user);
        });
      } else {
        loadProfile(me);
        loadOtherUsers(me);
      }
    };

    init();
  });

}(window.angular));
