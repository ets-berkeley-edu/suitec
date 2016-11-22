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
