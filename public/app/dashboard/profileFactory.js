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

  angular.module('collabosphere').factory('profileFactory', function(utilService, $http) {

    /**
     * Edit user profile
     *
     * @param  {Object}          user      The user properties
     * @return {Promise}                   $http promise
     */
    var editProfile = function(user) {
      return $http.post(utilService.getApiUrl('/users/me/personal_bio'), {'personalBio': user.personal_bio});
    };

    /**
     * Get activities for a user
     *
     * @param  {Number}               userId      User id for which activities should be returned
     * @return {Promise}                          $http promise
     */
    var getActivitiesForUser = function(userId) {
      var path = '/activities/user/' + userId;
      return $http.get(utilService.getApiUrl(path));
    };

    /**
     * Get interaction data for a user
     *
     * @return {Promise}                          $http promise
     */
    var getInteractionsForCourse = function() {
      var path = '/activities/interactions';
      return $http.get(utilService.getApiUrl(path));
    };

    return {
      'editProfile': editProfile,
      'getActivitiesForUser': getActivitiesForUser,
      'getInteractionsForCourse': getInteractionsForCourse
    };
  });

}(window.angular));
