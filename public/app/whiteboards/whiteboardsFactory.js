/**
 * Copyright ©2017. The Regents of the University of California (Regents). All Rights Reserved.
 *
 * Permission to use, copy, modify, and distribute this software and its documentation
 * for educational, research, and not-for-profit purposes, without fee and without a
 * signed licensing agreement, is hereby granted, provided that the above copyright
 * notice, this paragraph and the following two paragraphs appear in all copies,
 * modifications, and distributions.
 *
 * Contact The Office of Technology Licensing, UC Berkeley, 2150 Shattuck Avenue,
 * Suite 510, Berkeley, CA 94720-1620, (510) 643-7201, otl@berkeley.edu,
 * http://ipira.berkeley.edu/industry-info for commercial licensing opportunities.
 *
 * IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT, SPECIAL,
 * INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF
 * THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF REGENTS HAS BEEN ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE
 * SOFTWARE AND ACCOMPANYING DOCUMENTATION, IF ANY, PROVIDED HEREUNDER IS PROVIDED
 * "AS IS". REGENTS HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
 * ENHANCEMENTS, OR MODIFICATIONS.
 */

(function(angular) {

  'use strict';

  angular.module('collabosphere').factory('whiteboardsFactory', function(utilService, $http) {

    /**
     * Get a whiteboard
     *
     * @param  {Number}               id                            The id of the whiteboard
     * @param  {Boolean}              track                         If true then track event in db
     * @return {Promise<Whiteboard>}                                Promise returning the requested whiteboard
     */
    var getWhiteboard = function(id, track) {
      var apiPath = '/whiteboards/' + id;
      if (!_.isUndefined(track) && track !== null) {
        apiPath += '?track=' + track;
      }
      return $http.get(utilService.getApiUrl(apiPath));
    };

    /**
     * Get the whiteboards to which the current user has access in the current course
     *
     * @param  {Number}               page                              The results page to retrieve
     * @param  {Object}               [searchOptions]                   A set of options to filter the results by
     * @param  {String}               [searchOptions.includeDeleted]    Whether deleted whiteboards should be included
     * @param  {String}               [searchOptions.keywords]          Keywords matching whiteboard title
     * @param  {Number}               [searchOptions.user]              The user id of a whiteboard member
     * @return {Promise<Object>}                                        $http promise returning the total number of whiteboards to which the current user has access in the current course and the whiteboards in the current page
     */
    var getWhiteboards = function(page, searchOptions) {
      page = page || 0;
      searchOptions = searchOptions || {};

      var url = '/whiteboards';
      url += '?offset=' + (page * 10);
      if (searchOptions.includeDeleted) {
        url += '&includeDeleted=true';
      }
      if (searchOptions.keywords) {
        url += '&keywords=' + encodeURIComponent(searchOptions.keywords);
      }
      if (searchOptions.user) {
        url += '&user=' + searchOptions.user;
      }
      return $http.get(utilService.getApiUrl(url));
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
     * Delete a whiteboard
     *
     * @param  {Number}               id                            The id of the whiteboard that is being deleted
     * @return {Promise<Whiteboard>}                                Promise returning the deletion result
     */
    var deleteWhiteboard = function(id) {
      return $http.delete(utilService.getApiUrl('/whiteboards/' + id));
    };

    /**
     * Restore a deleted whiteboard
     *
     * @param  {Number}               id                            The id of the whiteboard that is being restored
     * @return {Promise<Whiteboard>}                                Promise returning the restoration result
     */
    var restoreWhiteboard = function(id) {
      return $http.post(utilService.getApiUrl('/whiteboards/' + id + '/restore'));
    };

    /**
     * Get the most recent chat messages for a whiteboard
     *
     * @param  {Number}               whiteboardId                  The id of the whiteboard for which to get the most chat messages
     * @param  {String}               [before]                      The ISO 8601 timestamp before which the messages should have been created
     * @return {Promise<Object>}                                    Promise returning the most recent chat messages
     */
    var getChatMessages = function(whiteboardId, before) {
      var url = '/whiteboards/' + whiteboardId + '/chat';
      if (before) {
        url += '?before=' + before;
      }
      return $http.get(utilService.getApiUrl(url));
    };

    /**
     * Export a whiteboard to an asset
     *
     * @param  {Number}               id                            The id of the whiteboard to export
     * @param  {Object}               asset                         The object representing the exported whiteboard asset
     * @param  {String}               asset.title                   The title of the exported whiteboard
     * @param  {String}               [asset.description]           The description of the asset
     * @param  {Number[]}             [asset.categories]            The ids of the categories to which the asset should be associated
     * @return {Promise<Asset>}                                     Promise returning the exported whiteboard asset
     */
    var exportWhiteboardAsAsset = function(id, asset) {
      var url = utilService.getApiUrl('/whiteboards/' + id + '/export/asset');
      return $http.post(url, asset);
    };

    return {
      'getWhiteboard': getWhiteboard,
      'getWhiteboards': getWhiteboards,
      'createWhiteboard': createWhiteboard,
      'deleteWhiteboard': deleteWhiteboard,
      'editWhiteboard': editWhiteboard,
      'restoreWhiteboard': restoreWhiteboard,
      'getChatMessages': getChatMessages,
      'exportWhiteboardAsAsset': exportWhiteboardAsAsset
    };

  });

}(window.angular));
