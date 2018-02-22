/**
 * Copyright ©2018. The Regents of the University of California (Regents). All Rights Reserved.
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

  angular.module('collabosphere').factory('courseFactory', function(utilService, $cacheFactory, $http) {

    /**
     * Get attributes for a course
     *
     * @return {Promise}                          $http promise
     */
    var getCourse = function() {
      return $http.get(utilService.getApiUrl('/course'));
    };

    /**
     * Get active courses associated with the current user's Canvas ID
     *
     * @param  {Object}     opts                      A set of options to filter on
     * @param  {Boolean}    [opts.admin]              Whether to only return courses in which the user is an admin
     * @param  {Boolean}    [opts.assetLibrary]       Whether to only return courses in which the asset library is enabled
     * @param  {Boolean}    [opts.excludeCurrent]     Whether to exclude the current course
     * @return {Promise}                              $http promise
     */
    var getCourses = function(opts) {
      var url = '/courses';
      if (opts) {
        var params = [];
        if (opts.admin) {
          params.push('admin=true');
        }
        if (opts.assetLibrary) {
          params.push('assetLibrary=true');
        }
        if (opts.excludeCurrent) {
          params.push('excludeCurrent=true');
        }
        if (params.length) {
          url = url + '?' + params.join('&');
        }
      }
      return $http.get(utilService.getApiUrl(url));
    };

    /**
     * Mark a course as active
     *
     * @return {Promise}                        $http promise
     */
    var activateCourse = function() {
      return $http.post(utilService.getApiUrl('/course/activate')).then(function() {
        // Remove the me object from the cache as its `course.active` value is now updated
        var $httpDefaultCache = $cacheFactory.get('$http');
        $httpDefaultCache.remove(utilService.getApiUrl('/users/me'));
      });
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
      'getCourses': getCourses,
      'activateCourse': activateCourse,
      'updateDailyNotifications': updateDailyNotifications,
      'updateWeeklyNotifications': updateWeeklyNotifications
    };

  });

}(window.angular));
