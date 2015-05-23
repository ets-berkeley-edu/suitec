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

  angular.module('collabosphere').factory('assetLibraryItemFactory', function(utilService, $http) {

    /**
     * Get an asset
     *
     * @param  {Number}               id          The id of the asset
     * @return {Promise<Asset>}                   $http promise returning the requested asset
     */
    var getAsset = function(id) {
      return $http.get(utilService.getApiUrl('/assets/' + id));
    };

    /**
     * Create a new comment on an asset
     *
     * @param  {Number}               id          The id of the asset
     * @param  {String}               body        The body of the comment
     * @param  {Number}               [parent]    The id of the comment to which the comment is a reply
     * @return {Promise<Comment>}                 $http promise returning the created comment
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
     * @param  {Number}               assetId     The id of the asset to which the comment belongs
     * @param  {Number}               id          The id of the comment that is being edited
     * @param  {String}               body        The updated comment body
     * @return {Promise<Comment>}                 $http promise returning the edited comment
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
     * @param  {Number}               assetId     The id of the asset to which the comment belongs
     * @param  {Number}               id          The id of the comment that is being deleted
     * @return {Promise<Comment>}                 $http promise
     */
    var deleteComment = function(assetId, id) {
      return $http.delete(utilService.getApiUrl('/assets/' + assetId + '/comments/' + id));
    };

    /**
     * Like or unlike an asset
     *
     * @param  {Number}         id                The id of the asset that is liked or unliked
     * @param  {Boolean}        like              `true` when the asset should be liked, `null` when the asset should be unliked
     * @return {Promise}                          $http promise
     */
    var like = function(id, like) {
      return $http.post(utilService.getApiUrl('/assets/' + id + '/like'), {'like': like});
    };

    return {
      'getAsset': getAsset,
      'createComment': createComment,
      'editComment': editComment,
      'deleteComment': deleteComment,
      'like': like
    };

  });

}(window.angular));
