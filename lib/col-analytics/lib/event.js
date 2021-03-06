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

var Joi = require('joi');
var Sequelize = require('sequelize');
var uuidv4 = require('uuid/v4');

var AnalyticsUtil = require('./util');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('col-analytics/event');

/**
 * @param  {User}           user                       The user associated with the event
 * @param  {Course}         course                     The course associated with the event
 * @param  {String}         canvasDomain               Identifies distinct Canvas instance
 * @param  {String}         eventName                  Human readable name of event
 * @param  {Object}         metadata                   Event metadata
 * @param  {Object}         [object]                   [Optional] Object associated with the event
 * @param  {Object}         [contextObject]            [Optional] Additional context (e.g., the asset associated with a comment)
 * @param  {Function}       callback                   Standard callback
 * @return {Object}                                    Summary of the event inserted in database
 */
var track = module.exports.track = function(user, course, canvasDomain, eventName, metadata, object, contextObject, callback) {
  // Validation
  var validationSchema = Joi.object().keys({
    eventName: Joi.string().max(255).required(),
    metadata: Joi.object().required(),
    canvasDomain: Joi.string().max(255).required()
  });

  var validationResult = Joi.validate({
    eventName: eventName,
    metadata: metadata,
    canvasDomain: canvasDomain
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  AnalyticsUtil.describeEvent(eventName, metadata, object, contextObject, function(err, activityId, assetId, commentId, whiteboardId, whiteboardElementUid) {
    if (err) {
      log.warn(err.message);
    }
    AnalyticsUtil.scrubMetadata(metadata, activityId, assetId, commentId, whiteboardId, whiteboardElementUid, function(eventMetadata) {
      var event = {
        uuid: uuidv4(),
        event_name: eventName,
        event_metadata: eventMetadata,
        canvas_domain: canvasDomain,
        user_id: user.id,
        canvas_user_id: user.canvas_user_id,
        user_full_name: user.canvas_full_name,
        canvas_course_role: user.canvas_course_role,
        course_id: course && course.id,
        canvas_course_id: course && course.canvas_course_id,
        course_name: course && course.name,
        activity_id: activityId,
        asset_id: assetId,
        comment_id: commentId,
        whiteboard_id: whiteboardId,
        whiteboard_element_uid: whiteboardElementUid
      };
      DB.Event.create(event).complete(function(dbErr, data) {
        if (dbErr) {
          log.error({'err': dbErr.message}, 'Failed to create record in \'events\' table');
          return callback({'code': 500, 'msg': dbErr.message});
        }

        return callback(null, data.toJSON());
      });
    });
  });
};
