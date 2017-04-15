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

  angular.module('collabosphere').controller('WhiteboardsListController', function(me, analyticsService, utilService, whiteboardsFactory, $scope, $window) {

    // Variable that keeps track of the search options, initially blank. These will be bound to the whiteboards
    // search directive and updated when the user makes changes to the input fields.
    $scope.searchOptions = {
      'includeDeleted': false,
      'keywords': '',
      'user': ''
    };

    /**
     * Initialize values when whiteboard list is launched or refreshed
     *
     * @return {void}
     */
    var initializeWhiteboardList = function() {
      // Variable that will keep track of whether the initial whiteboard list request has taken place
      $scope.hasRequested = false;
      $scope.whiteboards = [];
      $scope.list = {
        'page': 0,
        'ready': true
      };

      // Variable that keeps track of whether the search component is in the advanced view state. Like the
      // search options above, this is initialized from state parameters, then bound to the whiteboards search
      // directive to be updated on user action.
      $scope.isAdvancedSearch = false;
      if ($scope.searchOptions.user) {
        $scope.isAdvancedSearch = true;
      }

      // Variable that keeps track of whether a search is being performed
      $scope.isSearch = false;
      if ($scope.searchOptions.includeDeleted || $scope.searchOptions.keywords || $scope.searchOptions.user) {
        $scope.isSearch = true;
      }
    };

    initializeWhiteboardList();

    // Make the me object available to the scope
    $scope.me = me;

    $scope.popupBlocked = false;
    $scope.deepLinkedWhiteboard = {};

    // Check whether a whiteboard was deep linked (from an email or the syllabus).
    // NOTE: Deep linking to whiteboards requires our custom 'getParentUrlData' event in the hosting Canvas instance.
    if (window.parent) {
      utilService.getParentUrlData(function(data) {
        if (data.whiteboard) {
          var whiteboardId = parseInt(data.whiteboard, 10);

          // Track the whiteboard deep link
          analyticsService.track('Deep link whiteboard', {
            'whiteboard_id': whiteboardId,
            'referer': document.referrer
          });

          // Trigger the whiteboard as a popup
          $scope.deepLinkedWhiteboard = {
            'id': whiteboardId
          };
          var popup = $window.open(generateWhiteboardURL($scope.deepLinkedWhiteboard));

          // Unfortunately, some browsers will block the popup as it wasn't launched from a trusted
          // user event. If that's the case, the returned value will be null
          if (!popup) {
            $scope.popupBlocked = true;
          }
        }
      });
    }

    /**
     * Get the whiteboards to which the current user has access in the current
     * course through an infinite scroll
     *
     * @return {void}
     */
    var getWhiteboards = $scope.getWhiteboards = function() {
      // Indicate that no further REST API requests should be made
      // until the current request has completed
      $scope.list.ready = false;
      whiteboardsFactory.getWhiteboards($scope.list.page, $scope.searchOptions).success(function(whiteboards) {
        $scope.whiteboards = $scope.whiteboards.concat(whiteboards.results);
        $scope.hasRequested = true;
        // Only request another page of results if the number of items in the
        // current result set is the same as the maximum number of items in a
        // retrieved asset library page
        if (whiteboards.results.length === 10) {
          $scope.list.ready = true;
        }
      });
      // Ensure that the next page is requested the next time
      $scope.list.page++;
    };

    /**
     * Generate the full URL for a whiteboard. This includes the launch parameters that were passed in
     * when the LTI tool was launched
     *
     * @param  {Whiteboard}       whiteboard          The whiteboard for which to generate the full URL
     * @return {String}                               The full whiteboard URL
     */
    var generateWhiteboardURL = $scope.generateWhiteboardURL = function(whiteboard) {
      var launchParams = utilService.getLaunchParams();
      var url = '/whiteboards/' + whiteboard.id;
      url += '?api_domain=' + launchParams.apiDomain;
      url += '&course_id=' + launchParams.courseId;
      url += '&tool_url=' + launchParams.toolUrl;
      return url;
    };

    // Refresh function defined on the window object so that child windows can call it
    $window.refreshWhiteboardList = function() {
      initializeWhiteboardList();
      getWhiteboards();
    };

    /**
     * Listen for a search event
     */
    $scope.$on('whiteboardsSearchSearch', function(ev, searchOptions) {
      $scope.searchOptions = searchOptions;
      $window.refreshWhiteboardList();
    });
  });

}(window.angular));
