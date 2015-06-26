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

  angular.module('collabosphere').factory('assetLibraryListFactory', function(utilService, $http) {

    /**
     * Get the assets for the current course
     *
     * @param  {Number}               [page]                          The results page to retrieve
     * @param  {Object}               [searchOptions]                 A set of options to filter the results by
     * @param  {String}               [searchOptions.keywords]        A string to filter the assets by
     * @param  {Number}               [searchOptions.category]        The id of the category to filter the assets by
     * @param  {Number}               [searchOptions.user]            The id of the user who created the assets
     * @param  {Number}               [searchOptions.type]            The type of assets
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
        url += '&type=' + searchOptions.type;
      }
      return $http.get(utilService.getApiUrl(url));
    };

    return {
      'getAssets': getAssets
    };

  });

}(window.angular));
