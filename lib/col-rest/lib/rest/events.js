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

  client.events = {};

  /**
   * Track an event and its metadata (site analytics)
   *
   * @param  {Course}         course                     Course per context
   * @param  {String}         eventName                  Type of user activity
   * @param  {Object}         [metadata]                 IDs associated with user activity on SuiteC
   * @param  {Number}         [activityId]               Object id
   * @param  {Number}         [assetId]                  Object id
   * @param  {Number}         [commentId]                Object id
   * @param  {Number}         [whiteboardId]             Object id
   * @param  {Number}         [whiteboardElementUid]     Object id
   * @param  {Function}       callback                   Standard callback function
   * @param  {Object}         callback.err               Error, if any
   * @param  {Object}         callback.body              JSON response
   * @param  {Response}       callback.response          The response object
   */
  client.events.track = function(course, eventName, metadata, activityId, assetId, commentId, whiteboardId, whiteboardElementUid, callback) {
    var data = {
      event: eventName,
      metadata: metadata,
      activityId: activityId,
      assetId: assetId,
      commentId: commentId,
      whiteboardId: whiteboardId,
      whiteboardElementUid: whiteboardElementUid
    };
    client.request(client.util.apiPrefix(course) + '/track', 'POST', data, null, function() {
      return callback();
    });
  };
};
