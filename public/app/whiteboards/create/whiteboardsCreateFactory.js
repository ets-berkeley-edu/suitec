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

  angular.module('collabosphere').factory('whiteboardsCreateFactory', function(utilService, $http) {

    /**
     * Create a new whiteboard
     *
     * @param  {Object}               whiteboard            The object representing the whiteboard that should be created
     * @param  {String}               whiteboard.title      The title of the whiteboard
     * @return {Promise<Whiteboard>}                        Promise returning the created whiteboard
     */
    var createWhiteboard = function(whiteboard) {
      return $http.post(utilService.getApiUrl('/whiteboards'), whiteboard);
    };

    return {
      'createWhiteboard': createWhiteboard
    };

  });

}(window.angular));
