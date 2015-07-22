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

  angular.module('collabosphere').factory('assetLibraryFactory', function(utilService, Upload, $http) {

    /**
     * Get an asset
     *
     * @param  {Number}               id                              The id of the asset
     * @return {Promise<Asset>}                                       $http promise returning the requested asset
     */
    var getAsset = function(id) {
      return $http.get(utilService.getApiUrl('/assets/' + id));
    };

    /**
     * Get the assets for the current course
     *
     * @param  {Number}               [page]                          The results page to retrieve
     * @param  {Object}               [searchOptions]                 A set of options to filter the results by
     * @param  {String}               [searchOptions.keywords]        A string to filter the assets by
     * @param  {Number}               [searchOptions.category]        The id of the category to filter the assets by
     * @param  {Number}               [searchOptions.user]            The id of the user who created the assets
     * @param  {String[]}             [searchOptions.type]            The type of assets
     * @return {Promise<Object>}                                      $http promise returning the total number of assets for the current course and the assets in the current page
     */
    var getAssets = function(page, searchOptions) {
      page = page || 0;
      searchOptions = searchOptions || {};

      var url = '/assets';
      url += '?offset=' + (page * 10);
      if (searchOptions.keywords) {
        url += '&keywords=' + searchOptions.keywords;
      }
      if (searchOptions.category) {
        url += '&category=' + searchOptions.category;
      }
      if (searchOptions.user) {
        url += '&user=' + searchOptions.user;
      }
      if (searchOptions.type) {
        searchOptions.type.forEach(function(type) {
          url += '&type=' + type;
        });
      }
      return $http.get(utilService.getApiUrl(url));
    };

    /**
     * Create a new file asset
     *
     * @param  {Object}               file                            The object representing the file that should be created
     * @param  {String}               file.title                      The title of the file
     * @param  {String}               file.file                       The file to upload
     * @param  {String}               [file.description]              The description of the file
     * @param  {Number[]}             [file.categories]               The ids of the categories to which the file should be associated
     * @param  {String}               [file.source]                   The source of the file
     * @param  {Function}             [progressCallback]              Callback function that will be informed of progress updates
     * @return {Promise<Asset>}                                       Promise returning the created file asset
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

    /**
     * Create a new link asset
     *
     * @param  {Object}               link                            The object representing the link that should be created
     * @param  {String}               link.title                      The title of the link
     * @param  {String}               link.url                        The url of the link
     * @param  {String}               [link.description]              The description of the link
     * @param  {Number[]}             [link.categories]               The ids of the categories to which the link should be associated
     * @param  {String}               [link.source]                   The source of the link
     * @return {Promise<Asset>}                                       Promise returning the created link asset
     */
    var createLink = function(link) {
      link.type = 'link';
      return $http.post(utilService.getApiUrl('/assets'), link);
    };

    /**
     * Edit an asset
     *
     * @param  {Number}               id                              The id of the asset that is being edited
     * @param  {Object}               updatedAsset                    The object representing the updated asset
     * @param  {String}               updatedAsset.title              The updated title of the asset
     * @param  {Number[]}             [updatedAsset.categories]       The updated ids of the categories to which the asset should be associated. If no categories are provided, any existing associated categories will be removed from the asset
     * @param  {String}               [updatedAsset.description]      The updated description of the asset
     * @return {Promise<Asset>}                                       $http promise returning the updated asset
     */
    var editAsset = function(id, updatedAsset) {
      return $http.post(utilService.getApiUrl('/assets/' + id), updatedAsset);
    };

    /**
     * Create a new comment on an asset
     *
     * @param  {Number}               id                              The id of the asset
     * @param  {String}               body                            The body of the comment
     * @param  {Number}               [parent]                        The id of the comment to which the comment is a reply
     * @return {Promise<Comment>}                                     $http promise returning the created comment
     */
    var createComment = function(id, body, parent) {
      var comment = {
        'body': body,
        'parent': parent
      };
      return $http.post(utilService.getApiUrl('/assets/' + id + '/comments'), comment);
    };

    /**
     * Edit a comment on an asset
     *
     * @param  {Number}               assetId                         The id of the asset to which the comment belongs
     * @param  {Number}               id                              The id of the comment that is being edited
     * @param  {String}               body                            The updated comment body
     * @return {Promise<Comment>}                                     $http promise returning the edited comment
     */
    var editComment = function(assetId, id, body) {
      var edit = {
        'body': body
      };
      return $http.post(utilService.getApiUrl('/assets/' + assetId + '/comments/' + id), edit);
    };

    /**
     * Delete a comment on an asset
     *
     * @param  {Number}               assetId                         The id of the asset to which the comment belongs
     * @param  {Number}               id                              The id of the comment that is being deleted
     * @return {Promise<Comment>}                                     $http promise
     */
    var deleteComment = function(assetId, id) {
      return $http.delete(utilService.getApiUrl('/assets/' + assetId + '/comments/' + id));
    };

    /**
     * Like or unlike an asset
     *
     * @param  {Number}               id                              The id of the asset that is liked or unliked
     * @param  {Boolean}              like                            `true` when the asset should be liked, `false` when the asset should be disliked. When `null` is provided, the previous like or dislike will be undone
     * @return {Promise}                                              $http promise
     */
    var like = function(id, like) {
      return $http.post(utilService.getApiUrl('/assets/' + id + '/like'), {'like': like});
    };

    return {
      'getAsset': getAsset,
      'getAssets': getAssets,
      'createFile': createFile,
      'createLink': createLink,
      'editAsset': editAsset,
      'createComment': createComment,
      'editComment': editComment,
      'deleteComment': deleteComment,
      'like': like
    };

  });

}(window.angular));
