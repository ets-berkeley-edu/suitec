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
     * Create a new chat message on a whiteboard
     *
     * @param  {Number}               whiteboardId          The id of the whiteboard to which the chat message is added
     * @param  {String}               body                  The body of the chat message
     * @return {Promise<Chat>}                              Promise returning the created chat message
     */
    var createChatMessage = function(whiteboardId, body) {
      var chatMessage = {
        'body': body
      };
      return $http.post(utilService.getApiUrl('/whiteboards/' + whiteboardId + '/chat'), chatMessage);
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

    /**
     * TODO
     */
    var addWhiteboardElement = function(whiteboardId, element) {
      return $http.post(utilService.getApiUrl('/whiteboards/' + whiteboardId + '/elements'), element);
    };

    /**
     * TODO
     */
    var updateWhiteboardElement = function(whiteboardId, element) {
      return $http.post(utilService.getApiUrl('/whiteboards/' + whiteboardId + '/elements/' + element.uid), element);
    };

    return {
      'createChatMessage': createChatMessage,
      'getChatMessages': getChatMessages,
      'addWhiteboardElement': addWhiteboardElement,
      'updateWhiteboardElement': updateWhiteboardElement
    };

  });

}(window.angular));
