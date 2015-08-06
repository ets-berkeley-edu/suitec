/*!
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
      // Restrict the directive to only match attribute names. See https://docs.angularjs.org/guide/directive#template-expanding-directive
      // for more information
      'restrict': 'A',

      // Define how the directive's scope is separated from the caller's scope. See https://docs.angularjs.org/guide/directive#isolating-the-scope-of-a-directive
      // for more information
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
