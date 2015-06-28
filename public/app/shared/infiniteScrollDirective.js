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

  /**
   * The infinite scroll directive can be used to add infinite scrolling functionality to
   * a container. The following attributes should be applied to the infinite scrolling container:
   *
   * @param  {Function}       infinite-scroll             The function that fetches the next set of results
   * @param  {String}         infinite-scroll-container   `window` if the next set of results should be fetched when the user scroll approaches the end of the page. Otherwise, the id of the element in which the user scroll should approach the end before loading the next set of results
   * @param  {Number}         infinite-scroll-distance    The distance in pixels between the current scroll position within the scroll container and the bottom of the scroll container at which the next set of results will be loaded
   * @param  {Boolean}        infinite-scroll-ready       Whether the infinite scroll container is ready to load more results.
   */
  angular.module('collabosphere').directive('infiniteScroll', function(utilService, $interval) {
    return {
      'restrict': 'A',
      'scope': {
        'infiniteScroll': '&',
        'infiniteScrollContainer': '@',
        'infiniteScrollDistance': '=',
        'infiniteScrollReady': '='
      },
      'link': function(scope, elem, attrs) {

        // Default the distance to the bottom of the page at which further results are loaded
        scope.infiniteScrollDistance = scope.infiniteScrollDistance || 400;

        // Default whether infinite scrolling should happen against the window or the current element
        scope.infiniteScrollContainer = scope.infiniteScrollContainer || 'window';

        // Cache the infinite scroll container when a container other than the browser window has been supplied
        var infiniteScrollContainer = null;
        if (scope.infiniteScrollContainer !== 'window') {
          infiniteScrollContainer = document.querySelector('#' + scope.infiniteScrollContainer);
        }

        /**
         * Load the next set of results in the infinite scroll instance
         */
        var handleInfiniteScrollLoad = function() {
          scope.infiniteScroll();
        };

        /**
         * Check whether the next set of results should be loaded. The next set of results should only be loaded
         * when the infinite scroll instance is ready to accept more results and when the bottom of the page or element
         * is close enough
         *
         * @param  {Number}         scrollToBottom            When the browser window was supplied as the infiniteScrollContainer, the distance between the bottom of the browser and the bottom of the page. Otherwise, the distance between the bottom of the infinite scroll container and the current scroll position within that container
         */
        var checkInfiniteScrollLoad = function(scrollToBottom) {
          if (scope.infiniteScrollReady && scrollToBottom < scope.infiniteScrollDistance) {
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
          if (scope.infiniteScrollContainer === 'window') {
            utilService.getScrollInformation().then(function(scrollInformation) {
              checkInfiniteScrollLoad(scrollInformation.scrollToBottom);
            });
          } else {
            var scrollToBottom = infiniteScrollContainer.scrollHeight - infiniteScrollContainer.clientHeight - infiniteScrollContainer.scrollTop;
            checkInfiniteScrollLoad(scrollToBottom);
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
