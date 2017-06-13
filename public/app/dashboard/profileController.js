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

  angular.module('collabosphere').controller('ProfileController', function(analyticsService, assetLibraryFactory, me, profileFactory, referringTool, userFactory, utilService, $scope, $state, $stateParams) {

    // Value of 'id' in toolUrlDirective can be router-state, asset id, etc.
    $scope.routerStateAddLink = 'assetlibraryaddlink';
    $scope.routerStateBookmarkletInfo = 'assetlibraryaddbookmarklet';
    $scope.routerStateUploadAsset = 'assetlibraryupload';

    $scope.me = me;

    // If total asset count exceeds the following limit then we'll offer a link to 'Show all'.
    $scope.maxPerSwimlane = 4;

    var defaultUserPreferences = {
      totalAssetsInCourse: null,
      assets: {
        isLoading: true,
        sortBy: 'recent',
        advancedSearchId: null,
        filterLabels: {
          recent: 'Recent',
          impact: 'Most Impactful',
          pins: 'Pinned'
        }
      }
    };

    $scope.browse = {
      searchedUserId: null,
      otherUsers: []
    };

    $scope.community = {
      totalAssetsInCourse: null,
      assets: {
        isLoading: true,
        sortBy: 'recent',
        advancedSearchId: null,
        filterLabels: {
          recent: 'Recent',
          trending: 'Trending',
          impact: 'Most Impactful'
        }
      }
    };

    $scope.$watch('browse.searchedUserId', function() {
      if ($scope.browse.searchedUserId) {
        analyticsService.track('Search for user profile', {
          'search_for_user': $scope.browse.searchedUserId
        });
        $state.go('userprofile', {'userId': $scope.browse.searchedUserId});
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

        $scope.breakdown = {
          'contributions': _.pick(activities.actions, ['counts', 'totals']),
          'impacts': _.pick(activities.impacts, ['counts', 'totals']),
          'selected': 'contributions'
        };
      });
    };

    /**
     * Toggle activity breakdown selection (contributions or impacts).
     *
     * @param  {String}         filter          Which portion of the breakdown to display
     * @return {void}
     */
    var toggleBreakdown = $scope.toggleBreakdown = function(filter) {
      $scope.breakdown.selected = filter;

      // Track toggle.
      analyticsService.track('Change profile page total activities filter', {
        'profile_user': $scope.user.id,
        'activities_filter': filter
      });
    };

    /**
     * Get custom type of asset list (e.g., 'Most Impactful') per user.
     *
     * @param  {String}         sortType              Name of field to sort by
     * @param  {Boolean}        track                 Whether to track sort in analytics
     * @return {void}
     */
    var sortUserAssets = $scope.sortUserAssets = function(sortType, track) {
      $scope.user.assets.isLoading = true;

      var searchOptions = {
        'sort': sortType,
        'user': $scope.user.id,
        'limit': $scope.maxPerSwimlane
      };

      if (track) {
        analyticsService.track('Change profile page user assets filter', {
          'profile_user': $scope.user.id,
          'user_assets_filter': sortType
        });
      }

      // Narrow the search, if appropriate
      utilService.narrowSearchPerSort(searchOptions);

      assetLibraryFactory.getAssets(0, searchOptions, false).success(function(assets) {
        angular.extend($scope.user.assets, assets);
        utilService.setPinnedByMe($scope.user.assets.results);

      }).then(function() {
        var isShowAllFilter = sortType === 'recent';
        if (isShowAllFilter) {
          // We need this count available when `assets.results.length` varies per swimlane filters.
          $scope.user.totalAssetsInCourse = $scope.user.assets.results.length;
        }
        $scope.user.assets.sortBy = sortType;
        $scope.user.assets.advancedSearchId = utilService.getAdvancedSearchId({
          sort: isShowAllFilter ? '' : sortType,
          user: $scope.user.id
        });
        $scope.user.assets.isLoading = false;
      });
    };

    /**
     * "Community" represents all users of the course site.
     *
     * @param  {String}               sortType              Name of field to sort by
     * @param  {Boolean}              track                 Whether to track sort in analytics
     * @return {void}
     */
    var sortCommunityAssets = $scope.sortCommunityAssets = function(sortType, track) {
      $scope.community.assets.isLoading = true;

      var searchOptions = {
        'sort': sortType,
        'limit': $scope.maxPerSwimlane
      };

      if (track) {
        analyticsService.track('Change profile page community assets filter', {
          'profile_user': $scope.user.id,
          'community_assets_filter': sortType
        });
      }

      // Narrow the search, if appropriate
      utilService.narrowSearchPerSort(searchOptions);

      assetLibraryFactory.getAssets(0, searchOptions, false).success(function(assets) {
        angular.extend($scope.community.assets, assets);
        utilService.setPinnedByMe($scope.community.assets.results);

      }).then(function() {
        var isShowAllFilter = sortType === 'recent';
        if (isShowAllFilter) {
          // We need this count available when `assets.results.length` varies per swimlane filters.
          $scope.community.totalAssetsInCourse = $scope.community.assets.results.length;
        }
        $scope.community.assets.sortBy = sortType;
        $scope.community.assets.advancedSearchId = utilService.getAdvancedSearchId({
          sort: isShowAllFilter ? '' : sortType
        });
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

    /**
     * Combine standard user data and activity metadata
     *
     * @param  {Object}               user              User being rendered in profile
     * @return {void}
     */
    var loadProfile = function(user) {
      // Set default preferences
      $scope.user = user;
      _.extend($scope.user, defaultUserPreferences);

      $scope.isMyProfile = user.id === me.id;

      // Sort section(s)
      $scope.user.canvasCourseSections = user.canvas_course_sections && user.canvas_course_sections.sort();

      $scope.showEngagementIndexBox = me.course.engagementindex_url && ($scope.isMyProfile || me.is_admin || (user.share_points && me.share_points));
      determineRank(user);

      getUserActivity(user.id);

      // Featured assets of user (current profile)
      sortUserAssets($scope.user.assets.sortBy, false);

      // Only show 'Everyone's Assets' swimlane when user is on his/her own profile
      if ($scope.isMyProfile) {
        sortCommunityAssets($scope.community.assets.sortBy, false);
      }

      // Set page context information for activity timeline directive
      $scope.pageContext = {
        'course': me.course,
        'tool': 'dashboard',
        'id': user.id
      };

      // Track view of another user's profile
      if (!$scope.isMyProfile) {
        analyticsService.track('View user profile', {
          'profile_user': user.id,
          'referer': document.referrer
        });
      }

      // Allow for searching and browsing of other users
      userFactory.getAllUsers(false).then(function(response) {
        // Sort alphabetically
        var otherUsers = response.data;
        _.sortBy(otherUsers, [ 'canvas_full_name' ]);

        // Remove user of current profile
        var count = otherUsers.length;
        otherUsers = _.reject(otherUsers, function(other, index) {
          var rejectUser = (other.id === $scope.user.id);
          // Browse feature is disabled if total user count is less than three
          if (rejectUser && count > 2) {
            // Browse users by clicking previous or next
            $scope.browse.previous = otherUsers[index > 0 ? index - 1 : count - 1];
            $scope.browse.next = otherUsers[index === count - 1 ? 0 : index + 1];
          }
          return rejectUser;
        });
        $scope.browse.otherUsers = otherUsers;
      });
    };

    /**
     * Combine standard user data and activity metadata
     *
     * @param  {Object}               userId              Id of user being rendered in profile
     * @return {void}
     */
    var loadProfileById = $scope.loadProfileById = function(userId) {
      userFactory.getUser(userId).success(function(user) {
        loadProfile(user);
      });
    };

    /**
     * Listen for pinning/unpinning events by 'me'
     */
    $scope.$on('assetPinEventByMe', function(ev, updatedAsset) {
      if ($scope.isMyProfile) {
        var reloadUserAssets = false;
        _.each([$scope.user.assets.results, $scope.community.assets.results], function(assets) {
          _.each(assets, function(asset, index) {
            if (asset.id === updatedAsset.id) {
              assets[index] = updatedAsset;
              reloadUserAssets = true;
            }
          });
        });
        if (reloadUserAssets) {
          sortUserAssets($scope.user.assets.sortBy, false);
        }
      }
    });

    var init = function() {
      // Determine user
      var userId = $stateParams.userId || (referringTool && referringTool.requestedId);
      if (userId) {
        loadProfileById(userId);
      } else {
        loadProfile(me);
      }
    };

    init();
  });

}(window.angular));
