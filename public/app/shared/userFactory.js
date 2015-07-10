/*!
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

  angular.module('collabosphere').factory('userFactory', function(utilService, $http) {

    /**
     * Retrieve the profile information for the current user
     *
     * @return {Promise<Me>}                      Promise returning the profile information for the current user
     */
    var getMe = function() {
      return $http.get(utilService.getApiUrl('/users/me'), {'cache': true});
    };

    /**
     * Get all users in the current course
     *
     * @return {Promise<User[]>}                  $http promise returning all users in the current course
     */
    var getAllUsers = function() {
      return $http.get(utilService.getApiUrl('/users'));
    };

    /**
     * Get the users in the current course and their points
     *
     * @return {Promise<User[]>}                  $http promise returning the users in the current course and their points
     */
    var getLeaderboard = function() {
      return $http.get(utilService.getApiUrl('/users/leaderboard'))
        .then(function(response) {
          var users = response.data;

          // Order the users by points
          users = users.sort(function(a, b) {
            return b.points - a.points;
          });

          // Add the rank information onto each user
          if (users[0]) {
            users[0].rank = 1;
          }
          for (var i = 1; i < users.length; i++) {
            // Users with the same score will have the same rank
            if (users[i].points === users[i - 1].points) {
              users[i].rank = users[i - 1].rank;
            } else {
              users[i].rank = (i + 1);
            }
          }

          return users;
        });
    };

    /**
     * Update the points share status for a user. This will determine whether the user's
     * points are shared with the course
     *
     * @param  {Boolean}            share         Whether the user's points should be shared with the course
     * @return {Promise}                          $http promise
     */
    var updateSharePoints = function(share) {
      var update = {
        'share': share
      };
      return $http.post(utilService.getApiUrl('/users/me/share'), update);
    };

    return {
      'getMe': getMe,
      'getAllUsers': getAllUsers,
      'getLeaderboard': getLeaderboard,
      'updateSharePoints': updateSharePoints
    };

  });

}(window.angular));
