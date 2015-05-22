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

  var app = angular.module('collabosphere').controller('AssetLibraryUploadFileController', function(assetLibraryUploadFileFactory, $location, $scope) {

    // Variable that will keep track of the new file to be uploaded
    $scope.file = {};

    // Default the asset's title to the uploaded file's name
    $scope.$watch('file.file', function(newValue, oldValue) {
      // Angular's file watcher might not work as you would expect. The following situations
      // can occur:
      // 1. Page load
      //    1.1  oldValue=undefined,          newValue=undefined
      //
      // 2. The input field is empty and the user selects a file, this function
      //    will be invoked three times:
      //    2.1  oldValue=undefined,          newValue=[]
      //    2.2  oldValue=[],                 newValue=null
      //    2.3  oldValue=null,               newValue=[<File>]
      //
      // 3. The input field contains a file, but the user selects a new one
      //    3.1  oldValue=[<File from 2.1>],  newValue=[]
      //    3.2  oldValue=[],                 newValue=null
      //    3.3  oldValue=null,               newValue=[<New File>]
      //
      // 4. On submit
      //    4.1  oldValue=[<File>],           newValue=undefined
      //
      // In order to avoid we accidentally remove the title on submit or worse,
      // remove a user-provided title, we have to be very specific when to delete it
      if (oldValue && oldValue[0] && oldValue[0].name === $scope.file.title && newValue) {
        delete $scope.file.title;
      } else if (newValue && newValue[0] && newValue[0].name !== $scope.file.title) {
        $scope.file.title = newValue[0].name;
      }
    });

    /**
     * Create a new file asset
     */
    var createFile = $scope.createFile = function() {

      assetLibraryUploadFileFactory.createFile($scope.file).success(function() {
        $location.path('/assetlibrary');
      });
    };

  });

}(window.angular));
