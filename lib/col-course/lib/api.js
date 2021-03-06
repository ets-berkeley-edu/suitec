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

var CollabosphereConstants = require('col-core/lib/constants');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('col-course');

/**
 * Get a course. If the course doesn't exist yet, it will be created
 *
 * @param  {Number}       canvasCourseId                    The id of the course in Canvas
 * @param  {Canvas}       canvas                            The Canvas instance the course is running on
 * @param  {Object}       courseInfo                        Additional info for the course
 * @param  {String}       [courseInfo.name]                 The name of the course
 * @param  {String}       [courseInfo.assetlibrary_url]     The URL where the asset library in this course can be reached
 * @param  {String}       [courseInfo.dashboard_url]        The URL where the dashboard in this course can be reached
 * @param  {String}       [courseInfo.engagementindex_url]  The URL where the engagement index in this course can be reached
 * @param  {String}       [courseInfo.whiteboards_url]      The URL where the whiteboards in this course can be reached
 * @param  {Function}     callback                          Standard callback function
 * @param  {Object}       callback.err                      An error object, if any
 * @param  {Course}       callback.course                   The retrieved or created course
 */
var getOrCreateCourse = module.exports.getOrCreateCourse = function(canvasCourseId, canvas, courseInfo, callback) {
  // Parameter validation
  var validationSchema = Joi.object().keys({
    'canvasCourseId': Joi.number().required(),
    'canvas': Joi.object().required(),
    'courseInfo': Joi.object().keys({
      'name': Joi.string().optional(),
      'assetlibrary_url': Joi.string().optional(),
      'dashboard_url': Joi.string().optional(),
      'engagementindex_url': Joi.string().optional(),
      'whiteboards_url': Joi.string().optional()
    }).optional()
  });

  var validationResult = Joi.validate({
    'canvasCourseId': canvasCourseId,
    'canvas': canvas,
    'courseInfo': courseInfo
  }, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Get the course from the DB or create it if it doesn't exist yet
  options = {
    'where': {
      'canvas_course_id': canvasCourseId,
      'canvas_api_domain': canvas.canvas_api_domain
    },
    'defaults': {
      'name': courseInfo.name,
      'assetlibrary_url': courseInfo.assetlibrary_url,
      'dashboard_url': courseInfo.dashboard_url,
      'engagementindex_url': courseInfo.engagementindex_url,
      'whiteboards_url': courseInfo.whiteboards_url
    }
  };
  DB.Course.findOrCreate(options).complete(function(err, data) {
    if (err) {
      log.error({'err': err}, 'Failed to get or create a course');
      return callback({'code': 500, 'msg': err.message});
    }

    var course = data[0];
    var wasCreated = data[1];

    if (wasCreated) {
      log.info({'id': course.id}, 'Created a new course');
      return callback(null, course);
    } else {
      course.update(courseInfo).complete(function(err, course) {
        if (err) {
          log.error({'err': err}, 'Failed to update a course');
          return callback({'code': 500, 'msg': err.message});
        }

        return callback(null, course);
      });
    }
  });
};

/**
 * Get a course by its id
 *
 * @param  {Number}       id                  The id of the course
 * @param  {Function}     callback            Standard callback function
 * @param  {Object}       callback.err        An error object, if any
 * @param  {Course}       callback.course     The retrieved course
 */
var getCourse = module.exports.getCourse = function(id, callback) {
  var options = {
    'include': [{
      'model': DB.Canvas,
      'as': 'canvas'
    }]
  };
  DB.Course.findByPk(id, options).complete(function(err, course) {
    if (err) {
      log.error({'err': err, 'course': id}, 'Failed to get a course');
      return callback({'code': 500, 'msg': err.message});
    } else if (!course) {
      log.error({'err': err, 'id': id}, 'Failed to retrieve the course');
      return callback({'code': 404, 'msg': 'Failed to retrieve the course'});
    }

    return callback(null, course);
  });
};

/**
 * Get public attributes (i.e. safe to expose over API) for a given course
 *
 * @param  {Context}      ctx                 Standard context containing the current user and the current course
 * @param  {Function}     callback            Standard callback function
 * @param  {Object}       callback.err        An error object, if any
 * @param  {Course}       callback.course     The retrieved course
 */
var getCoursePublic = module.exports.getCoursePublic = function(ctx, callback) {
  var options = {
    'attributes': [
      'id',
      'name',
      'canvas_course_id',
      'active',
      'whiteboards_url',
      'assetlibrary_url',
      'dashboard_url',
      'engagementindex_url',
      'enable_upload',
      'enable_daily_notifications',
      'enable_weekly_notifications'
    ]
  };
  DB.Course.findByPk(ctx.course.id, options).complete(function(err, course) {
    if (err) {
      log.error({'err': err, 'course_id': ctx.course}, 'Failed to get a course');
      return callback({'code': 500, 'msg': err.message});
    } else if (!course) {
      log.error({'err': err, 'course': ctx.course}, 'Failed to retrieve the course');
      return callback({'code': 404, 'msg': 'Failed to retrieve the course'});
    }

    return callback(null, course);
  });
};

/**
 * Update daily notifications for the current course
 *
 * @param  {Context}        ctx                         Standard context containing the current user and the current course
 * @param  {Boolean}        enabled                     Whether daily notifications should be enabled
 * @param  {Function}       callback                    Standard callback function
 * @param  {Object}         callback.err                An error that occurred, if any
 */
var updateDailyNotifications = module.exports.updateDailyNotifications = function(ctx, enabled, callback) {
  // Only course instructors are allowed to update daily notifications
  if (!ctx.user.is_admin) {
    log.error({'course': ctx.course}, 'Unauthorized to update daily notifications');
    return callback({'code': 401, 'msg': 'Unauthorized to update daily notifications'});
  }

  var update = {
    'enable_daily_notifications': enabled
  };

  // Parameter validation
  var validationSchema = Joi.object().keys({
    'enable_daily_notifications': Joi.boolean().required()
  });

  var validationResult = Joi.validate(update, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Retrieve the course from the DB
  getCourse(ctx.course.id, function(err, course) {
    if (err) {
      return callback(err);
    }

    // Update daily notifications attribute in the DB
    course.update(update).complete(function(err, course) {
      if (err) {
        log.error({'err': err, 'id': course.id}, 'Failed to update daily notifications');
        return callback({'code': 500, 'msg': err.message});
      }

      return callback();
    });
  });
};

/**
 * Update weekly notifications for the current course
 *
 * @param  {Context}        ctx                         Standard context containing the current user and the current course
 * @param  {Boolean}        enabled                     Whether weekly notifications should be enabled
 * @param  {Function}       callback                    Standard callback function
 * @param  {Object}         callback.err                An error that occurred, if any
 */
var updateWeeklyNotifications = module.exports.updateWeeklyNotifications = function(ctx, enabled, callback) {
  // Only course instructors are allowed to update weekly notifications
  if (!ctx.user.is_admin) {
    log.error({'course': ctx.course}, 'Unauthorized to update weekly notifications');
    return callback({'code': 401, 'msg': 'Unauthorized to update weekly notifications'});
  }

  var update = {
    'enable_weekly_notifications': enabled
  };

  // Parameter validation
  var validationSchema = Joi.object().keys({
    'enable_weekly_notifications': Joi.boolean().required()
  });

  var validationResult = Joi.validate(update, validationSchema);

  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  // Retrieve the course from the DB
  getCourse(ctx.course.id, function(err, course) {
    if (err) {
      return callback(err);
    }

    // Update weekly notifications attribute in the DB
    course.update(update).complete(function(err, course) {
      if (err) {
        log.error({'err': err, 'id': course.id}, 'Failed to update weekly notifications');
        return callback({'code': 500, 'msg': err.message});
      }

      return callback();
    });
  });
};

/**
 * Mark the current course as active. This method, unlike deactivateCourse, is called by the REST
 * API and takes a context argument on which an admin check is performed.
 *
 * @param  {Context}        ctx                         Standard context containing the current user and the current course
 * @param  {Function}       callback                    Standard callback function
 * @param  {Object}         callback.err                An error that occurred, if any
 */
var activateCourse = module.exports.activateCourse = function(ctx, callback) {
  // Only admins are allowed to activate a course
  if (!ctx.user.is_admin) {
    log.error({'course': ctx.course}, 'Unauthorized to activate course');
    return callback({'code': 401, 'msg': 'Unauthorized to activate course'});
  }

  // Retrieve the course from the DB
  getCourse(ctx.course.id, function(err, course) {
    if (err) {
      return callback(err);
    }

    var update = {
      'active': true
    };

    // Update active attribute in the DB
    course.update(update).complete(function(err, course) {
      if (err) {
        log.error({'err': err, 'id': course.id}, 'Failed to activate course');
        return callback({'code': 500, 'msg': err.message});
      }

      // Update user's last_activity attribute to ensure that the poller does not deactivate on its next sweep
      ctx.user.update({'last_activity': new Date()}).complete(function(err) {
        if (err) {
          log.error({'course': course, 'err': err}, 'Failed to update last activity timestamp for a user');
          return callback({'code': 500, 'msg': err.message});
        }

        return callback();
      });
    });
  });
};

/**
 * Mark a course as inactive. This method is only called by the Canvas poller, and takes a course
 * ID rather than a context argument.
 *
 * @param  {Number}         courseId                    Standard context containing the current user and the current course
 * @param  {Function}       callback                    Standard callback function
 * @param  {Object}         callback.err                An error that occurred, if any
 */
var deactivateCourse = module.exports.deactivateCourse = function(courseId, callback) {
  // Retrieve the course from the DB
  getCourse(courseId, function(err, course) {
    if (err) {
      return callback(err);
    }

    var update = {
      'active': false
    };

    // Update active attribute in the DB
    course.update(update).complete(function(err, course) {
      if (err) {
        log.error({'err': err, 'id': course.id}, 'Failed to deactivate course');
        return callback({'code': 500, 'msg': err.message});
      }

      return callback();
    });
  });
};

/**
 * Get a group of courses
 *
 * @param  {Object}     [filters]               Query filters. Defualts to all active courses.
 * @param  {String}     [order]                 Dictates resultset ordering (e.g., 'created_at DESC'); defaults to 'id ASC'
 * @param  {Function}   callback                Standard callback function
 * @param  {Object}     callback.err            An error that occurred, if any
 * @param  {Course[]}   callback.courses        The courses in the database. The associated `Canvas` object will be retrieved as well
 */
var getCourses = module.exports.getCourses = function(filters, order, callback) {
  var filters = filters || {
    'active': true
  };
  var options = {
    'where': filters,
    'include': [ {'model': DB.Canvas, 'as': 'canvas'} ]
  };
  var customOrder = order && order.split();
  if (customOrder) {
    options.order = [ customOrder ];
  } else {
    options.order = [ ['id', 'ASC'] ];
  }
  DB.Course.findAll(options).complete(callback);
};

/**
 * Get active courses associated with the current user's Canvas account
 *
 * @param  {Context}    ctx                        Standard context containing the current user and the current course
 * @param  {Object}     [filters]                  A set of options to filter the results by
 * @param  {Boolean}    [filters.admin]            Whether to only return courses in which the user is an admin
 * @param  {Boolean}    [filters.assetLibrary]     Whether to only return courses in which the asset library is enabled
 * @param  {Boolean}    [filters.excludeCurrent]   Whether to exclude the current course
 * @param  {Function}   callback                   Standard callback function
 * @param  {Object}     callback.err               An error that occurred, if any
 * @param  {Course[]}   callback.courses           The courses in the database. The associated `Canvas` object will be retrieved as well
 */
var getUserCourses = module.exports.getUserCourses = function(ctx, filters, callback) {
  // Parameter validation
  filters = filters || {};
  var validationSchema = Joi.object().keys({
    'filters': Joi.object().keys({
      'admin': Joi.boolean().optional(),
      'asset_library': Joi.boolean().optional(),
      'exclude_current': Joi.boolean().optional()
    })
  });
  var validationResult = Joi.validate({
    'filters': filters
  }, validationSchema);
  if (validationResult.error) {
    return callback({'code': 400, 'msg': validationResult.error.details[0].message});
  }

  var courseOptions = {
    'active': true,
    'canvas_api_domain': ctx.course.canvas_api_domain
  };

  // If requested, only return courses with an asset library URL
  if (filters.asset_library) {
    courseOptions.assetlibrary_url = {
      $ne: null
    };
  }

  // If requested, exclude the current course
  if (filters.exclude_current) {
    courseOptions.id = {
      $ne: ctx.course.id
    };
  }

  var userOptions = {
    'canvas_enrollment_state': 'active',
    'canvas_user_id': ctx.user.canvas_user_id
  };

  var queryOptions = {
    'where': userOptions,
    'attributes': ['canvas_course_role', 'id'],
    'include': [
      {
        'model': DB.Course,
        'required': true,
        'as': 'course',
        'where': courseOptions
      }
    ]
  };

  DB.User.findAll(queryOptions).complete(function(err, userCourses) {
    if (err) {
      return callback(err);
    }

    // If requested, only return courses where user is an admin. This needs to be done post-query because is_admin is a
    // derived attribute not present in the database.
    if (filters.admin) {
      userCourses = _.filter(userCourses, 'is_admin');
    }

    return callback(null, userCourses);
  });
};
