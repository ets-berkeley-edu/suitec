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
var Joi = require('joi');
var randomstring = require('randomstring');

var CanvasAPI = require('col-canvas');
var CollabosphereConstants = require('col-core/lib/constants');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('col-users');

var UserConstants = require('./constants');

/**
 * Get a user by its id
 *
 * @param  {Number}       id                  The id of the user
 * @param  {Function}     callback            Standard callback function
 * @param  {Object}       callback.err        An error object, if any
 * @param  {User}         callback.user       The retrieved user
 */
var getUser = module.exports.getUser = function(id, callback) {
  // Parameter validation
  var validationSchema = Joi.object().keys({
    'id': Joi.number().required()
  });

  var validationResult = Joi.validate({
    'id': id
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Get the user from the DB
  var options = {
    'where': {
      'id': id
    },
    'include': [{
      'model': DB.Course,
      'include': [{
        'model': DB.Canvas,
        'as': 'canvas',
        'attributes': ['canvas_api_domain', 'use_https', 'logo', 'name']
      }]
    }]
  };
  DB.User.findOne(options).complete(function(err, user) {
    if (err) {
      log.error({'err': err, 'id': id}, 'Failed to get a user');
      return callback({'code': 500, 'msg': err.message});
    } else if (!user) {
      log.debug({'err': err, 'id': id}, 'A user with the specified id could not be found');
      return callback({'code': 404, 'msg': 'A user with the specified id could not be found'});
    }

    return callback(null, user);
  });
};

/**
 * Get a user by its bookmarklet token
 *
 * @param  {Number}       id                  The id of the user
 * @param  {String}       bookmarkletToken    The bookmarklet token for the user
 * @param  {Function}     callback            Standard callback function
 * @param  {Object}       callback.err        An error object, if any
 * @param  {User}         callback.user       The retrieved user
 */
var getUserByBookmarkletToken = module.exports.getUserByBookmarkletToken = function(id, bookmarkletToken, callback) {
  // Parameter validation
  var validationSchema = Joi.object().keys({
    'id': Joi.number().required(),
    'bookmarkletToken': Joi.string().required()
  });

  var validationResult = Joi.validate({
    'id': id,
    'bookmarkletToken': bookmarkletToken
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Get the user from the DB
  var options = {
    'where': {
      'id': id,
      'bookmarklet_token': bookmarkletToken
    },
    'include': [{
      'model': DB.Course,
      'include': [{
        'model': DB.Canvas,
        'as': 'canvas',
        'attributes': ['use_https']
      }]
    }]
  };
  DB.User.findOne(options).complete(function(err, user) {
    if (err) {
      log.error({'err': err, 'id': id}, 'Failed to get a user by its bookmarklet token');
      return callback({'code': 500, 'msg': err.message});
    } else if (!user) {
      log.debug({'err': err, 'id': id}, 'A user with the specified bookmarklet token could not be found');
      return callback({'code': 404, 'msg': 'A user with the specified bookmarklet token could not be found'});
    }

    return callback(null, user);
  });
};

/**
 * Get a user. If the user doesn't exist, it will be created
 *
 * @param  {Number}     canvasUserId                            The id of the user in Canvas
 * @param  {Course}     course                                  The course the user belongs to
 * @param  {Object}     profileInfo                             A set of properties to create the user object with. If the user already exist, it will be updated using these properties
 * @param  {String}     profileInfo.canvas_course_role          The role of the user in the course
 * @param  {String}     [profileInfo.canvas_enrollment_state]   The enrollment state of the user in the course. Should be one of @{link CollabosphereConstants.ENROLLMENT_STATE}, defaults to CollabosphereConstants.ENROLLMENT_STATE.ACTIVE
 * @param  {String}     profileInfo.canvas_full_name            The full name of the user
 * @param  {String}     profileInfo.canvas_image                A URL that points to an image for the user
 * @param  {String}     profileInfo.canvas_email                The email of the user
 * @param  {String}     profileInfo.personal_bio                User's personal description
 * @param  {Function}   callback                                Standard callback function
 * @param  {Object}     callback.err                            An error object, if any
 * @param  {User}       callback.user                           The retrieved or created user
 */
var getOrCreateUser = module.exports.getOrCreateUser = function(canvasUserId, course, profileInfo, callback) {
  profileInfo = profileInfo || {};
  profileInfo.canvas_enrollment_state = profileInfo.canvas_enrollment_state || CollabosphereConstants.ENROLLMENT_STATE.ACTIVE;

  // Parameter validation
  var validationSchema = Joi.object().keys({
    'canvasUserId': Joi.number().required(),
    'course': Joi.object().required(),
    'profileInfo': Joi.object().keys({
      'canvas_course_role': Joi.string().required(),
      'canvas_course_sections': Joi.array().items(Joi.string()).optional(),
      'canvas_enrollment_state': Joi.string().valid(_.values(CollabosphereConstants.ENROLLMENT_STATE)).required(),
      'canvas_full_name': Joi.string().required(),
      'canvas_image': Joi.string().allow('').optional(),
      'canvas_email': Joi.string().allow('').optional(),
      'personal_bio': Joi.string().allow('').optional()
    })
  });

  var validationResult = Joi.validate({
    'canvasUserId': canvasUserId,
    'course': course,
    'profileInfo': profileInfo
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Generate a bookmarklet token in case the user doesn't exist yet
  var newUser = _.cloneDeep(profileInfo);
  newUser.bookmarklet_token = randomstring.generate();

  // Get the user from the DB or create it if it doesn't exist yet
  options = {
    'where': {
      'canvas_user_id': canvasUserId,
      'course_id': course.id
    },
    'defaults': newUser
  };
  DB.User.findOrCreate(options).complete(function(err, data) {
    if (err) {
      log.error({'err': err}, 'Failed to get or create a user');
      return callback({'code': 500, 'msg': err.message});
    }

    var user = data[0];
    var wasCreated = data[1];

    if (wasCreated) {
      log.info({'id': user.id}, 'Created a new user');
      return callback(null, user);

    // If the user already exists, we update its profile values with the
    // values supplied by Canvas
    } else {
      user.update(profileInfo).complete(function(err, user) {
        if (err) {
          log.error({'err': err}, 'Failed to update a user');
          return callback({'code': 500, 'msg': err.message});
        }

        return callback(null, user);
      });
    }
  });
};

/**
 * Get users in the current course by their id
 *
 * @param  {Context}        ctx                         Standard context containing the current user and the current course
 * @param  {Number[]}       ids                         The ids of the users that should be retrieved
 * @param  {Function}       callback                    Standard callback function
 * @param  {Object}         callback.err                An error that occurred, if any
 * @param  {User[]}         callback.users              The retrieved users
 */
var getUsers = module.exports.getUsers = function(ctx, ids, callback) {
  // Return immediately if no user ids have been provided
  if (_.isEmpty(ids)) {
    return callback(null, []);
  }

  // Parameter validation
  var validationSchema = Joi.object().keys({
    'ids': Joi.array().unique().items(Joi.number()).required()
  });

  var validationResult = Joi.validate({
    'ids': ids
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Get the users from the DB
  var options = {
    'where': {
      'course_id': ctx.course.id,
      'id': ids
    }
  };

  DB.User.findAll(options).complete(function(err, users) {
    if (err) {
      log.error({'err': err, 'ids': ids}, 'Failed to get a set of users');
      return callback({'code': 500, 'msg': err.message});
    } else if (users.length !== ids.length) {
      log.error({'err': err, 'ids': ids}, 'Could not retrieve all requested users');
      return callback({'code': 404, 'msg': 'Could not retrieve all requested users'});
    }

    return callback(null, users);
  });
};

/**
 * Get all the users in the current course
 *
 * @param  {Context}    ctx                             Standard context containing the current user and the current course
 * @param  {Object}     [options]                       Filter options
 * @param  {String[]}   [options.enrollmentStates]      The enrollment states of the users in the course. One of {@link CollabosphereConstants.ENROLLMENT_STATE}. Defaults to `active` and `invited`
 * @param  {String}     [options.includeEmail]          Whether to include the email address on the user objects. Defaults to false. It's up to the caller to ensure email addresses are dealt with securely
 * @param  {String}     [options.includeLastActivity]   Whether to include last activity timestamps on the user objects. Defaults to false.
 * @param  {Function}   callback                        Standard callback function
 * @param  {Object}     callback.err                    An error that occurred, if any
 * @param  {User[]}     callback.users                  All users in the current course
 */
var getAllUsers = module.exports.getAllUsers = function(ctx, options, callback) {
  options = options || {};
  options.enrollmentStates = options.enrollmentStates || [
    CollabosphereConstants.ENROLLMENT_STATE.ACTIVE,
    CollabosphereConstants.ENROLLMENT_STATE.INVITED
  ];

  var attributes = UserConstants.BASIC_USER_FIELDS;
  if (options.includeEmail) {
    attributes = _.union(attributes, UserConstants.EMAIL_FIELDS);
  }
  if (options.includeLastActivity) {
    // created_at can be a useful fallback datum in cases where last_activity is null.
    attributes = _.union(attributes, ['last_activity', 'created_at']);
  }

  // Get the users from the DB
  var queryOptions = {
    'where': {
      'course_id': ctx.course.id,
      'canvas_enrollment_state': options.enrollmentStates
    },
    'attributes': attributes,
    'order': [ ['canvas_full_name', 'ASC'] ]
  };
  DB.User.findAll(queryOptions).complete(function(err, users) {
    if (err) {
      log.error({'err': err, 'course': ctx.course}, 'Failed to get the users in the current course');
      return callback({'code': 500, 'msg': err.message});
    }

    return callback(null, users);
  });
};

/**
 * Get the users in the current course and their points
 *
 * @param  {Context}    ctx                             Standard context containing the current user and the current course
 * @param  {Object}     [options]                       Filter options
 * @param  {String[]}   [options.enrollmentStates]      The enrollment states of the users in the course. One of {@link CollabosphereConstants.ENROLLMENT_STATE}. Defaults to `active` and `invited`
 * @param  {String}     [options.includeEmail]          Whether to include the email address on the user objects. Defaults to false. It's up to the caller to ensure email addresses are dealt with securely
 * @param  {Function}   callback                        Standard callback function
 * @param  {Object}     callback.err                    An error that occurred, if any
 * @param  {User[]}     callback.users                  The users in the current course and their points
 */
var getLeaderboard = module.exports.getLeaderboard = function(ctx, options, callback) {
  options = options || {};
  options.enrollmentStates = options.enrollmentStates || [
    CollabosphereConstants.ENROLLMENT_STATE.ACTIVE,
    CollabosphereConstants.ENROLLMENT_STATE.INVITED
  ];

  var attributes = UserConstants.POINTS_USER_FIELDS;
  if (options.includeEmail) {
    attributes = _.union(UserConstants.POINTS_USER_FIELDS, UserConstants.EMAIL_FIELDS);
  }

  // Only instructors and users that have opted into sharing their points with
  // the course are able to retrieve the list of users for the course
  if (!ctx.user.share_points && !ctx.user.is_admin) {
    log.error({'id': ctx.user.id}, 'Unauthorized to get the list of users for the course');
    return callback({'code': 401, 'msg': 'Unauthorized to get the list of users for the course'});
  }

  // Get the users from the DB
  var queryOptions = {
    'where': {
      'course_id': ctx.course.id,
      'canvas_enrollment_state': options.enrollmentStates
    },
    'attributes': attributes,
    'order': [['points', 'DESC'], ['id', 'ASC']]
  };

  // Only instructors are able to see all users in the course. Non-administrators
  // are only able to see the users that have opted into sharing their points with the course
  if (!ctx.user.is_admin) {
    queryOptions.where.share_points = true;
  }

  DB.User.findAll(queryOptions).complete(function(err, users) {
    if (err) {
      log.error({'err': err, 'course': ctx.course}, 'Failed to get the users in the current course');
      return callback({'code': 500, 'msg': err.message});
    }

    return callback(null, users);
  });
};

/**
 * Update user's personal description.
 *
 * @param  {Context}    ctx                             Standard context containing the current user and the current course
 * @param  {String}     personalBio                     User's personal description
 * @param  {Function}   callback                        Standard callback function
 * @param  {Object}     callback.err                    An error that occurred, if any
 * @param  {User}       callback.user                   The updated user
 */
var updatePersonalBio = module.exports.updatePersonalBio = function(ctx, personalBio, callback) {
  var update = {
    'personal_bio': _.trim(personalBio)
  };

  // Parameter validation
  var validationSchema = Joi.object().keys({
    'personal_bio': Joi.string().optional().allow('').max(255)
  });

  var validationResult = Joi.validate(update, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Update personal_bio in the DB
  ctx.user.update(update).complete(function(err, user) {
    if (err) {
      log.error({'err': err}, 'Failed to update user\'s personal_bio');
      return callback({'code': 500, 'msg': err.message});
    }

    return callback(null, user);
  });
};

/**
 * Update the points share status for a user. This will determine whether the user's
 * points are shared with the course
 *
 * @param  {Context}    ctx                             Standard context containing the current user and the current course
 * @param  {Boolean}    share                           Whether the user's points should be shared with the course
 * @param  {Function}   callback                        Standard callback function
 * @param  {Object}     callback.err                    An error that occurred, if any
 * @param  {User}       callback.user                   The updated user
 */
var updateSharePoints = module.exports.updateSharePoints = function(ctx, share, callback) {
  var update = {
    'share_points': share
  };

  // Parameter validation
  var validationSchema = Joi.object().keys({
    'share_points': Joi.boolean().required()
  });

  var validationResult = Joi.validate(update, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Update the share status in the DB
  ctx.user.update(update).complete(function(err, user) {
    if (err) {
      log.error({'err': err}, 'Failed to update the share status');
      return callback({'code': 500, 'msg': err.message});
    }

    return callback(null, user);
  });
};

/**
 * Update the current user's looking-for-collaborators status
 *
 * @param  {Context}    ctx                             Standard context containing the current user and the current course
 * @param  {Boolean}    looking                         Whether the user is looking for collaborators
 * @param  {Function}   callback                        Standard callback function
 * @param  {Object}     callback.err                    An error that occurred, if any
 * @param  {User}       callback.user                   The updated user
 */
var updateLookingForCollaborators = module.exports.updateLookingForCollaborators = function(ctx, looking, callback) {
  var update = {
    'looking_for_collaborators': looking
  };

  var validationSchema = Joi.object().keys({
    'looking_for_collaborators': Joi.boolean().required()
  });
  var validationResult = Joi.validate(update, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  ctx.user.update(update).complete(function(err, user) {
    if (err) {
      log.error({'err': err}, 'Failed to update looking-for-collaborators status');
      return callback({'code': 500, 'msg': err.message});
    }

    return callback(null, user);
  });
};

/**
 * Update one or more users
 *
 * @param  {Number}         userIds                             The id of the users to update
 * @param  {Object}         update                              The updates to persist
 * @param  {Object}         [update.canvas_course_role]         The updated role. One of {@link CollabosphereConstants.ADMIN_ROLES} or  {@link CollabosphereConstants.TEACHER_ROLES}
 * @param  {Object}         [update.canvas_enrollment_state]    The updated enrollment state. One of {@link CollabosphereConstants.ENROLLMENT_STATE}
 * @param  {Object}         [update.canvas_full_name]           The updated name
 * @param  {Object}         [update.canvas_image]               The updated image
 * @param  {Object}         [update.personal_bio]               The updated personal bio
 * @param  {Function}       callback                            Standard callback function
 * @param  {Object}         callback.err                        An error that occurred, if any
 */
var updateUsers = module.exports.updateUsers = function(userIds, update, callback) {
  // Parameter validation
  var validationSchema = Joi.object().keys({
    'userIds': Joi.array().unique().min(1).items(Joi.number()),
    'update': Joi.object().min(1).keys({
      'canvas_course_role': Joi.string().optional(),
      'canvas_course_sections': Joi.array().items(Joi.string()).optional(),
      'canvas_enrollment_state': Joi.string().optional(),
      'canvas_full_name': Joi.string().optional(),
      'canvas_image': Joi.string().optional(),
      'personal_bio': Joi.string().optional()
    })
  });

  var validationResult = Joi.validate({
    'userIds': userIds,
    'update': update
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Update the users in the DB
  var options = {
    'where': {
      'id': userIds
    }
  };
  DB.User.update(update, options).complete(function(err) {
    if (err) {
      log.error({'err': err, 'users': userIds}, 'Failed to update one or more users');
      return callback({'code': 500, 'msg': 'Failed to update one or more users'});
    }

    return callback();
  });
};
