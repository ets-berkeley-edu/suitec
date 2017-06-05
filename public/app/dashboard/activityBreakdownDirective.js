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

  /**
   * Display an activity breakdown for a given dataset.
   */
  angular.module('collabosphere').directive('activityBreakdown', function() {
    return {
      // The directive matches attribute name only and does not overwrite the declaration in markup.
      // @see https://docs.angularjs.org/guide/directive#template-expanding-directive
      'restrict': 'A',

      // Define how the directive's scope is separated from the caller's scope.
      // @see https://docs.angularjs.org/guide/directive#isolating-the-scope-of-a-directive
      'scope': {
        'activityBreakdown': '=',
        'activityTotal': '=',
        'breakdownLabel': '=',
        'breakdownSelected': '@'
      },
      'templateUrl': '/app/dashboard/activityBreakdown.html',
      'link': function(scope, elem, attrs) {
        // Display names mapped to underlying activity types.
        var DISPLAY_ACTIVITY_TYPES = {
          'Views': ['view_asset', 'get_view_asset'],
          'Likes': ['like', 'get_like'],
          'Comments': ['asset_comment', 'get_asset_comment', 'get_asset_comment_reply'],
          'Posts': ['discussion_topic', 'discussion_entry'],
          'Replies': [ 'get_discussion_entry_reply' ],
          'Remixes': ['remix_whiteboard', 'get_remix_whiteboard'],
          'Add Assets': ['add_asset', 'whiteboard_add_asset'],
          'Asset Usage': [ 'get_whiteboard_add_asset' ],
          'Exports': [ 'export_whiteboard' ]
        };

        scope.$watch('activityBreakdown', function() {
          if (!scope.activityBreakdown) {
            return;
          }

          scope.segments = [];
          _.each(DISPLAY_ACTIVITY_TYPES, function(types, displayName) {
            // Get total count for all activity types that map to a given display name.
            var count = _.reduce(types, function(sum, type) {
              return sum + (scope.activityBreakdown[type] || 0);
            }, 0);

            if (count) {
              var cssClass = 'profile-activity-breakdown-segment-' + displayName.toLowerCase().replace(/\s/g, '-');
              scope.segments.push({
                'displayName': displayName,
                'cssClass': cssClass,
                'count': count,
                'percentage': _.round(100 * count / scope.activityTotal)
              });
            }
          });
        });
      }
    };
  });

}(window.angular));
