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

  angular.module('collabosphere').controller('PointsController', function(me, pointsFactory, $location, $scope) {

    // Make the me object available to the scope
    $scope.me = me;

    // Variable that will keep track of the saved activity type configuration
    $scope.activityTypeConfiguration = null;

    // Variable that will keep track of the activity type configuration before it is
    // modified. This will be used to revert to when the cancel button is clicked
    var cachedActivityTypeConfiguration = null;

    // Variable that will keep track of whether the activity type configuration is shown
    // in view or edit mode
    $scope.editMode = false;

    /**
     * Retrieve the activity type configuration for the current course
     */
    var getActivityTypeConfiguration = function() {
      pointsFactory.getActivityTypeConfiguration().success(function(activityTypeConfiguration) {
        $scope.activityTypeConfiguration = activityTypeConfiguration;
      });
    };

    /**
     * Check whether the activity type configuration contains any disabled activities. Disabled
     * activities are activities that will not generate activity points
     *
     * @return {Boolean}                            Whether the activity type configuration contains any disabled activities
     */
    var hasDisabledActivities = $scope.hasDisabledActivities = function() {
      if ($scope.activityTypeConfiguration) {
        for (var i = 0; i < $scope.activityTypeConfiguration.length; i++) {
          if ($scope.activityTypeConfiguration[i].enabled === false) {
            return true;
          }
        }
      }

      return false;
    };

    /**
     * Disable an activity type in the activity type configuration. These activities will not
     * generate activity points
     *
     * @param  {ActivityType}     activityType      The activity type to disable
     */
    var disableActivityType = $scope.disableActivityType = function(activityType) {
      activityType.enabled = false;
    };

    /**
     * Add an activity type back to the activity type configuration. These activities will generate
     * activity points
     *
     * @param  {ActivityType}     activityType      The activity type to enable
     */
    var enableActivityType = $scope.enableActivityType = function(activityType) {
      activityType.enabled = true;
    };

    /**
     * Change the activity type configuration to edit mode
     */
    var editActivityTypeConfiguration = $scope.editActivityTypeConfiguration = function() {
      // Cache the current activity type configuration. When changes are made and the
      // cancel button is clicked, we'll revert back to this cached configuration
      cachedActivityTypeConfiguration = angular.copy($scope.activityTypeConfiguration);
      // Switch to edit mode
      $scope.editMode = true;
    };

    /**
     * Cancel activity type configuration editing and revert back to the previous
     * activity type configuration
     */
    var cancelActivityTypeConfiguration = $scope.cancelActivityTypeConfiguration = function() {
      // Revert back to the cached points configuration
      $scope.activityTypeConfiguration = cachedActivityTypeConfiguration;
      // Switch to view mode
      $scope.editMode = false;
    };

    /**
     * Save the modified points configuration
     */
    var saveActivityTypeConfiguration = $scope.saveActivityTypeConfiguration = function() {
      // Switch to view mode
      $scope.editMode = false;
      // Convert the activity type configuration overrides to the expected format
      var activityTypeUpdates = $scope.activityTypeConfiguration.map(function(activityTypeOverride) {
        return {
          'type': activityTypeOverride.type,
          'points': activityTypeOverride.points,
          'enabled': activityTypeOverride.enabled
        };
      });
      pointsFactory.editActivityTypeConfiguration(activityTypeUpdates);
    };

    getActivityTypeConfiguration();

  });

}(window.angular));
