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

  angular.module('collabosphere').controller('WhiteboardsCreateController', function(me, whiteboardsFactory, userFactory, $location, $scope) {

    // Make the me object available to the scope
    $scope.me = me;

    // Variable that will keep track of the new whiteboard to be created
    $scope.whiteboard = {};

    // Variable that will keep track of all the users in the course
    $scope.users = [];

    /**
     * Create a new whiteboard
     */
    var createWhiteboard = $scope.createWhiteboard = function() {
      whiteboardsFactory.createWhiteboard($scope.whiteboard).success(function() {
        $location.path('/whiteboards');
      });
    };

    /**
     * Get all users in the course
     */
    var getAllUsers = function() {
      // Filter ourselves out of the set of users who can be invited into the whiteboard
      userFactory.getAllUsers().then(function(response) {
        $scope.users = response.data.filter(function(user) {
          return (user.id != $scope.me.id);
        });
      });
    };

    getAllUsers();
  });

}(window.angular));
