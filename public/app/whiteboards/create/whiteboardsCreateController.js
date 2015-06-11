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

  angular.module('collabosphere')

    // A custom filter that will return a slightly different DOM structure for selected users
    .filter('whiteboardsCreateInviteSearch', ['$sce', function($sce) {
      return function(label) {
        var closeIcon = '<button class="btn btn-link pull-right close multiselect-search-list-item_selection-remove"><i class="fa fa-times-circle"><span class="sr-only">Remove</span></i></button>';

        return $sce.trustAsHtml(label + closeIcon);
      };
    }])

    .controller('WhiteboardsCreateController', function(whiteboardsCreateFactory, userFactory, $location, $scope) {

      // Variable that will keep track of the new whiteboard to be created
      $scope.whiteboard = {};

      // Variable that will keep track of the users that should be invited
      $scope.invitedUsers = [];

      // Variable that will keep track of all the users in the course
      $scope.users = [];

      /**
       * Create a new whiteboard
       */
      var createWhiteboard = $scope.createWhiteboard = function() {
        whiteboardsCreateFactory.createWhiteboard($scope.whiteboard).success(function() {
          $location.path('/whiteboards');
        });
      };

      /**
       * Get the users in the course
       */
      var getUsers = function() {
        // Get our own information first, so we can filter ourselves out of
        // the set of users who can be invited into the whiteboard
        userFactory.getMe()
          .then(function(me) {
            $scope.me = me.data;
            return userFactory.getUsers();
          })
          .then(function(response) {
            $scope.users = response.data.filter(function(user) {
              return (user.id != $scope.me.id);
            });
          });
      };

      getUsers();
    });

}(window.angular));
