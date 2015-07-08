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

  angular.module('collabosphere').factory('whiteboardsFactory', function(utilService, $http) {

    /**
     * Get a whiteboard
     *
     * @param  {Number}               id                            The id of the whiteboard
     * @return {Promise<Whiteboard>}                                Promise returning the requested whiteboard
     */
    var getWhiteboard = function(id) {
      return $http.get(utilService.getApiUrl('/whiteboards/' + id));
    };

    /**
     * Get the whiteboards to which the current user has access in the current course
     *
     * @param  {Number}               page                          The results page to retrieve
     * @return {Promise<Object>}                                    $http promise returning the total number of whiteboards to which the current user has access in the current course and the whiteboards in the current page
     */
    var getWhiteboards = function(page) {
      return $http.get(utilService.getApiUrl('/whiteboards?offset=' + (page * 10)));
    };

    /**
     * Create a new whiteboard
     *
     * @param  {Object}               whiteboard                    The object representing the link that should be created
     * @param  {String}               whiteboard.title              The title of the whiteboard
     * @param  {Number[]}             [whiteboard.members]          The ids of the users that should be added to the whiteboard as members. The current user will automatically be added as a member
     * @return {Promise<Whiteboard>}                                Promise returning the created whiteboard
     */
    var createWhiteboard = function(whiteboard) {
      return $http.post(utilService.getApiUrl('/whiteboards'), whiteboard);
    };

    /**
     * Edit a whiteboard
     *
     * @param  {Number}               id                            The id of the whiteboard that is being edited
     * @param  {Object}               updatedWhiteboard             The object representing the updated whiteboard
     * @param  {String}               updatedWhiteboard.title       The updated title of the whiteboard
     * @param  {Number[]}             updatedWhiteboard.members     The ids of the users that should be a member of the whiteboard
     * @return {Promise<Whiteboard>}                                Promise returning the updated whiteboard
     */
    var editWhiteboard = function(id, updatedWhiteboard) {
      return $http.post(utilService.getApiUrl('/whiteboards/' + id), updatedWhiteboard);
    };

    /**
     * Get the most recent chat messages for a whiteboard
     *
     * @param  {Number}               whiteboardId                  The id of the whiteboard for which to get the most chat messages
     * @return {Promise<Chat[]>}                                    Promise returning the most recent chat messages
     */
    var getChatMessages = function(whiteboardId) {
      return $http.get(utilService.getApiUrl('/whiteboards/' + whiteboardId + '/chat'));
    };

    return {
      'getWhiteboard': getWhiteboard,
      'getWhiteboards': getWhiteboards,
      'createWhiteboard': createWhiteboard,
      'editWhiteboard': editWhiteboard,
      'getChatMessages': getChatMessages
    };

  });

}(window.angular));
