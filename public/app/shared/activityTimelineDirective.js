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
  angular.module('collabosphere').directive('activityTimeline', function(utilService, $compile, $interval, $templateCache, $timeout) {
    return {
      // The directive matches attribute name only and does not overwrite the declaration in markup.
      // @see https://docs.angularjs.org/guide/directive#template-expanding-directive
      'restrict': 'A',

      // Define how the directive's scope is separated from the caller's scope.
      // @see https://docs.angularjs.org/guide/directive#isolating-the-scope-of-a-directive
      'scope': {
        'activityTimeline': '=',
        'labelsWidth': '=',
        'pageContext': '=',
        'timelineId': '@'
      },
      'templateUrl': '/app/shared/activityTimeline.html',
      'link': function(scope, elem, attrs) {
        var MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

        // Default to showing at least one day of activity, even if no events go back that far.
        var start = Date.now() - MILLISECONDS_PER_DAY;
        var end = Date.now();

        _.forEach(scope.activityTimeline, function(eventSeries) {
          eventSeries.data = eventSeries.data || [];
          if (eventSeries.data.length) {
            var firstEventDate = new Date(eventSeries.data[0].date);
            start = _.min([start, firstEventDate]);
          }
        });

        var totalDays = parseFloat(end - start) / MILLISECONDS_PER_DAY;

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

        var ARROW_OFFSET = 25;

        var FRIENDLY_DESCRIPTIONS = {
          'add_asset': 'Added Asset to Library',
          'asset_comment': 'Comment:',
          'discussion_entry': 'Posted Discussion',
          'discussion_topic': 'Posted Discussion',
          'export_whiteboard': 'Exported Whiteboard',
          'get_asset_comment': 'Comment:',
          'get_asset_comment_reply': 'Comment:',
          'get_discussion_entry_reply': 'Posted Discussion',
          'get_like': 'Liked Asset',
          'get_remix_whiteboard': 'Remixed Whiteboard',
          'get_view_asset': 'Viewed Asset',
          'get_whiteboard_add_asset': 'Added Asset to Whiteboard',
          'like': 'Liked Asset',
          'remix_whiteboard': 'Remixed Whiteboard',
          'view_asset': 'Viewed Asset',
          'whiteboard_add_asset': 'Added Asset to Whiteboard'
        };

        var showEventDetails = function(activity) {
          // Hide any existing event details.
          d3.select('.activity-timeline-chart').selectAll('.event-details').remove();

          // Make activity available to the scope.
          scope.activity = activity;

          // Format properties for display.
          scope.display = {
            'date': d3.timeFormat('%B %d, %Y @ %H:%M')(new Date(activity.date)),
            'description': FRIENDLY_DESCRIPTIONS[activity.type]
          };

          if (activity.asset) {
            scope.display.title = activity.asset.title;
          } else {
            scope.display.title = scope.description;
          }

          if (activity.comment && activity.comment.body) {
            scope.display.comment = true;
            if (activity.comment.body.length > 100) {
              scope.display.snippet = activity.comment.body.substring(0, 100);
            }
          } else if (activity.type === 'get_like' || activity.type === 'like') {
            scope.display.like = true;
          } else if (activity.type === 'get_view_asset' || activity.type === 'view_asset') {
            scope.display.view = true;
          }

          // The details window starts out hidden...
          var eventDetails = d3
            .select('.activity-timeline-chart')
            .append('div')
            .attr('class', 'event-details')
            .style('opacity', 0);

          // ...and transitions to visible.
          eventDetails
            .transition(d3.transition().duration(250).ease(d3.easeLinear))
            .on('start', function() {
              d3.select('.event-details').style('display', 'block');
            })
            .style('opacity', 1);

          // The location of the arrow element depends on which side of the chart we're on.
          var pageX = d3.event.pageX;
          var pageY = d3.event.pageY;

          var eventDetailsWidth = eventDetails.node().getBoundingClientRect().width;
          var direction = pageX > eventDetailsWidth ? 'right' : 'left';

          var left = direction === 'right' ?
            pageX - eventDetailsWidth + ARROW_OFFSET :
            pageX - ARROW_OFFSET;

          eventDetails
            .style('left', (left + 'px'))
            .style('top', (pageY + 16 + 'px'))
            .classed(direction, true);

          // Add template HTML and compile in the scope.
          eventDetails.append(function() {
            var detailsDiv = document.createElement('div');
            detailsDiv.innerHTML = $templateCache.get('/app/shared/activityTimelineEventDetails.html');
            $compile(detailsDiv)(scope);
            return detailsDiv;
          });
        };

        var hideEventDetails = function() {
          d3.select('.event-details')
            .transition(d3.transition().duration(2000).ease(d3.easeExpIn))
            .on('end', function() {
              this.remove();
            })
            .style('opacity', 0);
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
          .labelsWidth(scope.labelsWidth || 0)
          .mouseover(showEventDetails)
          .mouseout(hideEventDetails);

        var drawTimeline = function(element) {
          element = d3.select(element);
          element.datum(scope.activityTimeline);
          element.call(eventDropsChart);

          var timelineWidth = element.node().getBoundingClientRect().width;

          element.selectAll('.label').classed('activity-timeline-label', true);

          var nodes = element.nodes();
          var zoom = nodes[0].zoom;
          // Disable zoom events triggered by the mouse wheel.
          zoom.filter(function() { return !event.button && event.type !== 'wheel'; });

          // Make programmatic zoom events available to the scope.
          var zoomTransition = function() {
            return element.select('.chart-wrapper').transition().duration(300);
          };

          scope.zoomRelative = function(scale) {
            zoomTransition().call(zoom.scaleBy, scale);
          };

          var zoomDays = function(days) {
            var scaleFactor = totalDays / days;
            var translateX = (1 - scaleFactor) * timelineWidth;
            var transform = d3.zoomIdentity.translate(translateX, 0).scale(scaleFactor);
            zoomTransition().call(zoom.transform, transform);
          };

          var isZoomingToPreset = false;

          scope.zoomPreset = function(preset) {
            isZoomingToPreset = true;
            switch (preset) {
              case 'week':
                zoomDays(7);
                break;
              case 'month':
                zoomDays(30);
                break;
              case 'all':
                zoomTransition().call(zoom.transform, d3.zoomIdentity);
                break;
              default:
            }
            // Disable whichever zoom preset button was just clicked.
            scope.currentZoomPreset = preset;
          };

          // All zoom presets should be re-enabled on the next user zoom.
          zoom.on('end', function() {
            if (!isZoomingToPreset) {
              scope.currentZoomPreset = null;
            } else {
              isZoomingToPreset = false;
            }
          });

          scope.zoomPreset('all');
        };

        // Do not start drawing the timeline until timelineId has been interpolated in markup. This will ensure that
        // d3 events are bound to the right element.
        var drawTimelineWhenAvailable = function() {
          var timelineElement = document.getElementById(scope.timelineId);
          if (!timelineElement) {
            $timeout(drawTimelineWhenAvailable, 0, false);
            return;
          }

          drawTimeline(timelineElement);
        };

        drawTimelineWhenAvailable();

        // Redraw the timeline when the window is resized.
        d3.select(window).on('resize', function() {
          drawTimelineWhenAvailable();
        });
      }
    };
  });

}(window.angular));
