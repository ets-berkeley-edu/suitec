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

  var app = angular.module('collabosphere').controller('AssetLibraryUploadController', function(assetLibraryCategoriesFactory, assetLibraryUploadFactory, $location, $scope) {

    // Variable that will keep track of the files to be uploaded
    $scope.files = [];

    // TODO
    $scope.isUploading = false;

    /**
     * TODO
     */
    var filesSelected = $scope.filesSelected = function(files) {
      $scope.files = [];
      for (var i = 0; i < files.length; i++) {
        console.log(files[i]);
        $scope.files.push({
          'title': files[i].name,
          'file': files[i]
        });
      }
    };

    /**
     * TODO
     */
    var removeFile = $scope.removeFile = function(index) {
      $scope.files.splice(index, 1);
    };

    /**
     * Create a new file asset
     * TODO
     */
    var createFiles = $scope.createFiles = function() {
      $scope.isUploading = true;
      if ($scope.files.length === 0) {
        return $location.path('/assetlibrary');
      }

      var file = $scope.files.pop();
      assetLibraryUploadFactory.createFile(file, function(ev) {
        console.log(loaded);
      }).success(createFiles);
    };

    /**
     * Get the categories for the current course
     */
    var getCategories = function() {
      assetLibraryCategoriesFactory.getCategories().success(function(categories) {
        $scope.categories = categories;
      });
    };

    getCategories();

  });

}(window.angular));
