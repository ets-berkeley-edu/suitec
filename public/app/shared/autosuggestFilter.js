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

  angular.module('collabosphere')

    // Register a custom filter that will return a slightly different DOM structure
    // for selected users in a user autosuggest
    .filter('usersSearch', [
      '$sce',
      function($sce) {
        return function(label, query, option) {
          var html = '';

          // Add the graduation cap if the selected user is an administrator
          if (option.is_admin) {
            html += '<i class="fa fa-graduation-cap"></i>';
          }

          // Add the selected user's name
          html += '<span>' + option.canvas_full_name + '</span>';

          // Add a close icon
          html += '<button type="button" class="btn btn-link pull-right close" tabindex="-1">';
          html += '  <i class="fa fa-times-circle"><span class="sr-only">Remove</span></i>';
          html += '</button>';

          return $sce.trustAsHtml(html);
        };
      }
    ])

    // Register a custom filter that will return a slightly different DOM structure
    // for displaying users in a user autosuggest list
    .filter('usersDropdown', [
      '$sce',
      function($sce) {
        return function(label, query, option) {
          var html = '';

          if (option.is_admin) {
            html += '<i class="fa fa-graduation-cap"></i> ';
          }

          html += label;

          return $sce.trustAsHtml(html);
        };
      }
    ]);
}(window.angular));
