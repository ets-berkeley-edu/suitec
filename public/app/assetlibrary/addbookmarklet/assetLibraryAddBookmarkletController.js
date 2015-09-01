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

  angular.module('collabosphere').controller('AssetLibraryAddBookmarkletController', function(analyticsService, deviceDetector, me, utilService, $location, $scope) {

    // Make the me object available to the scope
    $scope.me = me;

    // Set the domain that should be used by the Bookmarklet for requests
    $scope.baseUrl = (me.course.canvas.use_https ? 'https://' : 'http://') + $location.host() + ':' + $location.port();

    // Set the URL that should be used to send the user back to the Asset Library
    $scope.toolUrl = utilService.getToolUrl();

    // Variable that will keep track of the step the user is currently at
    $scope.step = 1;

    // List of the browsers for which browser-specific bookmarklet installation instructions are provided
    // and the associated name of the bookmarks toolbar
    var browsers = {
      'firefox': 'bookmarks toolbar',
      'chrome': 'Bookmarks Bar',
      'safari': 'Favorites Bar',
      'ie': 'Favorites bar'
    };

    // When no bookmarklet installation instructions are available for the current browser, revert to Firefox
    $scope.browser = deviceDetector.browser;
    if (!browsers[$scope.browser]) {
      $scope.browser = 'firefox';
    }
    $scope.toolbar = browsers[$scope.browser];

    /**
     * Go to the next step in the bookmarklet installation process
     */
    var nextStep = $scope.nextStep = function() {
      $scope.step++;
      trackBookmarklet();
    };

    /**
     * Track an activity for each step in the bookmarklet installation
     * process
     */
    var trackBookmarklet = function() {
      analyticsService.track('Install bookmarklet instructions', {
        'step': $scope.step
      });
    };

    /**
     * Track an activity when the bookmarklet is being dragged
     */
    var trackBookmarkInstallation = $scope.trackBookmarkInstallation = function() {
      analyticsService.track('Install bookmarklet');
    };

    /**
     * Prevent that clicking the bookmarklet in the installation instructions triggers the bookmarklet
     * functionality
     *
     * @param  {Event}          $event            The click event
     */
    var preventBookmarklet = $scope.preventBookmarklet = function($event) {
      $event.preventDefault();
      return false;
    };

    // Track the bookmarklet installation
    trackBookmarklet();

  });

}(window.angular));
