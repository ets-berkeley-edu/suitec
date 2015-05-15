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

  angular.module('collabosphere').controller('WhiteboardsListController', function(userFactory, utilService, whiteboardsListFactory, $scope) {

    $scope.whiteboards = [];
    $scope.list = {
      'page': 0,
      'isLoading': false
    };

    /**
     * Get the whiteboards to which the current user has access in the current course through an infinite scroll
     */
    var getWhiteboards = $scope.getWhiteboards = function() {
      // Indicate the no further REST API requests should be made
      // until the current request has completed
      $scope.list.isLoading = true;
      whiteboardsListFactory.getWhiteboards($scope.list.page).success(function(whiteboards) {
        $scope.whiteboards = $scope.whiteboards.concat(whiteboards.results);
        // Only request another page of results if the number of items in the
        // current result set is the same as the maximum number of items in a
        // retrieved asset library page
        if (whiteboards.results.length === 10) {
          $scope.list.isLoading = false;
        }
      });
      // Ensure that the next page is requested the next time
      $scope.list.page++;
    };

    /**
     * TODO
     */
    var openWhiteboard = $scope.openWhiteboard = function(whiteboard, $event) {
      var routeParams = utilService.getRouteParams();
      // TODO
      var url = '/whiteboards/' + whiteboard.id;
      url += '?api_domain=' + routeParams.api_domain;
      url += '&course_id=' + routeParams.course_id;
      url += '&tool_url=' + routeParams.tool_url;
      window.open(url, '_blank', 'width=1100, height=600, toolbar=no, titlebar=no, status=no, menubar=no, location=no');
      $event.preventDefault()
    };

    userFactory.getMe().success(function(me) {
      $scope.me = me;
    });

  });

}(window.angular));
