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

  angular.module('collabosphere').controller('WhiteboardsEditController', function(userFactory, whiteboardsFactory, $scope) {

    // Variable that will keep track of all the users in the course
    $scope.users = [];

    // Variable that will keep track of the updated whiteboard
    $scope.updatedWhiteboard = {
      'title': $scope.whiteboard.title
    };

    /**
     * Edit the current whiteboard
     */
    var editWhiteboard = $scope.editWhiteboard = function() {
      whiteboardsFactory.editWhiteboard($scope.whiteboard.id, $scope.updatedWhiteboard).success(function(updatedWhiteboard) {
        // Pass the updated whiteboard back to where the modal dialog was invoked
        $scope.closeModal(updatedWhiteboard);
      });
    };

    /**
     * Get all users in the course
     */
    var getAllUsers = function() {
      // Get our own information first, so we can filter ourselves out of
      // the set of users who can be invited into the whiteboard
      userFactory.getMe()
        .then(function(me) {
          $scope.me = me.data;
          return userFactory.getAllUsers();
        })
        .then(function(response) {
          $scope.users = response.data;

          // Prefill the updated members with the current whiteboard members
          $scope.updatedWhiteboard.members = [];
          for (var i = 0; i < $scope.whiteboard.members.length; i++) {
            $scope.updatedWhiteboard.members.push($scope.whiteboard.members[i].id);
          }
        });
    };

    getAllUsers();

  });

}(window.angular));
