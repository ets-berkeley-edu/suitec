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

  angular.module('collabosphere').controller('AssetLibraryIconBarController', function(assetLibraryFactory, me, $scope) {

    // Make the me object available to the scope
    $scope.me = me;

    // Screenreader alert message for like actions
    $scope.likeAlertMessage = null;

    /**
     * Like an asset. If the asset has been liked by the current user already, the like will be undone
     *
     * @param  {Asset}          asset                           The asset that should be liked or disliked
     * @return {void}
     */
    $scope.like = function(asset) {
      var liked = (asset.liked === true) ? null : true;
      assetLibraryFactory.like(asset.id, liked).success(function() {
        asset.liked = liked;
        if (liked === true) {
          $scope.likeAlertMessage = 'Liked asset';
          asset.likes++;
        } else {
          $scope.likeAlertMessage = 'Removed like from asset';
          asset.likes--;
        }
        // Indicate that the asset has been updated
        $scope.$emit('assetLibraryAssetUpdated', asset);
      });
    };

    /**
     * Pin an asset. If the asset has been pinned by the current user already, the pin will be undone
     *
     * @param  {Asset}          asset                           The asset that should be pinned or unpinned
     * @return {void}
     */
    $scope.pin = function(asset) {
      var pin = !asset.isPinnedByMe;

      assetLibraryFactory.pin(asset.id, pin).success(function() {
        asset.isPinnedByMe = pin;
        $scope.pinAlertMessage = pin ? 'Pinned asset' : 'Unpinned asset';

        // Indicate that the asset has been updated
        $scope.$emit('assetLibraryAssetUpdated', $scope.asset);
        $scope.$emit('assetPinEventByMe', $scope.asset, pin);
      });
    };

    /**
     * Whether the current user is a collaborator of the asset
     *
     * @return {Boolean}        `true` if the user is a collaborator, `false` otherwise
     */
    $scope.isAssetCollaborator = function() {
      if ($scope.me && $scope.asset && !_.find($scope.asset.users, {'id': $scope.me.id})) {
        return false;
      } else {
        return true;
      }
    };

  });

}(window.angular));
