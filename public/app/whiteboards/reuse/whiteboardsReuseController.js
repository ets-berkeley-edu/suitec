/**
 * Copyright ©2018. The Regents of the University of California (Regents). All Rights Reserved.
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

  angular.module('collabosphere').controller('WhiteboardsReuseController', function(assetLibraryFactory, utilService, $scope) {

    var ASSETS_PER_PAGE = 10;

    var init = function(searchOptions) {
      $scope.searchOptions = searchOptions || {};
      $scope.scrollReady = false;
      $scope.assets = [];
      $scope.isLoading = true;
      $scope.assetsPage = 0;
      $scope.pinned = [];
      $scope.pinnedPage = 0;
    };

    // Variable that keeps track of whether a search is being done. Note that we can't make this
    // into a function that checks `$scope.searchOptions` as the options are passed into the search
    // directive which will update the options as soon as an input field changes. If we were to do
    // that, we might start showing certain interactions too soon (e.g., the "No assets could be found" alert)
    $scope.isSearch = false;

    var isSearch = function(searchOptions) {
      return !!(searchOptions.keywords ||
                searchOptions.category ||
                searchOptions.user ||
                searchOptions.section ||
                searchOptions.type ||
                searchOptions.sort);
    };

    /**
     * Add the selected assets to the current whiteboard
     *
     * @return {void}
     */
    var addSelectedAssets = $scope.addSelectedAssets = function() {
      // The `closeModal` is added on the scope by the caller and allows
      // the caller to deal with the results coming out of the modal
      $scope.closeModal(getSelectedAssets());
    };

    /**
     * @return {Object}                        Selected assets from asset list
     */
    var getSelectedAssets = $scope.getSelectedAssets = function() {
      var allAssets = _.concat($scope.pinned, $scope.assets);
      return _.filter(allAssets, {'selected': true});
    };

    /**
     * Toggle the selection of an asset
     *
     * @param  {Asset}          asset           The asset that should be toggled
     * @return {void}
     */
    var selectAsset = $scope.selectAsset = function(asset) {
      asset.selected = !asset.selected;
    };

    /**
     * Get the next page of search results
     *
     * @param  {Object}          assetList               Previous pages of search results, concatenated
     * @param  {Number}          page                    Page number as described in AssetsAPI
     * @param  {Object}          searchOptions           Search parameters for AssetsAPI
     * @param  {Function}        callback                Standard callback function
     * @return {void}
     */
    var getNextPage = function(assetList, page, searchOptions, callback) {
      assetLibraryFactory.getAssets(page, searchOptions, true, 'whiteboards_modal').success(function(assets) {
        _.each(assets.results, function(asset) {
          assetList.push(asset);
        });

        // Only request another page of results if the number of items in the
        // current result set is the same as the maximum number of items in a
        // retrieved asset library page
        if (assets.results.length === ASSETS_PER_PAGE) {
          $scope.scrollReady = true;
        }
        callback();
      });
    };

    /**
     * Get the assets for the current course through an infinite scroll
     *
     * @return {void}
     */
    var getAssets = $scope.getAssets = function() {
      // Indicate the no further REST API requests should be made
      // until the current request has completed
      $scope.scrollReady = false;

      // Indicate whether a search was performed
      $scope.isSearch = isSearch($scope.searchOptions);

      // Default view has 'pins' assets listed first.
      if ($scope.isSearch) {
        // Narrow the search as seen in Asset Library
        utilService.narrowSearchPerSort($scope.searchOptions);
        getNextPage($scope.assets, $scope.assetsPage, $scope.searchOptions, function() {
          $scope.assetsPage++;
          $scope.isLoading = false;
        });

      } else if ($scope.assets.length) {
        // If $scope.assets is non-empty and isSearch is false then we are:
        //  1. rendering the default, segregated view
        //  2. done getting pinned assets

        // Next page is unpinned assets
        getNextPage($scope.assets, $scope.assetsPage, {'hasPins': false, 'sort': 'pins'}, function() {
          $scope.assetsPage++;
          $scope.isLoading = false;
        });

      } else {
        // Default view has 'My Pinned' first.
        var pinCount = $scope.pinned.length;

        getNextPage($scope.pinned, $scope.pinnedPage, {'hasPins': true, 'sort': 'pins'}, function() {
          $scope.pinnedPage++;

          if ($scope.pinned.length - pinCount < ASSETS_PER_PAGE) {
            // All pinned assets found; fill the remaining page with unpinned assets.
            getNextPage($scope.assets, $scope.assetsPage, {'hasPins': false, 'sort': 'pins'}, function() {
              $scope.assetsPage++;
              $scope.isLoading = false;
            });
          } else {
            $scope.isLoading = false;
          }
        });
      }
    };

    init();

    /**
     * Listen for events indicating that the user wants to search through the asset library
     */
    $scope.$on('assetLibrarySearchSearch', function(ev, searchOptions) {
      init(searchOptions);
      getAssets();
    });

  });

}(window.angular));
