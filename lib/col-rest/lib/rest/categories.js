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
  client.categories = {};

  /**
   * Get the categories for the current course
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Boolean}        includeInvisible                Whether the invisible categories should be included
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-categories/lib/rest.js for more information
   */
  client.categories.getCategories = function(course, includeInvisible, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/categories';
    var data = {
      'includeInvisible': includeInvisible
    }
    client.request(requestUrl, 'GET', data, null, callback);
  };

  /**
   * Create a new category
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {String}         title                           The name of the category
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-categories/lib/rest.js for more information
   */
  client.categories.createCategory = function(course, title, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/categories';
    var data = {
      'title': title
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Edit a category
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the category that is being edited
   * @param  {String}         title                           The updated category name
   * @param  {Boolean}        visible                         Whether assets associated to this category should be visible in the Asset Library
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-categories/lib/rest.js for more information
   */
  client.categories.editCategory = function(course, id, title, visible, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/categories/' + client.util.encodeURIComponent(id);
    var data = {
      'title': title,
      'visible': visible
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Delete a category
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the category that is being deleted
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-categories/lib/rest.js for more information
   */
  client.categories.deleteCategory = function(course, id, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/categories/' + client.util.encodeURIComponent(id);
    client.request(requestUrl, 'DELETE', null, null, callback);
  };
};
