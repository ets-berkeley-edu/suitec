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

  angular.module('collabosphere').controller('WhiteboardsCreateController', function(me, whiteboardsFactory, userFactory, $location, $scope) {

    // Make the me object available to the scope
    $scope.me = me;

    // Variable that will keep track of the new whiteboard to be created
    $scope.whiteboard = {};

    // Variable that will keep track of all the users in the course
    $scope.users = [];

    /**
     * Create a new whiteboard
     *
     * @return {void}
     */
    var createWhiteboard = $scope.createWhiteboard = function() {
      whiteboardsFactory.createWhiteboard($scope.whiteboard).success(function() {
        $location.path('/whiteboards');
      });
    };

    /**
     * Get all users in the course
     *
     * @return {void}
     */
    var getAllUsers = function() {
      // Filter ourselves out of the set of users who can be invited into the whiteboard
      userFactory.getAllUsers().then(function(response) {
        $scope.users = response.data.filter(function(user) {
          return (user.id !== $scope.me.id);
        });
      });
    };

    getAllUsers();
  });

}(window.angular));
