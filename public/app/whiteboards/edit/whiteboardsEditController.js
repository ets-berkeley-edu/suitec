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

  angular.module('collabosphere').controller('WhiteboardsEditController', function(me, userFactory, whiteboardsFactory, $scope, $window) {

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
     *
     * @return {void}
     */
    var editWhiteboard = $scope.editWhiteboard = function() {
      // Warn if the user has removed him/herself from the whiteboard, unless user is admin
      if (!$scope.me.is_admin &&
          !_.includes($scope.updatedWhiteboard.members, $scope.me.id) &&
          !confirm('Are you sure you want to remove yourself from this whiteboard?')) {
        return;
      }
      whiteboardsFactory.editWhiteboard($scope.whiteboard.id, $scope.updatedWhiteboard).then(function(response) {
        // The `closeModal` is added on the scope by the caller and allows
        // the caller to deal with the results coming out of the modal
        $scope.closeModal(response.data);
      }, function(err) {
        // An edit action may cause a user to lose whiteboard access
        if (err.status === 404) {
          $scope.closeModal({
            'notFound': true
          });
        }
      });
    };

    /**
     * Delete the current whiteboard
     *
     * @return {void}
     */
    var deleteWhiteboard = $scope.deleteWhiteboard = function() {
      if (confirm('Are you sure you want to delete this whiteboard?')) {
        whiteboardsFactory.deleteWhiteboard($scope.whiteboard.id).then(function() {
          // Refresh the whiteboard list and close this whiteboard
          if ($window.opener) {
            $window.opener.refreshWhiteboardList();
          }
          $window.close();
        }, function(err) {
          alert('There was an error deleting the whiteboard.');
        });
      }
    };

    /**
     * Get all users in the course
     *
     * @return {void}
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
