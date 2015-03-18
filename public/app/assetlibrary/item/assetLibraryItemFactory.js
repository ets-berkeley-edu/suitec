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
     * @param  {Number}               [parent]    The id of the asset to which the comment is a reply
     * @return {Promise<Comment>}                 $http promise returning the created comment
     */
    var createComment = function(id, body, parent) {
      var comment = {
        'body': body,
        'parent': parent
      };
      return $http.post(utilService.getApiUrl('/assets/' + id + '/comments'), comment);
    };

    return {
      'createComment': createComment,
      'getAsset': getAsset
    };

  });

}(window.angular));
