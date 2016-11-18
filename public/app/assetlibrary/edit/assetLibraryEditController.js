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

  angular.module('collabosphere').controller('AssetLibraryEditController', function(assetLibraryCategoriesFactory, assetLibraryFactory, me, $state, $stateParams, $scope) {

    // Make the me object available to the scope
    $scope.me = me;

    // Variable that keeps track of the current asset id
    var assetId = $stateParams.assetId;

    // Variable that keeps track of the current asset
    $scope.asset = null;

    // Variable that keeps track of the categories in the current course
    $scope.categories = null;

    /**
     * Get the current asset
     */
    var getCurrentAsset = function() {
      assetLibraryFactory.getAsset(assetId, false).success(function(asset) {
        // As the UI currently only allows for a single category to be selected,
        // set the categories value to make it easier to work with
        if (asset.categories.length > 0) {
          asset.categories = asset.categories[0].id;
        }
        $scope.asset = asset;
      });
    };

    /**
     * Get the categories for the current course
     */
    var getCategories = function() {
      assetLibraryCategoriesFactory.getCategories().success(function(categories) {
        $scope.categories = categories;
      });
    };

    /**
     * Edit the current asset
     */
    var editAsset = $scope.editAsset = function() {
      assetLibraryFactory.editAsset($scope.asset.id, $scope.asset).success(function(updatedAsset) {
        // Indicate that the asset has been updated
        $scope.$emit('assetLibraryAssetUpdated', updatedAsset);
        // Redirect back to the asset item view
        $state.go('assetlibrarylist.item', {'assetId': updatedAsset.id}, {'reload': true});
      });
    };

    // Load the categories for the current course
    getCategories();
    // Load the selected asset
    getCurrentAsset();

  });

}(window.angular));
