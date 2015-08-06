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

  angular.module('collabosphere')

    // Register a custom filter that will return a slightly different DOM structure
    // for selected users in a user autosuggest
    .filter('usersSearch', ['$sce', function($sce) {
      return function(label, query, option) {
        var html = '';

        // Add the graduation cap if the selected user is an administrator
        if (option.is_admin) {
          html += '<i class="fa fa-graduation-cap"></i>';
        }

        // Add the selected user's name
        html += '<span>' + option.canvas_full_name + '</span>';

        // Add a close icon
        html += '<button type="button" class="btn btn-link pull-right close" tabindex=\"-1\">';
        html += '  <i class="fa fa-times-circle"><span class="sr-only">Remove</span></i>';
        html += '</button>';

        return $sce.trustAsHtml(html);
      };
    }])

    // Register a custom filter that will return a slightly different DOM structure
    // for displaying users in a user autosuggest list
    .filter('usersDropdown', ['$sce', function($sce) {
      return function(label, query, option) {
        var html = '';

        if (option.is_admin) {
          html += '<i class="fa fa-graduation-cap"></i> ';
        }

        html += label;

        return $sce.trustAsHtml(html);
      };
    }]);
}(window.angular));
