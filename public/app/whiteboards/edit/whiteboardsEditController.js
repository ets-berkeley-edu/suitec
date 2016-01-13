/**
 * Copyright ©2016. The Regents of the University of California (Regents). All Rights Reserved.
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

  angular.module('collabosphere').controller('WhiteboardsEditController', function(me, userFactory, whiteboardsFactory, $scope) {

    // Make the me object available to the scope
    $scope.me = me;

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
        // The `closeModal` is added on the scope by the caller and allows
        // the caller to deal with the results coming out of the modal
        $scope.closeModal(updatedWhiteboard);
      });
    };

    /**
     * Get all users in the course
     */
    var getAllUsers = function() {
      userFactory.getAllUsers().then(function(response) {
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
