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

  angular.module('collabosphere').factory('pointsFactory', function(utilService, $http) {

    /**
     * Get the activity type configration for the current course
     *
     * @return {Promise<ActivityType[]>}                              $http promise returning the activity type configration for the current course
     */
    var getActivityTypeConfiguration = function() {
      return $http.get(utilService.getApiUrl('/activities/configuration'));
    };

    /**
     * Edit the activity type configration for the current course. The provided activity
     * type configuration overrides will override the default activity type configuration
     *
     * @param  {Object[]}         activityTypeUpdates                 Activity type configuration overrides that should be aplied to the activity type configuration for the course
     * @param  {String}           activityTypeUpdates.type            The type of the activity type configuration override. One of the types in `col-activities/lib/constants.js`
     * @param  {Number}           [activityTypeUpdates.points]        The number of points this activity type should contribute towards a user's points
     * @param  {Boolean}          [activityTypeUpdates.enabled]       Whether activities of this type should contributed towards a user's points
     * @return {Promise<ActivityType[]>}                              $http promise returning the activity type configration for the current course
     */
    var editActivityTypeConfiguration = function(activityTypeUpdates) {
      return $http.post(utilService.getApiUrl('/activities/configuration'), activityTypeUpdates);
    };

    return {
      'getActivityTypeConfiguration': getActivityTypeConfiguration,
      'editActivityTypeConfiguration': editActivityTypeConfiguration
    };

  });

}(window.angular));
