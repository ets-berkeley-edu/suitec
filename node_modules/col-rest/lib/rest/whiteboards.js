/**
 * Copyright ©2020. The Regents of the University of California (Regents). All Rights Reserved.
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

module.exports = function(client) {
  client.whiteboards = {};

  /**
   * Get a whiteboard, including the list of members, online members and whiteboard
   * elements
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the whiteboard
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-whiteboards/lib/rest.js for more information
   */
  client.whiteboards.getWhiteboard = function(course, id, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/whiteboards/' + client.util.encodeURIComponent(id);
    client.request(requestUrl, 'GET', null, null, callback);
  };

  /**
   * Get chat messages associated with a whiteboard
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the whiteboard
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-whiteboards/lib/rest.js for more information
   */
  client.whiteboards.getChatMessages = function(course, id, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/whiteboards/' + client.util.encodeURIComponent(id) + '/chat';
    client.request(requestUrl, 'GET', null, null, callback);
  };

  /**
   * Get the whiteboards to which the current user has access in the current course
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Object}         [filters]                       A set of options to filter the results by
   * @param  {String}         [filters.includeDeleted]        Whether deleted whiteboards should be included
   * @param  {String}         [filters.keywords]              Keywords matching whiteboard title
   * @param  {Number}         [filters.user]                  The user id of a whiteboard member
   * @param  {Number}         [limit]                         The maximum number of results to retrieve. Defaults to 10
   * @param  {Number}         [offset]                        The number to start paging from. Defaults to 0
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-whiteboards/lib/rest.js for more information
   */
  client.whiteboards.getWhiteboards = function(course, filters, limit, offset, callback) {
    filters = filters || {};
    var requestUrl = client.util.apiPrefix(course) + '/whiteboards';
    var data = {
      'includeDeleted': filters.includeDeleted,
      'keywords': filters.keywords,
      'user': filters.user,
      'limit': limit,
      'offset': offset
    };
    client.request(requestUrl, 'GET', data, null, callback);
  };

  /**
   * Create a new whiteboard
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {String}         title                           The title of the whiteboard
   * @param  {Number[]}       [members]                       The ids of the users that should be added to the whiteboard as members. The current user will automatically be added as a member
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-whiteboards/lib/rest.js for more information
   */
  client.whiteboards.createWhiteboard = function(course, title, members, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/whiteboards';
    var data = {
      'title': title,
      'members': members
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Edit a whiteboard
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the whiteboard that is being edited
   * @param  {String}         title                           The updated title of the whiteboard
   * @param  {Number[]}       [members]                       The ids of the users that should be a member of the whiteboard
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-whiteboards/lib/rest.js for more information
   */
  client.whiteboards.editWhiteboard = function(course, id, title, members, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/whiteboards/' + client.util.encodeURIComponent(id);
    var data = {
      'title': title,
      'members': members
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Delete a whiteboard
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the whiteboard that is being deleted
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-whiteboards/lib/rest.js for more information
   */
  client.whiteboards.deleteWhiteboard = function(course, id, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/whiteboards/' + client.util.encodeURIComponent(id);
    client.request(requestUrl, 'DELETE', null, null, callback);
  };

  /**
   * Restore a deleted whiteboard
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the whiteboard that is being restored
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-whiteboards/lib/rest.js for more information
   */
  client.whiteboards.restoreWhiteboard = function(course, id, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/whiteboards/' + client.util.encodeURIComponent(id) + '/restore';
    client.request(requestUrl, 'POST', null, null, callback);
  };

  /**
   * Export a whiteboard to PNG
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the whiteboard that is being exported
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Buffer}         callback.data                   The PNG response
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-whiteboards/lib/rest.js for more information
   */
  client.whiteboards.exportWhiteboardToPng = function(course, id, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/whiteboards/' + client.util.encodeURIComponent(id) + '/export/png';
    client.request(requestUrl, 'GET', null, null, callback);
  };

  /**
   * Export a whiteboard to an asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the whiteboard that is being exported
   * @param  {String}         [title]                         The title of the exported whiteboard. Defaults to the whiteboard's title
   * @param  {Object}         [opts]                          A set of optional parameters
   * @param  {Number[]}       [opts.categories]               The ids of the categories to which the whiteboard should be associated
   * @param  {String}         [opts.description]              The description of the whiteboard
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.data                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-whiteboards/lib/rest.js for more information
   */
  client.whiteboards.exportWhiteboardToAsset = function(course, id, title, opts, callback) {
    opts = opts || {};
    var requestUrl = client.util.apiPrefix(course) + '/whiteboards/' + client.util.encodeURIComponent(id) + '/export/asset';
    var data = {
      'title': title,
      'categories': opts.categories,
      'description': opts.description
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };
};
