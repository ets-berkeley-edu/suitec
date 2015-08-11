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

  var app = angular.module('collabosphere').controller('AssetLibraryUploadController', function(assetLibraryCategoriesFactory, assetLibraryFactory, $scope) {

    // Constant that defines the maximum allowed file size
    var MAX_FILE_SIZE = 10 * 1024 * 1024;

    // Variable that will keep track of the files to be uploaded
    $scope.files = [];

    // Variable that will keep track of the files that exceed the file size limit
    $scope.filesExceedSize = [];

    // Variable that will keep track of the invalid files
    $scope.filesInvalid = [];

    // Variable that will keep track of whether the alert message that indicates problems with the
    // selected files should be shown
    $scope.alertFilesError = false;

    // Variable that will keep track of whether uploading is currently in progress
    $scope.isUploading = false;

    // Variable that will keep track of the file upload progress as a rounded percentage
    $scope.progress = 0;

    // Variable that will keep track of the total file size of the files to be uploaded
    var totalSize = 0;

    // Variable that will keep track of the total file size that has already been uploaded
    var uploadedSize = 0;

    // Variable that will keep track of the file that is currently being uploaded
    var currentFile = null;

    // Variable that will keep track of the returned response for all files that have been uploaded
    var uploadedFiles = [];

    /**
     * Function invoked when a new file or set of files has been selected in the file dialog
     * or dropped into the file drop area
     *
     * @param  {File[]}         files           The file(s) that have been selected or dropped
     */
    var filesSelected = $scope.filesSelected = function(files) {
      // Clear the previously selected files
      $scope.files = [];
      $scope.filesExceedSize = [];
      $scope.filesInvalid = [];
      $scope.alertFilesError = false;
      totalSize = 0;

      // Render the selected files
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var fileSize = file.size;
        // Exclude files that exceed the file size limit
        if (fileSize > MAX_FILE_SIZE) {
          $scope.filesExceedSize.push(file);
          $scope.alertFilesError = true;
        // Folders or files that are technically a folder on the
        // filesystem (e.g. keynote) will have a file size of 0
        // or no file size at all
        } else if (!fileSize || !file.type || file.type === 'directory') {
          $scope.filesInvalid.push(file);
          $scope.alertFilesError = true;
        } else {
          totalSize += file.size;
          $scope.files.push({
            // Default the file title to the file name
            'title': file.name,
            'file': file
          });
        }
      }
    };

    /**
     * Hide the alert message that indicates a problem with the selected files
     */
    var hideFilesError = $scope.hideFilesError = function() {
      $scope.alertFilesError = false;
    };

    /**
     * Remove a file from the list of selected files
     *
     * @param  {Number}         index           The index of the file that should be removed in the array of selected files
     */
    var removeFile = $scope.removeFile = function(index) {
      $scope.files.splice(index, 1);
    };

    /**
     * Cancel uploading the selected files
     */
    var cancelUpload = $scope.cancelUpload = function() {
      return $scope.$emit('assetLibraryUploadDone');
    };

    /**
     * Upload the selected files and their metadata
     */
    var createFiles = $scope.createFiles = function() {
      // Indicate that uploading is now in progress
      $scope.isUploading = true;

      // Reset the progress indicator
      uploadedSize = 0;
      calculateProgress(uploadedSize);

      // Start uploading the first file
      createFile();
    };

    /**
     * Upload the next file from the list of selected files
     */
    var createFile = function() {
      // If no more files need to be uploaded, emit an event that
      // indicates that all files have been uploaded
      if ($scope.files.length === 0) {
        return $scope.$emit('assetLibraryUploadDone', uploadedFiles);
      }

      // Calculate the total size of the files that have been
      // uploaded so far
      if (currentFile) {
        uploadedSize += currentFile.file.size;
        calculateProgress(uploadedSize);
      }

      // Pick the next file in the list of selected file and
      // upload it
      currentFile = $scope.files.pop();
      assetLibraryFactory.createFile(currentFile, function(ev) {
        // As `ev.loaded` reports the total number of bytes that have been transferred in the
        // HTTP request, this can end up being higher than just the file size. Therefore, we
        // ensure that the reported progress never goes above the size of the file that is currently
        // being uploaded
        var loaded = ev.loaded > currentFile.file.size ? currentFile.file.size : ev.loaded;

        // The back-end needs to move the file into the course's files tool which can take a little
        // while. Unfortunately, there are no progress events for this operation. To give the user
        // a little bit of context, we let the progress bar not move beyond 95% and show a message
        // that there is still something happening and that they should not move away
        loaded = loaded * 0.95;

        // Update the progress bar
        calculateProgress(uploadedSize + loaded);
      }).success(function(asset) {
        uploadedFiles.push(asset);
        // Process the next file
        createFile();
      });
    };

    /**
     * Calculate the file upload progress as a rounded percentage
     *
     * @param  {Number}         uploaded        The total file size that has been uploaded so far
     * @return {Number}                         The calculated file upload progress as a rounded percentage based on total size of the files that need to be uploaded
     */
    var calculateProgress = function(uploaded) {
      $scope.progress = Math.round((uploaded / totalSize) * 100);
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
