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

  angular.module('collabosphere').factory('userFactory', function(utilService, $cacheFactory, $http) {

    /**
     * Get all users in the current course
     *
     * @return {Promise<User[]>}                  $http promise returning all users in the current course
     */
    var getAllUsers = function() {
      return $http.get(utilService.getApiUrl('/users'));
    };

    /**
     * Get user of current course by id
     *
     * @return {Promise<User[]>}                  $http promise returning user of the current course
     */
    var getUser = function(id) {
      return $http.get(utilService.getApiUrl('/users/id/' + id));
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
      return $http.post(utilService.getApiUrl('/users/me/share'), update).then(function() {
        // Remove the me object from the cache as its `share_points` value is now updated
        var $httpDefaultCache = $cacheFactory.get('$http');
        $httpDefaultCache.remove(utilService.getApiUrl('/users/me'));
      });
    };

    return {
      'getAllUsers': getAllUsers,
      'getUser': getUser,
      'getLeaderboard': getLeaderboard,
      'updateSharePoints': updateSharePoints
    };

  });

}(window.angular));
