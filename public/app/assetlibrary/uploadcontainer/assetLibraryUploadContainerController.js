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

  var app = angular.module('collabosphere').controller('AssetLibraryUploadContainerController', function($location, $scope) {

    /**
     * Listen for events indicating that new files have been uploaded or
     * uploading new files has been cancelled
     */
    $scope.$on('assetLibraryUploadDone', function() {
      $location.path('/assetlibrary');
    });

  });

}(window.angular));
