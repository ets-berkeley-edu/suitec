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

var _ = require('lodash');
var async = require('async');
var config = require('config');
var log = require('col-core/lib/logger')('col-analytics/api');

var AnalyticsUtil = require('./util');
var CaliperAPI = require('./caliper');
var EventAPI = require('./event');
var MixpanelAPI = require('./mixpanel');

var caliperEnabled = config.get('analytics.caliper.enabled');
var mixpanelEnabled = config.get('analytics.mixpanel.enabled');

/**
 * Initialize analytics endpoints
 *
 * @return {void}
 */
var init = function() {
  if (caliperEnabled) {
    CaliperAPI.init();
  }
  if (mixpanelEnabled) {
    MixpanelAPI.init();
  }
};

/**
 * Store or update user data in analytics endpoints
 *
 * @param  {User}           user            The user to store or update
 * @return {void}
 */
var identifyUser = module.exports.identifyUser = function(user) {
  if (mixpanelEnabled) {
    MixpanelAPI.identifyUser(user);
  }
};

/**
 * Track an event
 *
 * @param  {User}           user             The user associated with the event
 * @param  {String}         event            A string identifying the event type
 * @param  {Object}         [metadata]       Optional event metadata
 * @param  {Object}         [object]         Optional SuiteC object associated with the event
 * @param  {Object}         [contextObject]  Optional SuiteC object providing additional context (e.g., the asset associated with a comment)
 * @return {void}
 */
var track = module.exports.track = function(user, event, metadata, object, contextObject) {
  AnalyticsUtil.getCourseIfMissing(user, function(err, course) {
    if (err) {
      log.error({'err': err.message, 'user': user.id}, 'Error retrieving course');
    }
    async.parallel([
      function(callback) {
        var canvasDomain = (course && course.canvas_api_domain) || 'global';
        return EventAPI.track(user, course, canvasDomain, event, metadata, object, contextObject, callback);
      },
      function(callback) {
        if (caliperEnabled) {
          CaliperAPI.track(user, course, event, metadata, object, contextObject);
        }
        return callback();
      },
      function(callback) {
        if (mixpanelEnabled) {
          MixpanelAPI.track(user, event, metadata);
        }
        return callback();
      }
    ],
    function(asyncErr, results) {
      if (asyncErr) {
        log.error({'err': asyncErr.message}, 'Error in event tracking and/or Caliper sensor');
      }
    });
  });
};

/**
 * Get the tracking properties for an asset
 *
 * @param  {Asset}          asset           The asset for which to get the tracking properties
 * @return {Object}                         The tracking properties for the provided asset
 */
var getAssetProperties = module.exports.getAssetProperties = function(asset) {
  return {
    'asset_canvas_assignment_id': asset.canvas_assignment_id,
    'asset_categories': _.map(asset.categories, 'id'),
    'asset_categories_count': asset.categories.length,
    'asset_comment_count': asset.comment_count,
    'asset_created_at': asset.created_at,
    'asset_description': asset.description,
    'asset_description_hashtag': (asset.description ? asset.description.indexOf('#') !== -1 : false),
    'asset_description_length': (asset.description ? asset.description.length : 0),
    'asset_dislikes': asset.dislikes,
    'asset_embed_id': asset.embed_id,
    'asset_id': asset.id,
    'asset_image_url': asset.image_url,
    'asset_liked': asset.liked,
    'asset_likes': asset.likes,
    'asset_mime': asset.mime,
    'asset_pin_count': _.size(asset.pins),
    'asset_source': asset.source,
    'asset_thumbnail_url': asset.thumbnail_url,
    'asset_title': asset.title,
    'asset_type': asset.type,
    'asset_updated_at': asset.updated_at,
    'asset_url': asset.url,
    'asset_users': _.map(asset.users, 'id'),
    'asset_users_count': asset.users.length,
    'asset_views': asset.views
  };
};

/**
 * Get the tracking properties for an asset comment
 *
 * @param  {Comment}        comment         The comment for which to get the tracking properties
 * @param  {Asset}          asset           The asset to which the comment belongs
 * @return {Object}                         The tracking properties for the provided comment and asset
 */
var getAssetCommentProperties = module.exports.getAssetCommentProperties = function(comment, asset) {
  // Comment properties
  var properties = {
    'comment_id': comment.id,
    'comment_body': comment.body,
    'comment_body_length': comment.body.length,
    'comment_created_at': comment.created_at,
    'comment_updated_at': comment.updated_at,
    'comment_parent_id': comment.parent_id,
    'comment_is_reply': comment.parent_id ? true : false
  };
  // Add the asset properties
  _.extend(properties, getAssetProperties(asset));
  return properties;
};

/**
 * Get the tracking properties for a whiteboard
 *
 * @param  {Whiteboard}     whiteboard      The whiteboard for which to get the tracking properties
 * @return {Object}                         The tracking properties for the provided whiteboard
 */
var getWhiteboardProperties = module.exports.getWhiteboardProperties = function(whiteboard) {
  // Base whiteboard properties
  var properties = {
    'whiteboard_created_at': whiteboard.created_at,
    'whiteboard_id': whiteboard.id,
    'whiteboard_image_url': whiteboard.image_url,
    'whiteboard_thumbnail_url': whiteboard.thumbnail_url,
    'whiteboard_title': whiteboard.title,
    'whiteboard_updated_at': whiteboard.updated_at
  };
  // The number of members in the whiteboard
  if (whiteboard.members) {
    properties.whiteboard_members = whiteboard.members.length;
  }
  // The number of elements in the whiteboard
  if (whiteboard.whiteboard_elements) {
    properties.whiteboard_elements = whiteboard.whiteboard_elements.length;
  } else if (whiteboard.whiteboardElements) {
    properties.whiteboard_elements = whiteboard.whiteboardElements.length;
  }
  // The number of online users in the whiteboard
  if (whiteboard.onlineUsers) {
    properties.whiteboard_online = whiteboard.onlineUsers.length;
  }
  return properties;
};

/**
 * Get the tracking properties for a whiteboard element
 *
 * @param  {Element}        element         The whiteboard element for which to get the tracking properties
 * @param  {Whiteboard}     whiteboard      The whiteboard to which the element belongs
 * @param  {Number}         total           The total number of elements in the current batch of element updates
 * @return {Object}                         The tracking properties for the provided whiteboard element and whiteboard
 */
var getWhiteboardElementProperties = module.exports.getWhiteboardElementProperties = function(element, whiteboard, total) {
  // Element properties
  var properties = {
    'whiteboard_batch_total': total,
    'whiteboard_element_angle': element.angle,
    'whiteboard_element_asset_id': element.assetId,
    'whiteboard_element_background_color': element.backgroundColor,
    'whiteboard_element_fill': element.fill,
    'whiteboard_element_id': element.uid,
    'whiteboard_element_index': element.index,
    'whiteboard_element_left': element.left,
    'whiteboard_element_scale_x': element.scaleX,
    'whiteboard_element_scale_y': element.scaleY,
    'whiteboard_element_stroke': element.stroke,
    'whiteboard_element_stroke_width': element.strokeWidth,
    'whiteboard_element_text': element.text,
    'whiteboard_element_top': element.top,
    'whiteboard_element_type': element.type
  };
  // Add the asset properties
  _.extend(properties, getWhiteboardProperties(whiteboard));
  return properties;
};

init();
