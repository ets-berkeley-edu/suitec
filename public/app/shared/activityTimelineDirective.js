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
  angular.module('collabosphere').directive('activityTimeline', function(utilService, $interval) {
    return {
      // The directive matches attribute name only and does not overwrite the declaration in markup.
      // @see https://docs.angularjs.org/guide/directive#template-expanding-directive
      'restrict': 'A',

      // Define how the directive's scope is separated from the caller's scope.
      // @see https://docs.angularjs.org/guide/directive#isolating-the-scope-of-a-directive
      'scope': {
        'activityTimeline': '=',
        'labelsWidth': '='
      },
      'link': function(scope, elem, attrs) {
        var start = Date.now();
        var end = Date.now();
        var eventsByCategory = [];

        _.forEach(scope.activityTimeline, function(eventSeries, category) {
          eventSeries = eventSeries || [];
          if (eventSeries.length) {
            var firstEventDate = new Date(eventSeries[0].date);
            start = _.min([start, firstEventDate]);
            console.log(start);
          }
          eventsByCategory.push({
            'name': category,
            'data': eventSeries
          });
        });

        var chart = d3.select(elem[0]).datum(eventsByCategory);

        var color = d3.scale.category20();

        var drawTimeline = d3.chart.eventDrops()
          .eventLineColor(function(datum, index) {
            return color(index);
          })
          .start(start)
          .end(end)
          .date(function(event) {
            return new Date(event.date);
          })
          .margin({
            'top': 0,
            'left': 0,
            'bottom': 0,
            'right': 0
          })
          .labelsWidth(scope.labelsWidth || 0);

        drawTimeline(chart);

        d3.selectAll('.label').classed('activity-timeline-label', true);
      }
    };
  });

}(window.angular));
