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

  angular.module('collabosphere').controller('WhiteboardsUploadController', function($scope) {

    /**
     * Listen for events indicating that a new link has been added or
     * adding a new link has been cancelled
     */
    $scope.$on('assetLibraryUploadDone', function(ev, assets) {
      // The `closeModal` is added on the scope by the caller and allows
      // the caller to deal with the results coming out of the modal
      $scope.closeModal(assets);
    });

  });

}(window.angular));
