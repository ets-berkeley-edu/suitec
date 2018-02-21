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

  angular.module('collabosphere').controller('WhiteboardsExportAsAssetController', function(assetLibraryCategoriesFactory, whiteboardsFactory, $scope) {

    // Variable that will keep track of the new asset to be created
    $scope.asset = {
      'title': $scope.whiteboard.title
    };

    // Variable that will keep track of the categories in the current course
    $scope.categories = null;

    // Variable that will keep track of whether the current whiteboard is being exported to an asset
    $scope.isExporting = false;

    // Variable that will keep track of an error message on export
    $scope.exportError = null;

    /**
     * Export the whiteboard as an asset
     *
     * @return {void}
     */
    var exportAsAsset = $scope.exportAsAsset = function() {
      $scope.isExporting = true;
      $scope.exportError = null;
      whiteboardsFactory.exportWhiteboardAsAsset($scope.whiteboard.id, $scope.asset).success(function(asset) {
        $scope.isExporting = false;
        $scope.closeModal(asset);
      }).error(function(error, status) {
        $scope.isExporting = false;
        $scope.exportError = error;
        $scope.exportStatus = status;
      });
    };

    /**
     * Get the categories for the current course
     *
     * @return {void}
     */
    var getCategories = function() {
      assetLibraryCategoriesFactory.getCategories().success(function(categories) {
        $scope.categories = categories;
      });
    };

    /**
     * Get the latest whiteboard. Because a user might have made significant changes right before
     * exporting the whiteboard, the thumbnail url could be out of date. By fetching the latest
     * whiteboard data we get a newer thumbnail
     *
     * @return {void}
     */
    var getWhiteboard = function() {
      whiteboardsFactory.getWhiteboard($scope.whiteboard.id, false).success(function(whiteboard) {
        $scope.whiteboard = whiteboard;
      });
    };

    getCategories();
    getWhiteboard();
  });

}(window.angular));
