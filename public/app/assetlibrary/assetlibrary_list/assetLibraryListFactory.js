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
     * @param  {Number}               page      The results page to retrieve
     * @return {Promise<Object>}                $http promise returning the total number of assets for the current course and the assets in the current page
     */
    var getAssets = function(page) {
      return $http.get(utilService.getApiUrl('/assets?offset=' + (page * 10)));
    };

    return {
      getAssets: getAssets
    };

  });

}(window.angular));
