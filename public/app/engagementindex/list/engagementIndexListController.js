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

  angular.module('collabosphere').controller('EngagementIndexListController', function(engagementIndexListFactory, userFactory, $scope) {

    // Variable that will keep track of the users in this course and their points
    $scope.users = null;

    /**
     * Get the students in the engagement index and their engagement
     * index points
     */
    var getUsers = function() {
      engagementIndexListFactory.getUsers().then(parseUsers);
    };

    /**
     * Prepare the list of users for rendering
     *
     * @param  {User[]}       users         The list of users in the course and their points
     */
    var parseUsers = function(users) {
      $scope.users = users;

      // TODO
      // drawBoxPlot();

      // Track that the engagement index tool has been loaded
      //analyticsService.track('Load Engagement Index Tool');
    };

    userFactory.getMe().success(function(me) {
      $scope.me = me;
      getUsers();
    });

  });

}(window.angular));
