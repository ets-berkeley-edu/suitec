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

  angular.module('collabosphere').factory('whiteboardsBoardFactory', function(utilService, $http) {

    /**
     * Get a whiteboard
     *
     * @param  {Number}               id                    The id of the whiteboard
     * @return {Promise<Whiteboard>}                        Promise returning the requested whiteboard
     */
    var getWhiteboard = function(id) {
      return $http.get(utilService.getApiUrl('/whiteboards/' + id));
    };

    /**
     * Get the most recent chat messages for a whiteboard
     *
     * @param  {Number}               whiteboardId          The id of the whiteboard for which to get the most chat messages
     * @return {Promise<Chat[]>}                            Promise returning the most recent chat messages
     */
    var getChatMessages = function(whiteboardId) {
      return $http.get(utilService.getApiUrl('/whiteboards/' + whiteboardId + '/chat'));
    };

    return {
      'getWhiteboard': getWhiteboard,
      'getChatMessages': getChatMessages
    };

  });

}(window.angular));
