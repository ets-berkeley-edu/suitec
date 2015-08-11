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

  angular.module('collabosphere').controller('WhiteboardsBoardContainerController', function(whiteboardsFactory, $rootScope, $scope, $stateParams) {

    // Variable that will keep track of the current whiteboard id
    var whiteboardId = $stateParams.whiteboardId;

    // Variable that will keep track of the current whiteboard
    $scope.whiteboard = null;

    /**
     * Get the current whiteboard. This will include the number of online people, as well
     * as the content of the whiteboard
     */
    var getWhiteboard = function() {
      whiteboardsFactory.getWhiteboard(whiteboardId).success(function(whiteboard) {
        $scope.whiteboard = whiteboard;

        // Set the title of the window to the title of the whiteboard
        $rootScope.header = whiteboard.title;
      });
    };

    getWhiteboard();

  });

}(window.angular));
