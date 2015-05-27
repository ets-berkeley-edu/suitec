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

  angular.module('collabosphere').factory('assetLibraryUploadFactory', function(utilService, $http, Upload) {

    /**
     * Create a new file asset
     *
     * @param  {Object}               file                  The object representing the file that should be created
     * @param  {String}               file.title            The title of the file
     * @param  {String}               file.file             The file to upload
     * @param  {String}               [file.description]    The description of the file
     * @param  {Number[]}             [file.categories]     The ids of the categories to which the link should be associated
     * @param  {String}               [file.source]         The source of the file
     * @param  {Function}             [progressCallback]    Callback function that will be informed of progress updates
     * @return {Promise<Asset>}                             Promise returning the created file asset
     */
    var createFile = function(file, progressCallback) {
      var fileToUpload = file.file;
      var metadata = {
        'type': 'file',
        'title': file.title,
        'description': file.description,
        'categories': file.categories,
        'source': file.source
      };
      return Upload.upload({
        'url': utilService.getApiUrl('/assets'),
        'fields': metadata,
        'file': fileToUpload
      }).progress(progressCallback);
    };

    return {
      'createFile': createFile
    };

  });

}(window.angular));
