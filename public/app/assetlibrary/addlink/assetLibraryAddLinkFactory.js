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

  angular.module('collabosphere').factory('assetLibraryAddLinkFactory', function(utilService, $http) {

    /**
     * Create a new link asset
     *
     * @param  {Object}               link                  The object representing the link that should be created
     * @param  {String}               link.title            The title of the link
     * @param  {String}               link.url              The url of the link
     * @param  {String}               [link.description]    The description of the link
     * @param  {String}               [link.source]         The source of the link
     * @return {Promise<Asset>}                             Promise returning the created link asset
     */
    var createLink = function(link) {
      link.type = 'link';
      return $http.post(utilService.getApiUrl('/assets'), link);
    };

    return {
      'createLink': createLink
    };

  });

}(window.angular));
