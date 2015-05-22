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

  angular.module('collabosphere').factory('whiteboardsListFactory', function(utilService, $http) {

    /**
     * Get the whiteboards to which the current user has access in the current course
     *
     * @param  {Number}               page      The results page to retrieve
     * @return {Promise<Object>}                $http promise returning the total number of whiteboards to which the current user has access in the current course and the whiteboards in the current page
     */
    var getWhiteboards = function(page) {
      return $http.get(utilService.getApiUrl('/whiteboards?offset=' + (page * 10)));
    };

    return {
      'getWhiteboards': getWhiteboards
    };

  });

}(window.angular));
