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

  angular.module('collabosphere').controller('PointsController', function(pointsFactory, userFactory, $location, $scope) {

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

    userFactory.getMe().success(function(me) {
      $scope.me = me;
      getActivityTypeConfiguration();
    });

  });

}(window.angular));
