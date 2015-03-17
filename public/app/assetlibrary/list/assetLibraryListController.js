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

  angular.module('collabosphere').controller('AssetLibraryListController', function(assetLibraryListFactory, userFactory, utilService, $location, $scope) {

    $scope.assets = [];
    $scope.list = {
      'page': 0,
      'isLoading': false
    };

    /**
     * Get the assets for the current course through an infinite scroll
     */
    var getAssets = $scope.getAssets = function() {
      // Indicate the no further REST API requests should be made
      // until the current request has completed
      $scope.list.isLoading = true;
      assetLibraryListFactory.getAssets($scope.list.page).success(function(assets) {
        $scope.assets = $scope.assets.concat(assets.results);
        // Only request another page of results if the number of items in the
        // current result set is the same as the maximum number of items in a
        // retrieved asset library page
        if (assets.results.length === 10) {
          $scope.list.isLoading = false;
        }
      });
      // Ensure that the next page is requested the next time
      $scope.list.page++;
    };

    userFactory.getMe().success(function(me) {
      $scope.me = me;
      // Set the domain that should be used by the Bookmarklet for requests
      $scope.baseUrl = (me.course.canvas.use_https ? 'https://' : 'http://') + $location.host() + ':' + $location.port();
    });

  });

}(window.angular));
