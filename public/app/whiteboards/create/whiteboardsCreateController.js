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

    // Register a custom filter that will return a slightly different DOM structure
    // for selected users in the invite autosuggest
    .filter('whiteboardsCreateInviteSearch', ['$sce', function($sce) {
      return function(label, query, option) {
        var html = '';

        // Add the graduation cap if the selected user is an administrator
        if (option.is_admin) {
          html += '<span class="whiteboards-create-list-item-admin"><i class="fa fa-graduation-cap"></i></span>';
        }

        // Add the selected user's name
        html += '<span>' + option.canvas_full_name + '</span>';

        // Add a close icon
        html += '<button class="btn btn-link pull-right close" tabindex=\"-1\">';
        html += '  <i class="fa fa-times-circle"><span class="sr-only">Remove</span></i>';
        html += '</button>';

        return $sce.trustAsHtml(html);
      };
    }])

    // Register a custom filter that will return a slightly different DOM structure
    // for displaying users in the invite autosuggest list
    .filter('whiteboardsCreateInviteDropdown', ['$sce', function($sce) {
      return function(label, query, option) {
        var html = '';

        if (option.is_admin) {
          html += '<i class="fa fa-graduation-cap"></i> ';
        }

        html += label;

        return $sce.trustAsHtml(html);
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
