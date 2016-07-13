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

  /*!
   * The infinite scroll directive can be used to add infinite scrolling functionality to
   * a container. The following attributes should be applied to the infinite scrolling container:
   *
   * @param  {Function}       infinite-scroll               The function that fetches the next set of results
   * @param  {String}         [infinite-scroll-container]   `window` if the next set of results should be fetched when the user scroll approaches the end of the page. Otherwise, the id of the element in which the user scroll should approach the end before loading the next set of results
   * @param  {Number}         [infinite-scroll-distance]    The distance in pixels between the current scroll position within the scroll container and the end of the scroll container at which the next set of results will be loaded. Defaults to 400px
   * @param  {String}         [infinite-scroll-direction]   The direction of the infinite scroll. One of `bottom` or `top`. Defaults to `bottom`
   * @param  {Boolean}        infinite-scroll-ready         Whether the infinite scroll container is ready to load more results.
   */
  angular.module('collabosphere').directive('infiniteScroll', function(utilService, $interval) {
    return {
      // Restrict the directive to only match attribute names.
      // @see https://docs.angularjs.org/guide/directive#template-expanding-directive
      'restrict': 'A',

      // Define how the directive's scope is separated from the caller's scope.
      // @see https://docs.angularjs.org/guide/directive#isolating-the-scope-of-a-directive
      'scope': {
        'infiniteScroll': '&',
        'infiniteScrollContainer': '@',
        'infiniteScrollDistance': '=',
        'infiniteScrollDirection': '@',
        'infiniteScrollReady': '='
      },
      'link': function(scope, elem, attrs) {
        // Default the distance to the bottom of the page at which further results are loaded
        var infiniteScrollDistance = scope.infiniteScrollDistance || 400;

        // Default whether infinite scrolling should happen against the window or the current element
        var infiniteScrollContainer = scope.infiniteScrollContainer || 'window';

        // Default whether infinite scrolling should happen against the bottom or the top of the scroll container
        var infiniteScrollDirection = scope.infiniteScrollDirection || 'bottom';

        // Cache the infinite scroll container when a container other than the browser window has been supplied
        if (infiniteScrollContainer !== 'window') {
          infiniteScrollContainer = document.getElementById(infiniteScrollContainer);
        }

        if (infiniteScrollDirection === 'top') {
          // Variable that will keep track of what the original scroll offset to the bottom of
          // the container is when requesting new data to add to the container
          var oldOffsetToBottom = 0;

          // Watch the height of the container (i.e., data gets added or rendered) and re-adjust the
          // scroll position to where it was at the time extra data was requested. This makes it look
          // like data was simply added on top
          scope.$watch(function() {
            return infiniteScrollContainer.scrollHeight;
          }, function(newValue, oldValue) {
            if (newValue != oldValue) {
              infiniteScrollContainer.scrollTop = infiniteScrollContainer.scrollHeight - oldOffsetToBottom;
            }
          });
        }

        /**
         * Load the next set of results in the infinite scroll instance
         */
        var handleInfiniteScrollLoad = function() {
          scope.infiniteScroll();
        };

        /**
         * Check whether the next set of results should be loaded. The next set of results should only be loaded
         * when the infinite scroll instance is ready to accept more results and when the edge of the page or element
         * is close enough
         *
         * @param  {Number}         scrollToBottom            When the browser window was supplied as the infiniteScrollContainer, the distance between the bottom of the browser and the bottom of the page. Otherwise, the distance between the bottom of the infinite scroll container and the current scroll position within that container
         * @param  {Number}         scrollPosition            When the browser window was supplied as the infiniteScrollContainer, the distance between the top of the browser and the top of the page. Otherwise, the distance between the top of the infinite scroll container and the current scroll position within that container
         */
        var checkInfiniteScrollLoad = function(scrollToBottom, scrollPosition) {
          if (scope.infiniteScrollReady && (
            (infiniteScrollDirection === 'bottom' && scrollToBottom < infiniteScrollDistance) ||
            (infiniteScrollDirection === 'top' && scrollPosition < infiniteScrollDistance)
            )
          ) {

            // When we're adding more data at the top of the container, we'll have to adjust the
            // scroll position when we've added data. We retain the scrolling offset to the bottom
            // of the container, so we can set it back when data was added
            if (infiniteScrollDirection === 'top') {
              oldOffsetToBottom = infiniteScrollContainer.clientHeight + scrollToBottom;
            }

            // Load more data
            handleInfiniteScrollLoad();
          }
        };

        /**
         * Interval that checks whether the next set of results should be loaded. As the Collabosphere tools might
         * be loaded inside of an LTI iFrame and it's difficult to get access to the scrolling events
         * from the parent window, an interval is used instead.
         */
        var infiniteScrollInterval = $interval(function() {
          // Request the page scroll information when infinite scrolling should happen against the window
          if (infiniteScrollContainer === 'window') {
            utilService.getScrollInformation().then(function(scrollInformation) {
              checkInfiniteScrollLoad(scrollInformation.scrollToBottom, scrollInformation.scrollPosition);
            });
          } else {
            // It is possible that the infinite scroll container will not have been present at the time of initialisation,
            // especially inside modals. Therefore, we try to locate the infinite scroll container again if hasn't yet been
            // located
            infiniteScrollContainer = infiniteScrollContainer || document.getElementById(scope.infiniteScrollContainer);
            if (!infiniteScrollContainer) {
              return false;
            }

            var scrollToBottom = infiniteScrollContainer.scrollHeight - infiniteScrollContainer.clientHeight - infiniteScrollContainer.scrollTop;
            var scrollPosition = infiniteScrollContainer.scrollTop;
            checkInfiniteScrollLoad(scrollToBottom, scrollPosition);
          }
        }, 250);

        /**
         * Clear the interval when the infinite scroll instance has been
         * destroyed
         */
        scope.$on('$destroy', function() {
          $interval.cancel(infiniteScrollInterval);
        });

        // Load the first set of results when the infinite scroll instance is initiated
        handleInfiniteScrollLoad();
      }
    };
  });

}(window.angular));
