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
var Caliper = require('caliperjs/src/sensor');
var config = require('config');
var moment = require('moment-timezone');
var request = require('request');
var util = require('util');

var appPackage = require('../../../package.json');
var EventTypes = require('./constants');
var log = require('col-core/lib/logger')('col-analytics/caliper');

// caliper-js takes a nonstandard approach to prototyping; we work around it with
// intermediate constructor variables.
var entityFactoryConstructor = Caliper.Entities.EntityFactory;
var entityFactory = entityFactoryConstructor();
var eventFactoryConstructor = Caliper.Events.EventFactory;
var eventFactory = eventFactoryConstructor();

var sensor = Caliper.Sensor;

var appSchema = config.get('app.https') ? 'https' : 'http';
var appUrlBase = util.format('%s://%s', appSchema, config.get('app.host'));
var caliperOptions = config.get('analytics.caliper');

/**
 * Initialize Caliper sensor
 *
 * @return {void}
 */
var init = module.exports.init = function() {
  var sensorId = appUrlBase + '/sensor/1';
  sensor.initialize(sensorId);
};

/**
 * Track an event via Caliper sensor
 *
 * @param  {User}           user             The user associated with the event
 * @param  {Course}         course           Course associated with the user
 * @param  {String}         event            A string identifying the event type
 * @param  {Object}         [metadata]       Optional event metadata
 * @param  {Object}         [object]         Optional SuiteC object associated with the event
 * @param  {Object}         [contextObject]  Optional SuiteC object providing additional context (e.g., the asset associated with a comment)
 * @return {void}
 */
var track = module.exports.track = function(user, course, event, metadata, object, contextObject) {
  var caliperRequest = null;
  try {
    var caliperEvent = buildEvent(user, course, event, metadata, object, contextObject);
    if (!caliperEvent) {
      log.debug({'user': user.id, 'event': event}, 'No match found for Caliper event');
      return;
    }
    caliperRequest = buildRequestOptions(caliperEvent);
  } catch (caliperError) {
    log.error({'err': caliperError}, 'Error building Caliper envelope request');
    return;
  }

  log.debug({'request': caliperRequest}, 'Sending Caliper envelope request');

  request(caliperRequest, function(requestError, res, body) {
    if (requestError) {
      log.error({'request': caliperRequest, 'err': requestError}, 'Caliper request errored');
      return;
    }

    // Caliper doesn't specify how the LRS should respond, but we expect 200 OK or 201 Created as plausible statuses.
    if (res.statusCode !== 200 && res.statusCode !== 201) {
      log.error({
        'request': caliperRequest,
        'responseStatus': res.statusCode,
        'responseBody': res.body
      }, 'Caliper endpoint returned unexpected status code');
    }
  });
};

/**
 * Build a Caliper event from generic event data
 *
 * @param  {User}           user              The user associated with the event
 * @param  {Course}         course            The course associated with the event
 * @param  {String}         eventDescription  A string describing the event type
 * @param  {Object}         [metadata]        Optional event metadata
 * @param  {Object}         [eventObject]     Optional SuiteC object associated with the event
 * @param  {Object}         [contextObject]   Optional SuiteC object providing additional context (e.g., the asset associated with a comment)
 * @return {Object}                           The built Caliper event
 */
var buildEvent = function(user, course, eventDescription, metadata, eventObject, contextObject) {
  var actor = buildPerson(user, course);
  var courseSite = buildOrganization(course);
  var membership = buildMembership(user, actor, courseSite);

  var currentTime = moment.utc();

  var action = null;
  var eventType = null;
  var object = null;
  var generated = null;
  var referrer = null;
  var extensions = null;

  switch (eventDescription) {

    // LTI launch events

    case EventTypes.ltiLaunch.assetLibrary:
      action = Caliper.Actions.navigatedTo;
      eventType = Caliper.Events.NavigationEvent;
      object = buildSoftwareApplication('assetlibrary', 'Asset Library');
      break;
    case EventTypes.ltiLaunch.engagementIndex:
      action = Caliper.Actions.navigatedTo;
      eventType = Caliper.Events.NavigationEvent;
      object = buildSoftwareApplication('engagementindex', 'Engagement Index');
      break;
    case EventTypes.ltiLaunch.impactStudio:
      action = Caliper.Actions.navigatedTo;
      eventType = Caliper.Events.NavigationEvent;
      object = buildSoftwareApplication('dashboard', 'Impact Studio');
      break;
    case EventTypes.ltiLaunch.whiteboards:
      action = Caliper.Actions.navigatedTo;
      eventType = Caliper.Events.NavigationEvent;
      object = buildSoftwareApplication('whiteboards', 'Whiteboards');
      break;

    // Asset Library list view

    case EventTypes.assets.list:
      action = Caliper.Actions.viewed;
      eventType = Caliper.Events.ViewEvent;
      object = buildDigitalResourceCollection(course, 'assets');
      extensions = buildExtensions(metadata);
      break;
    case EventTypes.assets.search:
      action = Caliper.Actions.searched;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceCollection(course, 'assets');
      extensions = buildExtensions(metadata);
      break;

    // Asset Library item view

    case EventTypes.asset.view:
      action = Caliper.Actions.viewed;
      eventType = Caliper.Events.ViewEvent;
      object = buildDigitalResourceFromAsset(eventObject, course);
      break;

    // Asset creation and editing

    case EventTypes.asset.createLink:
    case EventTypes.asset.createFile:
      action = Caliper.Actions.created;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromAsset(eventObject, course);
      extensions = buildExtensions(metadata);
      break;
    case EventTypes.asset.edit:
      action = Caliper.Actions.modified;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromAsset(eventObject, course);
      break;

    // (Dis/un)liking

    case EventTypes.asset.like:
      action = Caliper.Actions.liked;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromAsset(eventObject, course);
      generated = entityFactory.create(Caliper.Entities.Annotation, {
        'id': util.format('%s/likes/%s', object.id, user.canvas_user_id),
        'name': 'Like',
        'annotator': actor.id,
        'annotated': object.id,
        'dateCreated': currentTime
      });
      break;
    case EventTypes.asset.dislike:
      action = Caliper.Actions.disliked;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromAsset(eventObject, course);
      generated = entityFactory.create(Caliper.Entities.Annotation, {
        'id': util.format('%s/likes/%s', object.id, user.canvas_user_id),
        'name': 'Dislike',
        'annotator': actor.id,
        'annotated': object.id,
        'dateCreated': currentTime
      });
      break;
    case EventTypes.asset.unlike:
      action = Caliper.Actions.removed;
      eventType = Caliper.Events.Event;
      object = util.format('%s/likes/%s', getEntityIdForAsset(eventObject.id, course), user.canvas_user_id);
      break;

    // Commenting

    case EventTypes.assetComment.create:
      action = Caliper.Actions.posted;
      eventType = Caliper.Events.MessageEvent;
      object = buildMessageFromAssetComment(eventObject, contextObject, course);
      referrer = getEntityIdForAsset(contextObject.id, course);
      break;
    case EventTypes.assetComment.edit:
      action = Caliper.Actions.modified;
      eventType = Caliper.Events.Event;
      object = buildMessageFromAssetComment(eventObject, contextObject, course);
      break;
    case EventTypes.assetComment.delete:
      action = Caliper.Actions.deleted;
      eventType = Caliper.Events.Event;
      object = getEntityIdForAssetComment(eventObject.id, contextObject.id, course);
      break;

    // Engagement Index

    case EventTypes.engagementIndex.index:
      action = Caliper.Actions.viewed;
      eventType = Caliper.Events.ViewEvent;
      object = buildDigitalResource(course, 'leaderboard');
      break;
    case EventTypes.engagementIndex.updateShare:
      action = metadata.ei_share ? Caliper.Actions.showed : Caliper.Actions.hid;
      eventType = Caliper.Events.Event;
      object = buildDigitalResource(course, 'leaderboard');
      break;
    case EventTypes.engagementIndex.points:
      action = Caliper.Actions.viewed;
      eventType = Caliper.Events.ViewEvent;
      object = buildDigitalResource(course, 'pointsconfiguration');
      break;

    // Whiteboards view

    case EventTypes.whiteboards.list:
      action = Caliper.Actions.viewed;
      eventType = Caliper.Events.ViewEvent;
      object = buildDigitalResourceCollection(course, 'whiteboards');
      extensions = buildExtensions(metadata);
      break;
    case EventTypes.whiteboards.search:
      action = Caliper.Actions.searched;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceCollection(course, 'whiteboards');
      extensions = buildExtensions(metadata);
      break;
    case EventTypes.whiteboard.view:
      action = Caliper.Actions.viewed;
      eventType = Caliper.Events.ViewEvent;
      object = buildDigitalResourceFromWhiteboard(eventObject, course);
      break;

    // Whiteboard creation and editing
    case EventTypes.whiteboard.create:
      action = Caliper.Actions.created;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromWhiteboard(eventObject, course);
      break;
    case EventTypes.whiteboard.settings:
      action = Caliper.Actions.modified;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromWhiteboard(eventObject, course);
      break;
    case EventTypes.whiteboardElement.create:
      action = Caliper.Actions.added;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromWhiteboardElement(eventObject, contextObject, course);
      break;
    case EventTypes.whiteboardElement.update:
      action = Caliper.Actions.modified;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromWhiteboardElement(eventObject, contextObject, course);
      break;
    case EventTypes.whiteboardElement.delete:
      action = Caliper.Actions.removed;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromWhiteboardElement(eventObject, contextObject, course);
      break;

    // Whiteboard chat messages

    case EventTypes.whiteboardChat.view:
      action = Caliper.Actions.viewed;
      eventType = Caliper.Events.ViewEvent;
      var resourcePath = util.format('whiteboards/%s/chats', eventObject.id);
      object = buildDigitalResourceCollection(course, resourcePath);
      referrer = getEntityIdForWhiteboard(eventObject.id, course);
      extensions = buildExtensions(metadata);
      break;
    case EventTypes.whiteboardChat.create:
      action = Caliper.Actions.posted;
      eventType = Caliper.Events.MessageEvent;
      object = buildMessageFromWhiteboardChat(eventObject, contextObject, course);
      referrer = getEntityIdForWhiteboard(contextObject.id, course);
      break;

    // Whiteboard export

    case EventTypes.whiteboard.exportAsAsset:
      action = Caliper.Actions.shared;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromWhiteboard(eventObject, course);
      generated = buildDigitalResourceFromAsset(contextObject, course);
      break;
    case EventTypes.whiteboard.exportAsImage:
      action = Caliper.Actions.retrieved;
      eventType = Caliper.Events.Event;
      object = buildDigitalResourceFromWhiteboard(eventObject, course);
      break;

    // If event description is not matched, exit early

    default:
      return null;
  }

  var eventProperties = {
    'actor': actor,
    'action': action.term,
    'object': object,
    'eventTime': currentTime,
    'group': courseSite,
    'membership': membership
  };

  if (generated) {
    eventProperties.generated = generated;
  }
  if (referrer) {
    eventProperties.referrer = referrer;
  }
  if (extensions) {
    eventProperties.extensions = extensions;
  }

  return eventFactory.create(eventType, eventProperties);
};

/**
 * Build Caliper envelope request options from a Caliper event
 *
 * @param  {Object}         event             The supplied Caliper event
 * @return {Object}                           The built request options
 */
var buildRequestOptions = function(event) {
  var parsedEvent = JSON.parse(Caliper.Clients.ClientUtils.stringify(event));
  log.debug({'event': parsedEvent}, 'Built Caliper event');

  var envelope = sensor.createEnvelope({
    'data': event
  });
  var serializedEnvelope = Caliper.Clients.ClientUtils.stringify(envelope);

  var requestOptions = {
    'uri': caliperOptions.url,
    'method': 'POST',
    'headers': {
      'Authorization': util.format('Bearer %s', caliperOptions.apiKey),
      'Content-Type': 'application/json'
    },
    'body': serializedEnvelope
  };

  return requestOptions;
};

/**
 * Create a Caliper DigitalResource entity for a supplied course and path
 *
 * @param  {Object}     course            The supplied course
 * @param  {Object}     path              The API path (e.g., 'assets', 'whiteboards') corresponding to the collection
 * @return {Object}                       The created DigitalResource entity
 */
var buildDigitalResource = function(course, path) {
  var id = util.format('%s/api/%s/%s/%s', appUrlBase, course.canvas_api_domain, course.canvas_course_id, path);

  return entityFactory.create(Caliper.Entities.DigitalResource, {
    'id': id
  });
};

/**
 * Create a Caliper DigitalResource entity from a SuiteC asset
 *
 * @param  {Asset}       asset         The supplied asset
 * @param  {Course}      course        The course associated with the asset
 * @return {Object}                    The created DigitalResource entity
 */
var buildDigitalResourceFromAsset = function(asset, course) {
  var id = getEntityIdForAsset(asset.id, course);

  var creators = _.map(asset.users, function(user) {
    return buildPerson(user, course);
  });

  var entityType = Caliper.Entities.DigitalResource;
  if (asset.mime) {
    if (asset.mime.startsWith('image/')) {
      entityType = Caliper.Entities.ImageObject;
    } else if (asset.mime.startsWith('video/')) {
      entityType = Caliper.Entities.VideoObject;
    } else if (asset.mime.startsWith('audio/')) {
      entityType = Caliper.Entities.AudioObject;
    } else if (asset.mime === 'application/pdf' ||
               asset.mime === 'application/msword' ||
               asset.mime.startsWith('application/vnd')) {
      entityType = Caliper.Entities.Document;
    }
  }

  return entityFactory.create(entityType, {
    'id': id,
    'name': asset.title,
    'description': asset.description,
    'keywords': _.map(asset.categories, 'title'),
    'creators': creators,
    'dateCreated': asset.created_at,
    'dateModified': asset.updated_at,
    'extensions': {
      'assetCommentCount': asset.comment_count,
      'assetLikeCount': asset.likes,
      'assetMime': asset.mime,
      'assetPinCount': _.size(asset.pins),
      'assetSource': asset.source,
      'assetType': asset.type,
      'assetViewCount': asset.views,
      'assetUrl': asset.url
    }
  });
};

/**
 * Create a Caliper DigitalResource entity from a SuiteC whiteboard
 *
 * @param  {Whiteboard}  whiteboard    The supplied whiteboard
 * @param  {Course}      course        The course associated with the whiteboard
 * @return {Object}                    The created DigitalResource entity
 */
var buildDigitalResourceFromWhiteboard = function(whiteboard, course) {
  var id = getEntityIdForWhiteboard(whiteboard.id, course);

  var creators = _.map(whiteboard.members, function(member) {
    return buildPerson(member, course);
  });

  return entityFactory.create(Caliper.Entities.DigitalResource, {
    'id': id,
    'name': whiteboard.title,
    'creators': creators,
    'dateCreated': whiteboard.created_at,
    'dateModified': whiteboard.updated_at
  });
};

/**
 * Create a Caliper DigitalResource entity from a SuiteC whiteboard element
 *
 * @param  {WhiteboardElement}   element       The supplied whiteboard element
 * @param  {Whiteboard}          whiteboard    The associated whiteboard
 * @param  {Course}              course        The course associated with the whiteboard
 * @return {Object}                            The created DigitalResource entity
 */
var buildDigitalResourceFromWhiteboardElement = function(element, whiteboard, course) {
  var whiteboardId = getEntityIdForWhiteboard(whiteboard.id, course);
  var elementId = util.format('%s/elements/%s', whiteboardId, element.uid);

  return entityFactory.create(Caliper.Entities.DigitalResource, {
    'id': elementId,
    'isPartOf': buildDigitalResourceFromWhiteboard(whiteboard, course),
    'extensions': _.pick(element, [
      'angle',
      'assetId',
      'backgroundColor',
      'fill',
      'index',
      'left',
      'scaleX',
      'scaleY',
      'stroke',
      'strokeWidth',
      'text',
      'top',
      'type'
    ])
  });
};

/**
 * Create a Caliper DigitalResourceCollection entity for a supplied course and path
 *
 * @param  {Object}     course            The supplied course
 * @param  {Object}     path              The API path (e.g., 'assets', 'whiteboards') corresponding to the collection
 * @return {Object}                       The created DigitalResourceCollection entity
 */
var buildDigitalResourceCollection = function(course, path) {
  var id = util.format('%s/api/%s/%s/%s', appUrlBase, course.canvas_api_domain, course.canvas_course_id, path);

  return entityFactory.create(Caliper.Entities.DigitalResourceCollection, {
    'id': id
  });
};

// Mapping from generic event metadata to keys that will be used for Caliper extensions.
var EXTENSION_PROPERTY_MAP = {
  'asset_search_category': 'assetSearchCategoryId',
  'asset_search_keywords': 'assetSearchKeywords',
  'asset_search_location': 'assetSearchContext',
  'asset_search_section': 'assetSearchSection',
  'asset_search_types': 'assetSearchType',
  'asset_search_user': 'assetSearchUserId',
  'whiteboards_search_keywords': 'whiteboardsSearchKeywords',
  'whiteboards_search_user': 'whiteboardsSearchUserId',
  'bookmarklet': 'assetCreationViaBookmarklet',
  'offset': 'queryResultsOffset',
  'total': 'queryResultsTotal'
};

/**
 * Create a Caliper extensions object by selecting and transforming keys from event metadata
 *
 * @param  {Object}     metadata            The supplied metadata
 * @return {Object}                         The created DigitalResourceCollection entity
 */
var buildExtensions = function(metadata) {
  return _.reduce(metadata, function(result, value, key) {
    if (EXTENSION_PROPERTY_MAP[key]) {
      result[EXTENSION_PROPERTY_MAP[key]] = value;
    }
    return result;
  }, {});
};

/**
 * Create a Caliper Membership entity linking a Person to an Organization
 *
 * @param  {User}           user            SuiteC user data
 * @param  {Object}         actor           Caliper Actor object created from the SuiteC user
 * @param  {Object}         courseSite      Caliper Organization object created from the SuiteC course
 * @return {Object}                         The created Membership entity
 */
var buildMembership = function(user, actor, courseSite) {
  var membershipRoles = [];
  if (user.canvas_course_role) {
    _.each(user.canvas_course_role.split(','), function(role) {
      switch (role) {
        case 'Instructor':
        case 'urn:lti:role:ims/lis/Instructor':
          membershipRoles.push('Instructor');
          break;
        case 'TeachingAssistant':
        case 'urn:lti:role:ims/lis/TeachingAssistant':
          membershipRoles.push('TeachingAssistant');
          break;
        case 'Administrator':
        case 'urn:lti:instrole:ims/lis/Administrator':
          membershipRoles.push('Administrator');
          break;
        case 'ContentDeveloper':
        case 'urn:lti:role:ims/lis/ContentDeveloper':
          membershipRoles.push('ContentDeveloper');
          break;
        default:
          break;
      }
    });
  }
  if (_.isEmpty(membershipRoles)) {
    membershipRoles.push('Learner');
  }

  var membershipStatus = user.canvas_enrollment_state === 'active' ? 'Active' : 'Inactive';

  return entityFactory.create(Caliper.Entities.Membership, {
    'id': courseSite.id + '/members/' + user.canvas_user_id,
    'member': actor.id,
    'organization': courseSite.id,
    'roles': _.uniq(membershipRoles),
    'status': membershipStatus
  });
};

/**
 * Create a Caliper Message entity from a SuiteC asset comment
 *
 * @param  {Comment}     comment       The supplied comment
 * @param  {Asset}       asset         The asset associated with the comment
 * @param  {Course}      course        The course associated with the comment
 * @return {Object}                    The created Message entity
 */
var buildMessageFromAssetComment = function(comment, asset, course) {
  var commentId = getEntityIdForAssetComment(comment.id, asset.id, course);

  var commentProperties = {
    'id': commentId,
    'creators': [ getEntityIdForUser(comment.user, course) ],
    'dateCreated': comment.created_at,
    'dateModified': comment.updated_at,
    'body': comment.body,
    'extensions': {
      'asset': getEntityIdForAsset(asset.id, course)
    }
  };

  if (comment.parent_id) {
    commentProperties.replyTo = getEntityIdForAssetComment(comment.parent_id, asset.id, course);
  }

  return entityFactory.create(Caliper.Entities.Message, commentProperties);
};

/**
 * Create a Caliper Message entity from a SuiteC whiteboard chat message
 *
 * @param  {Chat}        chatMessage   The supplied chat message
 * @param  {Whiteboard}  whiteboard    The whiteboard associated with the message
 * @param  {Course}      course        The course associated with the message
 * @return {Object}                    The created Message entity
 */
var buildMessageFromWhiteboardChat = function(chatMessage, whiteboard, course) {
  var whiteboardId = getEntityIdForWhiteboard(whiteboard.id, course);
  var messageId = util.format('%s/chats/%s', whiteboardId, chatMessage.id);

  var messageProperties = {
    'id': messageId,
    'creators': [ getEntityIdForUser(chatMessage.user, course) ],
    'dateCreated': chatMessage.created_at,
    'dateModified': chatMessage.updated_at,
    'body': chatMessage.body,
    'extensions': {
      'whiteboard': whiteboardId
    }
  };

  return entityFactory.create(Caliper.Entities.Message, messageProperties);
};

/**
 * Create a Caliper Organization entity from a SuiteC course object
 *
 * @param  {Course}         course          The course to be transformed
 * @return {Object}                         The created Organization entity
 */
var buildOrganization = function(course) {
  var schema = course.canvas.use_https ? 'https' : 'http';
  var courseSiteId = schema + '://' + course.canvas.canvas_api_domain + '/courses/' + course.canvas_course_id;
  return entityFactory.create(Caliper.Entities.Organization, {
    'id': courseSiteId,
    'name': course.name
  });
};

/**
 * Create a Caliper Person entity from SuiteC user and course objects
 *
 * @param  {User}           user            The user to be transformed
 * @param  {Course}         course          The course associated with the user
 * @return {Object}                         The created Person entity
 */
var buildPerson = function(user, course) {
  var userId = getEntityIdForUser(user, course);
  return entityFactory.create(Caliper.Entities.Person, {
    'id': userId,
    'name': user.canvas_full_name
  });
};

/**
 * Create a Caliper SoftwareApplication entity representing a SuiteC LTI tool
 *
 * @param  {String}         toolId        String id of the tool
 * @param  {String}         toolName      Full name of the tool
 * @return {Object}                       The created SoftwareApplication entity
 */
var buildSoftwareApplication = function(toolId, toolName) {
  var schema = config.get('app.https') ? 'https' : 'http';
  var cartridgeUrl = schema + '://' + config.get('app.host') + '/lti/' + toolId + '.xml';
  return entityFactory.create(Caliper.Entities.SoftwareApplication, {
    'id': cartridgeUrl,
    'name': toolName,
    'version': appPackage.version
  });
};

/**
 * Return a Caliper Entity id for a SuiteC asset
 *
 * @param  {Asset}       assetId       The supplied asset ID
 * @param  {Course}      course        The course associated with the asset
 * @return {String}                    The id string
 */
var getEntityIdForAsset = function(assetId, course) {
  return util.format('%s/api/%s/%s/assets/%s', appUrlBase, course.canvas_api_domain, course.canvas_course_id, assetId);
};

/**
 * Return a Caliper Entity id for a SuiteC asset comment
 *
 * @param  {Number}      commentId     The supplied asset comment ID
 * @param  {Number}      assetId       The ID of the asset associated with the comment
 * @param  {Course}      course        The course associated with the asset comment
 * @return {String}                    The id string
 */
var getEntityIdForAssetComment = function(commentId, assetId, course) {
  return util.format('%s/api/%s/%s/assets/%s/comments/%s', appUrlBase, course.canvas_api_domain, course.canvas_course_id, assetId, commentId);
};

/**
 * Return a Caliper Entity id for a SuiteC user
 *
 * @param  {User}        user          The supplied user
 * @param  {Course}      course        The course associated with the user
 * @return {String}                    The id string
 */
var getEntityIdForUser = function(user, course) {
  var schema = course.canvas.use_https ? 'https' : 'http';
  return schema + '://' + course.canvas.canvas_api_domain + '/users/' + user.canvas_user_id;
};

/**
 * Return a Caliper Entity id for a SuiteC whiteboard
 *
 * @param  {Number}      whiteboardId  The supplied whiteboard ID
 * @param  {Course}      course        The course associated with the whiteboard
 * @return {String}                    The id string
 */
var getEntityIdForWhiteboard = function(whiteboardId, course) {
  return util.format('%s/api/%s/%s/whiteboards/%s', appUrlBase, course.canvas_api_domain, course.canvas_course_id, whiteboardId);
};
