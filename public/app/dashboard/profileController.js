/**
 * Copyright ©2018. The Regents of the University of California (Regents). All Rights Reserved.
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

  angular.module('collabosphere').controller('ProfileController', function(
    analyticsService,
    assetLibraryFactory,
    collaborationMessageService,
    crossToolRequest,
    me,
    profileFactory,
    userFactory,
    utilService,
    $scope,
    $state,
    $stateParams
  ) {

    // Dummy function (i.e., no-op callback) used in profile template
    var noOp = $scope.noOp = angular.noop;

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
        sortBy: 'recent',
        advancedSearchId: null,
        filterLabels: {
          recent: 'Recent',
          trending: 'Trending',
          impact: 'Most Impactful'
        }
      }
    };

    $scope.interactions = {
      linkTypes: [],
      nodes: []
    };

    $scope.$watch('browse.searchedUserId', function() {
      if ($scope.browse.searchedUserId) {
        analyticsService.track('Search for user profile', {
          'search_for_user': $scope.browse.searchedUserId
        });

        crossToolRequest = null;
        $state.go('userprofile', {
          'userId': $scope.browse.searchedUserId,
          'loadPreviousState': false
        });
      }
    }, true);

    $scope.color = utilService.getColorConstants();

    var getUserActivity = function(userId) {
      profileFactory.getActivitiesForUser(userId).success(function(activities) {
        $scope.user.activity = [
          // "Contributions" swimlanes.
          {
            'name': 'Views/Likes',
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
          // "Impacts" swimlanes. For the moment these get leading spaces under 'name' because duplicate names
          // seem to confuse EventDrops. This is not a great long-term solution.
          {
            'name': ' Views/Likes',
            'data': activities.impacts.engagements,
            'color': $scope.color.ACTIVITY_TIMELINE_RED
          },
          {
            'name': ' Interactions',
            'data': activities.impacts.interactions,
            'color': $scope.color.ACTIVITY_TIMELINE_RED
          },
          {
            'name': 'Reuses',
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
     * @param  {Function}       callback              Standard callback function
     * @return {void}
     */
    var sortUserAssets = $scope.sortUserAssets = function(sortType, track, callback) {
      // First, set marker to identify user as having one or more pins in this course.
      // User with one or more pins, and no uploaded assets, needs filters under 'My Assets'
      // such that s/he can navigate to 'Pinned' list.
      assetLibraryFactory.getAssets(0, {'hasPins': true, 'limit': 1}, false).success(function(assets) {
        $scope.user.hasPins = !!assets.results.length;
      });

      // Next, load requested assets
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

        callback();
      });
    };

    /**
     * "Community" represents all users of the course site.
     *
     * @param  {String}               sortType              Name of field to sort by
     * @param  {Boolean}              track                 Whether to track sort in analytics
     * @param  {Function}             callback              Standard callback function
     * @return {void}
     */
    var sortCommunityAssets = $scope.sortCommunityAssets = function(sortType, track, callback) {
      // Only show 'Everyone's Assets' swimlane when user is on his/her own profile
      if ($scope.isMyProfile) {
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

          callback();
        });

      } else {
        callback();
      }
    };

    /**
     * Get user rank in course per engagement index
     *
     * @param  {Object}               user              User being rendered in profile
     * @return {void}
     */
    var determineRank = function(user) {
      if (me.is_admin || user.share_points) {
        userFactory.getLeaderboard(false).then(function(users) {
          $scope.leaderboardCount = users.length;

          // Extract user's rank then break
          for (var i = 0; i < $scope.leaderboardCount; i++) {
            if (users[i].id === user.id) {
              $scope.userRank = utilService.appendOrdinalSuffix(users[i].rank);
              break;
            }
          }
        });
      } else {
        $scope.userRank = null;
      }
    };

    /**
     * Previous state describes user's scroll position and selected filters before linking to Asset Library.
     * When user clicks 'Return to Dashboard' (e.g., on asset detail page) the Impact Studio will return to
     * its previous rendering and scroll position.
     *
     * @param  {Boolean}              loadPreviousState     If true then load properties of crossToolRequest.state
     * @param  {Function}             callback              Standard callback function
     * @return {void}
     */
    var unpackPreviousState = function(loadPreviousState, callback) {
      if (loadPreviousState) {
        var args = crossToolRequest && _.split(crossToolRequest.state, '-');
        if (args && args.length) {
          var scrollTo = _.nth(args, 0) || null;
          $scope.breakdown.selected = _.nth(args, 1) || $scope.breakdown.selected;
          $scope.user.assets.sortBy = _.nth(args, 2) || $scope.user.assets.sortBy;
          $scope.community.assets.sortBy = _.nth(args, 3) || $scope.community.assets.sortBy;
          // Previous state might have non-default sortBy
          callback($scope.user.assets.sortBy !== 'recent', $scope.community.assets.sortBy !== 'recent', scrollTo);

        } else {
          callback(false, false, null);

        }
      } else {
        callback(false, false, null);
      }
    };

    /**
     * Combine standard user data and activity metadata
     *
     * @param  {Object}           user                  User being rendered in profile
     * @param  {Boolean}          loadPreviousState     If true then inspect `crossToolRequest` for previous scroll position, etc.
     * @param  {Boolean}          isBrowseFeature       True if request was initiated via browse on Profile page.
     * @return {void}
     */
    var loadProfile = function(user, loadPreviousState, isBrowseFeature) {
      // Set default preferences
      $scope.user = user;
      _.extend($scope.user, _.cloneDeep(defaultUserPreferences));

      $scope.isMyProfile = user.id === me.id;

      // Sort section(s)
      $scope.user.canvasCourseSections = user.canvas_course_sections && user.canvas_course_sections.sort();

      $scope.showEngagementIndexBox = me.course.engagementindex_url &&
        !_.isUndefined(user.points) &&
        ($scope.isMyProfile || me.is_admin || (user.share_points && me.share_points));

      determineRank(user);

      getUserActivity(user.id);

      // We perform default queries (i.e., get recent user and community assets) no matter the value of 'loadPreviousState'. The
      // default queries are needed to calculate 'totalAssetsInCourse' of both user and community.
      sortUserAssets($scope.user.assets.sortBy, false, function() {
        sortCommunityAssets($scope.community.assets.sortBy, false, function() {
          // Load scroll and sort information
          unpackPreviousState(loadPreviousState, function(reloadUserAssets, reloadCommunityAssets, scrollTo) {
            if (loadPreviousState) {
              // The following operations will run in parallel
              async.series([
                function(callback) {
                  if (reloadUserAssets) {
                    sortUserAssets($scope.user.assets.sortBy, false, noOp);
                  }
                  callback();
                },
                function(callback) {
                  if (reloadCommunityAssets) {
                    sortCommunityAssets($scope.community.assets.sortBy, false, noOp);
                  }
                  callback();
                },
                function(callback) {
                  if (scrollTo) {
                    utilService.getScrollInformation().then(function(s) {
                      utilService.scrollTo(scrollTo, noOp);
                    });
                  }
                  callback();
                }
              ]);
            }
          });
        });
      });

      // Set page context information for activity timeline directive
      $scope.pageContext = {
        'course': me.course,
        'tool': 'dashboard',
        'id': user.id
      };

      // Track view of another user's profile
      if (!$scope.isMyProfile) {
        if (isBrowseFeature) {
          analyticsService.track('Browse another user profile using pagination feature', {
            'profile_user': user.id
          });
        } else {
          analyticsService.track('View user profile', {
            'profile_user': user.id,
            'referer': document.referrer
          });
        }
      }

      // Allow for searching and browsing of other users
      userFactory.getAllUsers(false, true).then(function(response) {
        var users = response.data;

        // Load interaction data for the course if not previously fetched
        if (!$scope.interactions.nodes.length) {
          profileFactory.getInteractionsForCourse().then(function(interactionsResponse) {
            $scope.interactions = {
              'nodes': _.filter(users, function(interactionsUser) {
                return (interactionsUser.canvas_course_role === 'Student' || interactionsUser.canvas_course_role === 'Learner');
              }),
              'linkTypes': interactionsResponse.data
            };
          });
        }

        // If user count is less than two (2) then exclude search/browse feature
        var count = $scope.userCount = users.length;
        if (count > 1) {
          // Default start position of browse
          $scope.browse.previous = users[0];
          $scope.browse.next = users[1];

          if (count === 2) {
            // 'me' might not be in the course. For example, 'me' is a Canvas admin.
            var meInCourse = !!_.find(users, {'id': me.id});

            if (meInCourse || (me.id !== user.id)) {
              // Browse forward (i.e., next) to toggle between two users
              $scope.browse.previous = null;
              $scope.browse.next = users[0].id === user.id ? users[1] : users[0];
            }

          } else {
            // Sort alphabetically
            _.sortBy(users, [ 'canvas_full_name' ]);

            // Search is available when the course has three (3) or more users.
            $scope.browse.otherUsers = _.reject(users, function(other, index) {
              var matching = (other.id === $scope.user.id);
              if (matching) {
                // We are name-centric when it comes to the start position of browse-other-users.
                $scope.browse.previous = users[index > 0 ? index - 1 : count - 1];
                $scope.browse.next = users[index === count - 1 ? 0 : index + 1];
              }
              return matching;
            });
          }
        }
      });
    };

    /**
     * Combine standard user data and activity metadata
     *
     * @param  {Object}           userId                Id of user being rendered in profile
     * @param  {Boolean}          considerScroll        If true then scroll down page per `crossToolRequest.scroll`
     * @param  {Boolean}          isBrowseFeature       True if request was initiated via browse on Profile page.
     * @return {void}
     */
    var loadProfileById = $scope.loadProfileById = function(userId, considerScroll, isBrowseFeature) {
      userFactory.getUser(userId).success(function(user) {
        loadProfile(user, considerScroll, isBrowseFeature);
      });
    };

    var referringState = $scope.referringState = function(elementId) {
      var state = [
        utilService.getScrollPosition(elementId),
        $scope.breakdown && $scope.breakdown.selected,
        $scope.user.assets.sortBy,
        $scope.community.assets.sortBy
      ];
      return _.join(state, '-');
    };

    /**
     * Update collaboration status for 'me'
     *
     * @return {void}
     */
    var updateLookingForCollaborators = $scope.updateLookingForCollaborators = function() {
      if ($scope.isMyProfile) {
        userFactory.updateLookingForCollaborators($scope.me.looking_for_collaborators);
      }
    };

    // Make user messaging available to the scope.
    $scope.messageUser = collaborationMessageService.messageUser;

    /**
     * Listen for pinning/unpinning events by 'me'
     */
    $scope.$on('assetPinEventByMe', function(ev, updatedAsset, pin) {
      if (pin) {
        analyticsService.track('Asset pinned on user profile page', {
          'asset_id': updatedAsset.id,
          'profile_user': $scope.user.id
        });
      }
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
          sortUserAssets($scope.user.assets.sortBy, false, noOp);
        }
      }
    });

    var init = function() {
      // Determine user
      var userId = $stateParams.userId || (crossToolRequest && crossToolRequest.id);
      var loadPreviousState = $stateParams.loadPreviousState !== 'false';

      if (userId) {
        loadProfileById(userId, loadPreviousState, false);
      } else {
        loadProfile(me, loadPreviousState, false);
      }
    };

    init();
  });

}(window.angular));
