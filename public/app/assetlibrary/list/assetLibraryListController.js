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

  angular.module('collabosphere').controller('AssetLibraryListController', function(assetLibraryFactory, userFactory, utilService, $filter, $rootScope, $scope, $state) {

    // Variable that keeps track of the URL state
    $scope.state = $state;

    // Variable that keeps track of whether the search component is in the advanced view state
    $scope.isAdvancedSearch = !!($state.params.category || $state.params.user || $state.params.type);

    // Variable that keeps track of whether a search is being done
    $scope.isSearch = !!($state.params.keywords || $state.params.category || $state.params.user || $state.params.type);

    // Variable that keeps track of the search options
    $scope.searchOptions = {
      'keywords': $state.params.keywords || '',
      'category': parseInt($state.params.category, 10) || '',
      'user': parseInt($state.params.user, 10) || '',
      'type': $state.params.type || ''
    };

    // Variable that keeps track of the assets in the list
    $scope.assets = [];
    $scope.list = {
      'page': 0,
      'ready': true
    };

    // Variable that will keep track of the scroll position in the list
    var scrollPosition = 0;

    /**
     * Get the assets for the current course through an infinite scroll
     */
    var getAssets = $scope.getAssets = function() {
      // Indicate the no further REST API requests should be made
      // until the current request has completed
      $scope.list.ready = false;
      assetLibraryFactory.getAssets($scope.list.page, $scope.searchOptions).success(function(assets) {
        $scope.assets = $scope.assets.concat(assets.results);
        // Only request another page of results if the number of items in the
        // current result set is the same as the maximum number of items in a
        // retrieved asset library page
        if (assets.results.length === 10) {
          $scope.list.ready = true;
        }
      });
      // Ensure that the next page is requested the next time
      $scope.list.page++;
    };

    /**
     * Listen for events indicating that a state change is about to take place. At that point,
     * the current scroll position in the list will be cached
     */
    $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
      if (fromState.name === 'assetlibrarylist' && toState.name === 'assetlibrarylist.item') {
        utilService.getScrollInformation().then(function(scrollInformation) {
          scrollPosition = scrollInformation.scrollPosition;
          // Don't load additional results
          $scope.list.ready = false;
        });
      }
    });

    /**
     * Listen for events indicating that a state change has taken place. At that point,
     * the previous scroll position in the list will be restored
     */
    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
      if (toState.name === 'assetlibrarylist') {
        // Resize the iFrame the Asset Library is being run in
        utilService.resizeIFrame();
        // Restore the scroll position to the position the list was in previously
        utilService.scrollTo(scrollPosition);
        // Indicate that more results can be loaded
        $scope.list.ready = true;
      }
    });

    /**
     * Listen for events indicating that the user wants to search through the asset library
     */
    $scope.$on('assetLibrarySearchSearch', function(ev, searchOptions) {
      $scope.list.page = 0;
      $scope.assets = [];
      $scope.searchOptions = searchOptions;

      // Determine whether a search is being done
      $scope.isSearch = false;
      if ($scope.searchOptions.keywords || $scope.searchOptions.category || $scope.searchOptions.user || $scope.searchOptions.type) {
        $scope.isSearch = true;
      }

      // Load the list of assets with the specified search options
      getAssets();
    });

    /**
     * Listen for events indicating that an asset has been updated
     */
    $scope.$on('assetLibraryAssetUpdated', function(ev, updatedAsset) {
      for (var i = 0; i < $scope.assets.length; i++) {
        if ($scope.assets[i].id === updatedAsset.id) {
          $scope.assets[i] = updatedAsset;
        }
      }
    });

    userFactory.getMe().success(function(me) {
      $scope.me = me;
    });
  });

}(window.angular));
