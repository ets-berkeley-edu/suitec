/**
 * Copyright ©2015. The Regents of the University of California (Regents). All Rights Reserved.
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

  angular.module('collabosphere').controller('WhiteboardsReuseController', function(assetLibraryFactory, $scope) {

    $scope.searchOptions = {};
    $scope.assets = [];
    $scope.list = {
      'page': 0,
      'ready': false
    };

    // Variable that keeps track of whether a search is being done. Note that we can't make this
    // into a function that checks `$scope.searchOptions` as the options are passed into the search
    // directive which will update the options as soon as an input field changes. If we were to do
    // that, we might start showing certain interactions too soon (e.g., the "No assets could be found" alert)
    $scope.isSearch = false;

    /**
     * Add the selected assets to the current whiteboard
     */
    var addSelectedAssets = $scope.addSelectedAssets = function() {
      // The `closeModal` is added on the scope by the caller and allows
      // the caller to deal with the results coming out of the modal
      $scope.closeModal(getSelectedAssets());
    };

    /**
     * Get the selected assets from the asset list
     */
    var getSelectedAssets = $scope.getSelectedAssets = function() {
      var selectedAssets = [];
      for (var i = 0; i < $scope.assets.length; i++) {
        var asset = $scope.assets[i];
        if (asset.selected) {
          selectedAssets.push($scope.assets[i]);
        }
      }
      return selectedAssets;
    };

    /**
     * Toggle the selection of an asset
     *
     * @param  {Asset}          asset           The asset that should be toggled
     */
    var selectAsset = $scope.selectAsset = function(asset) {
      asset.selected = !asset.selected;
    };

    /**
     * Get the assets for the current course through an infinite scroll
     */
    var getAssets = $scope.getAssets = function() {
      // Indicate the no further REST API requests should be made
      // until the current request has completed
      $scope.list.ready = false;
      $scope.isSearch = false;
      assetLibraryFactory.getAssets($scope.list.page, $scope.searchOptions).success(function(assets) {
        // Indicate whether a search was performed
        if ($scope.searchOptions.keywords || $scope.searchOptions.category || $scope.searchOptions.user || $scope.searchOptions.type) {
          $scope.isSearch = true;
        }

        // Add the new assets
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
     * Listen for events indicating that the user wants to search through the asset library
     */
    $scope.$on('assetLibrarySearchSearch', function(ev, searchOptions) {
      $scope.list.page = 0;
      $scope.assets = [];
      $scope.searchOptions = searchOptions;
      getAssets();
    });

  });

}(window.angular));
