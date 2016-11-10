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

  angular.module('collabosphere').factory('courseFactory', function(utilService, $http) {

    /**
     * Get attributes for a course
     *
     * @return {Promise}                          $http promise
     */
    var getCourse = function() {
      return $http.get(utilService.getApiUrl('/course'));
    };

    /**
     * Update the daily notification settings for a course
     *
     * @param  {Boolean}        enabled         Whether daily notifications should be enabled for the course
     * @return {Promise}                        $http promise
     */
    var updateDailyNotifications = function(enabled) {
      var update = {
        'enabled': enabled
      };
      return $http.post(utilService.getApiUrl('/course/daily_notifications'), update);
    };

    /**
     * Update the weekly notification settings for a course
     *
     * @param  {Boolean}        enabled         Whether weekly notifications should be enabled for the course
     * @return {Promise}                        $http promise
     */
    var updateWeeklyNotifications = function(enabled) {
      var update = {
        'enabled': enabled
      };
      return $http.post(utilService.getApiUrl('/course/weekly_notifications'), update);
    };

    return {
      'getCourse': getCourse,
      'updateDailyNotifications': updateDailyNotifications,
      'updateWeeklyNotifications': updateWeeklyNotifications
    };

  });

}(window.angular));
