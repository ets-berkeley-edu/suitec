/**
 * Copyright ©2020. The Regents of the University of California (Regents). All Rights Reserved.
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
     *
     * @return {void}
     */
    var nextStep = $scope.nextStep = function() {
      $scope.step++;
      trackBookmarklet();
    };

    /**
     * Track an activity for each step in the bookmarklet installation
     * process
     *
     * @return {void}
     */
    var trackBookmarklet = function() {
      analyticsService.track('Install bookmarklet instructions', {
        'step': $scope.step
      });
    };

    /**
     * Track an activity when the bookmarklet is being dragged
     *
     * @return {void}
     */
    var trackBookmarkInstallation = $scope.trackBookmarkInstallation = function() {
      analyticsService.track('Install bookmarklet');
    };

    /**
     * Prevent that clicking the bookmarklet in the installation instructions triggers the bookmarklet
     * functionality
     *
     * @param  {Event}          $event            The click event
     * @return {Boolean}                          False to short-circuit the event
     */
    var preventBookmarklet = $scope.preventBookmarklet = function($event) {
      $event.preventDefault();
      return false;
    };

    // Track the bookmarklet installation
    trackBookmarklet();

  });

}(window.angular));
