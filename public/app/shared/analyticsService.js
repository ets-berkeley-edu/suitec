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

(function(angular) {

  'use strict';

  angular.module('collabosphere').service('analyticsService', function(utilService, $http, $q) {

    /**
     * @param  {Object}      metadata     Object IDs (asset, whiteboard, etc.) and other event info
     * @param  {String[]}    keys         Variety of key types, for example 'asset_id' and 'assetId'
     * @return {Number}                   Object id
     */
    var get = function(metadata, keys) {
      var value = null;
      _.each(keys, function(key) {
        value = metadata[key];
        // Break out of loop if value is defined
        return value === null || _.isUndefined(value);
      });
      return value;
    };

    /**
     * @param  {String}         event           Event type
     * @param  {Object}         [metadata]      Object IDs (asset, whiteboard, etc.) and other event info
     * @return {Promise}                        HTTP post
     */
    var recordEvent = function(event, metadata) {
      metadata = metadata || {};
      var args = {
        activityId: get(metadata, ['activityId', 'activity_id']),
        assetId: get(metadata, ['assetId', 'asset_id']),
        commentId: get(metadata, ['commentId', 'comment_id']),
        whiteboardId: get(metadata, ['whiteboardId', 'whiteboard_id']),
        whiteboardElementUid: get(metadata, ['whiteboardElementUid', 'whiteboard_element_uid', 'whiteboard_element_id'])
      };
      // Remove what was extracted above
      var omitKeys = [
        'activityId',
        'activity_id',
        'assetId',
        'asset_id',
        'commentId',
        'comment_id',
        'whiteboardId',
        'whiteboard_id',
        'whiteboardElementUid',
        'whiteboard_element_uid',
        'whiteboard_element_id'
      ];
      metadata = _.omit(metadata, omitKeys);
      // Merge remaining metadata
      args = _.merge(args, {
        event: event,
        metadata: metadata
      });

      return $http.post(utilService.getApiUrl('/track'), args);
    };

    /**
     * Track an event and its metadata (site analytics)
     *
     * @param  {String}         event           Event type
     * @param  {Object}         [metadata]      Object IDs (asset, whiteboard, etc.) and other event info
     * @return {void}
     */
    var track = function(event, metadata) {
      return $q(function(resolve) {
        setTimeout(function() {
          return recordEvent(event, metadata).then(resolve);
        }, 1000);
      });
    };

    return {
      'track': track
    };

  });

}(window.angular));
