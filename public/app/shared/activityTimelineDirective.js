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
   * Display an activity timeline for a given dataset.
   */
  angular.module('collabosphere').directive('activityTimeline', function(utilService, $interval, $timeout) {
    return {
      // The directive matches attribute name only and does not overwrite the declaration in markup.
      // @see https://docs.angularjs.org/guide/directive#template-expanding-directive
      'restrict': 'A',

      // Define how the directive's scope is separated from the caller's scope.
      // @see https://docs.angularjs.org/guide/directive#isolating-the-scope-of-a-directive
      'scope': {
        'activityTimeline': '=',
        'timelineId': '@',
        'labelsWidth': '='
      },
      'templateUrl': '/app/shared/activityTimeline.html',
      'link': function(scope, elem, attrs) {
        var start = Date.now();
        var end = Date.now();
        _.forEach(scope.activityTimeline, function(eventSeries) {
          eventSeries.data = eventSeries.data || [];
          if (eventSeries.data.length) {
            var firstEventDate = new Date(eventSeries.data[0].date);
            start = _.min([start, firstEventDate]);
          }
        });

        // Determine precision of x-axis tick values and format appropriately.
        var tickFormat = function(date) {
          var formatter;
          if (d3.timeSecond(date) < date) {
            formatter = d3.timeFormat('.%L');
          } else if (d3.timeMinute(date) < date) {
            formatter = d3.timeFormat(':%S');
          } else if (d3.timeHour(date) < date) {
            formatter = d3.timeFormat('%H:%M');
          } else if (d3.timeDay(date) < date) {
            formatter = d3.timeFormat('%H:00');
          } else if (d3.timeMonth(date) < date) {
            formatter = (d3.timeWeek(date) < date) ? d3.timeFormat('%a %d') : d3.timeFormat('%b %d');
          } else if (d3.timeYear(date) < date) {
            formatter = d3.timeFormat('%B');
          } else {
            formatter = d3.timeFormat('%Y');
          }
          return formatter(date);
        };

        var eventDropsChart = eventDrops.default()
          .eventLineColor(function(datum, index) {
            return scope.activityTimeline[index].color;
          })
          .start(start)
          .end(end)
          .date(function(event) {
            return new Date(event.date);
          })
          .tickFormat(tickFormat)
          .margin({
            'top': 0,
            'left': 0,
            'bottom': 0,
            'right': 0
          })
          // Disallow indefinite zoom-out.
          .minScale(1)
          .labelsWidth(scope.labelsWidth || 0);

        var drawTimeline = function(element) {
          element = d3.select(element);
          element.datum(scope.activityTimeline);
          element.call(eventDropsChart);

          element.selectAll('.label').classed('profile-activity-timeline-label', true);

          var nodes = element.nodes();
          var zoom = nodes[0].zoom;
          // Disable zoom events triggered by the mouse wheel.
          zoom.filter(function() { return !event.button && event.type !== 'wheel'; });
          // Make programmatic zoom events available to the scope.
          scope.zoom = function(scale) {
            element.select('.event-drops-chart')
              .transition()
              .duration(300)
              .call(zoom.scaleBy, scale);
          };
        };

        // Do not start drawing the timeline until timelineId has been interpolated in markup. This will ensure that
        // d3 events are bound to the right element.
        var waitForTimelineElement = function() {
          var timelineElement = document.getElementById(scope.timelineId);
          if (!timelineElement) {
            $timeout(waitForTimelineElement, 0, false);
            return;
          }

          drawTimeline(timelineElement);
        };

        waitForTimelineElement();
      }
    };
  });

}(window.angular));
