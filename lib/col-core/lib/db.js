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
var config = require('config');
var fs = require('fs');
var path = require('path');
var Sequelize = require('sequelize');

var ActivitiesDefaults = require('col-activities/lib/default');
var CollabosphereConstants = require('./constants');
var log = require('./logger')('col-core/db');
var Storage = require('./storage');
var UserConstants = require('col-users/lib/constants');

// A sequelize instance that will be connected to the database
var sequelize = null;

/**
 * Initialize the database and the SuiteC models
 *
 * @param  {Function}       callback            Standard callback function
 * @param  {Object}         callback.err        An error object, if any
 */
var init = module.exports.init = function(callback) {
  var Op = Sequelize.Op;
  // TODO: Do away with 'operatorsAliases' per https://github.com/sequelize/sequelize/blob/master/docs/upgrade-to-v5.md
  var sequelizeConfig = {
    'host': config.get('db.host'),
    'port': config.get('db.port'),
    'dialect': 'postgres',
    'databaseVersion': config.get('db.version'),
    'logging': function(msg) {
      log.trace(msg);
    },
    'operatorsAliases': {
      $eq: Op.eq,
      $ne: Op.ne,
      $gte: Op.gte,
      $gt: Op.gt,
      $lte: Op.lte,
      $lt: Op.lt,
      $not: Op.not,
      $in: Op.in,
      $notIn: Op.notIn,
      $is: Op.is,
      $like: Op.like,
      $notLike: Op.notLike,
      $iLike: Op.iLike,
      $notILike: Op.notILike,
      $regexp: Op.regexp,
      $notRegexp: Op.notRegexp,
      $iRegexp: Op.iRegexp,
      $notIRegexp: Op.notIRegexp,
      $between: Op.between,
      $notBetween: Op.notBetween,
      $overlap: Op.overlap,
      $contains: Op.contains,
      $contained: Op.contained,
      $adjacent: Op.adjacent,
      $strictLeft: Op.strictLeft,
      $strictRight: Op.strictRight,
      $noExtendRight: Op.noExtendRight,
      $noExtendLeft: Op.noExtendLeft,
      $and: Op.and,
      $or: Op.or,
      $any: Op.any,
      $all: Op.all,
      $values: Op.values,
      $col: Op.col
    }
  };

  // SSL support requires the pg-native Postgres driver.
  if (config.get('db.ssl')) {
    log.debug('Will connect to the database via SSL');
    _.extend(sequelizeConfig, {
      'native': true,
      'dialectOptions': {
        'ssl': {
          'require': true
        }
      }
    });
  }

  // Set up a connection to the database
  sequelize = new Sequelize(config.get('db.database'), config.get('db.username'), config.get('db.password'), sequelizeConfig);

  sequelize.authenticate().complete(function(err) {
    if (err) {
      log.error({'err': err}, 'Unable to set up a connection to the database');
      return callback({'code': 500, 'msg': 'Unable to set up a connection to the database'});
    }

    log.debug('Connected to the database');

    // Set up the model
    setUpModel(sequelize);

    return callback();
  });
};

/**
 * Reset the database schema from config/schema.sql
 *
 * @param  {Function}       callback            Standard callback function
 * @param  {Object}         callback.err        An error object, if any
 */
var resetSchema = module.exports.resetSchema = function(callback) {
  // This method should never be called in a production environment, or any other environment that's not
  // configured for it.
  if (process.env.NODE_ENV === 'production' || config.get('db.dropOnStartup') !== true) {
    log.error('Environment settings disallow automated reset of database schema');
    return callback({'code': 500, 'msg': 'Environment settings disallow automated reset of database schema'});
  }

  fs.readFile(path.join(process.cwd(), 'config', 'schema.sql'), function(err, sql) {
    if (err) {
      log.error({'err': err}, 'Failed to load schema SQL');
      return callback({'code': 500, 'msg': 'Failed to load schema SQL'});
    }

    sql = 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' + sql;

    sequelize.query(sql).complete(function(err) {
      if (err) {
        console.log(err);
        log.error({'err': err}, 'Failed to reset database schema');
        return callback({'code': 500, 'msg': 'Failed to reset database schema'});
      }

      log.debug('Reset database schema');

      return callback();
    });
  });
};

/**
 * Get the `Sequelize` object
 *
 * @return {Sequelize}                                A sequelize instance that is connected to the database
 */
var getSequelize = module.exports.getSequelize = function() {
  return sequelize;
};

/**
 * Set up the DB model
 *
 * @param  {Sequelize}        sequelize               A sequelize instance that is connected to the database
 * @api private
 */
var setUpModel = function(sequelize) {

  /**
   * The `canvas` table keeps track of the Canvas instances that SuiteC should
   * communicate with. It holds all the information that's needed to interact with the
   * Canvas API and to embed the SuiteC tools into Canvas
   *
   * @property  {String}      canvas_api_domain           The domain on which Canvas is running
   * @property  {String}      api_key                     The key that can be used to interact with the Canvas API
   * @property  {String}      lti_key                     The basic LTI key that will be used to embed the tools into Canvas
   * @property  {String}      lti_secret                  The basic LTI secret that will be used to embed the tools into Canvas
   * @property  {Boolean}     use_https                   Whether the Canvas API is running on https
   * @property  {String}      name                        The name of the service that is running on Canvas (e.g., bCourses)
   * @property  {String}      logo                        A URL to the logo of the service that is running on Canvas (e.g., a URL to the bCourses logo)
   * @property  {Boolean}     supports_custom_messaging   Whether the Canvas instance supports our customized cross-window messaging
   */
  var Canvas = module.exports.Canvas = sequelize.define('canvas', {
    'canvas_api_domain': {
      'type': Sequelize.STRING,
      'allowNull': false,
      'primaryKey': true
    },
    'api_key': {
      'type': Sequelize.STRING,
      'allowNull': false
    },
    'lti_key': {
      'type': Sequelize.STRING,
      'allowNull': false,
      'unique': true
    },
    'lti_secret': {
      'type': Sequelize.STRING,
      'allowNull': false,
      'unique': true
    },
    'use_https': {
      'type': Sequelize.BOOLEAN,
      'defaultValue': true
    },
    'name': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'logo': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'supports_custom_messaging': {
      'type': Sequelize.BOOLEAN,
      'defaultValue': false
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'tableName': 'canvas',
    'timestamps': false,
    'underscored': true
  });

  Canvas.prototype.toJSON = function() {
    var canvas = _.clone(this.dataValues);
    // Delete the sensitive values
    delete canvas.api_key;
    delete canvas.lti_key;
    delete canvas.lti_secret;
    return canvas;
  };

  /**
   * The `course` table keeps track of each course in which one of the tools has been embedded
   *
   * @property  {Number}      canvas_course_id              The id of the course in Canvas
   * @property  {Boolean}     enable_upload                 Whether students are allowed to upload to the Asset Library directly
   * @property  {String}      name                          The name of the course
   * @property  {String}      assetlibrary_url              The URL where the asset library in this course can be reached
   * @property  {String}      dashboard_url                 The URL where the dashboard in this course can be reached
   * @property  {String}      engagementindex_url           The URL where the engagement index in this course can be reached
   * @property  {String}      whiteboards_url               The URL where the whiteboards in this course can be reached
   * @property  {Boolean}     active                        Whether this course's data should be synced with Canvas
   * @property  {Boolean}     enable_daily_notifications    Whether daily email notifications should be sent for this course
   * @property  {Boolean}     enable_weekly_notifications   Whether weekly email notifications should be sent for this course
   */
  var Course = module.exports.Course = sequelize.define('course', {
    'canvas_course_id': {
      'type': Sequelize.INTEGER,
      'allowNull': false
    },
    'enable_upload': {
      'type': Sequelize.BOOLEAN,
      'allowNull': false,
      'defaultValue': true
    },
    'name': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'assetlibrary_url': {
      'type': Sequelize.STRING,
      'allowNull': true,
      'set': function(url) {
        this.setDataValue('assetlibrary_url', url && url.split('?')[0]);
      }
    },
    'dashboard_url': {
      'type': Sequelize.STRING,
      'allowNull': true,
      'set': function(url) {
        this.setDataValue('dashboard_url', url && url.split('?')[0]);
      }
    },
    'engagementindex_url': {
      'type': Sequelize.STRING,
      'allowNull': true,
      'set': function(url) {
        this.setDataValue('engagementindex_url', url && url.split('?')[0]);
      }
    },
    'whiteboards_url': {
      'type': Sequelize.STRING,
      'allowNull': true,
      'set': function(url) {
        this.setDataValue('whiteboards_url', url && url.split('?')[0]);
      }
    },
    'active': {
      'type': Sequelize.BOOLEAN,
      'allowNull': false,
      'defaultValue': true
    },
    'enable_daily_notifications': {
      'type': Sequelize.BOOLEAN,
      'allowNull': false,
      'defaultValue': true
    },
    'enable_weekly_notifications': {
      'type': Sequelize.BOOLEAN,
      'allowNull': false,
      'defaultValue': true
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true
  });

  // Each course belongs to a specific Canvas instance
  Course.belongsTo(Canvas, {
    'onDelete': 'CASCADE',
    'as': 'canvas',
    'foreignKey': {
      'name': 'canvas_api_domain',
      'allowNull': false
    }
  });

  /**
   * The `user` table keeps track of each user that is enrolled in a course. This means that
   * the same physical student might end up with two student records within SuiteC. As
   * there's no overlap between courses, this is acceptable.
   *
   * @property  {Number}      canvas_user_id              The id of the user in Canvas
   * @property  {String}      canvas_course_role          The role of the user in the course
   * @property  {String}      [canvas_course_sections]    Array of section names per course, user enrollments
   * @property  {String}      canvas_full_name            The full name of the student
   * @property  {String}      [canvas_image]              The URL that points to a profile picture for the user
   * @property  {String}      [canvas_email]              The email of the student
   * @property  {String}      [personal_bio]              User's personal description
   * @property  {Number}      points                      The total Engagement Index points that the user has accumulated in the course
   * @property  {Boolean}     share_points                Whether the user wants to share their point total with the other students in the course
   * @property  {String}      bookmarklet_token           The bookmarklet access token for the user
   * @property  {Boolean}     looking_for_collaborators   Whether the user should display a 'looking for collaborators' notification
   */
  var User = module.exports.User = sequelize.define('user', {
    'canvas_user_id': {
      'type': Sequelize.INTEGER,
      'allowNull': false
    },
    'canvas_course_role': {
      'type': Sequelize.STRING,
      'allowNull': false
    },
    'canvas_course_sections': {
      'type': Sequelize.ARRAY(Sequelize.STRING),
      'allowNull': true
    },
    'canvas_enrollment_state': {
      'type': Sequelize.ENUM(_.values(CollabosphereConstants.ENROLLMENT_STATE)),
      'allowNull': false
    },
    'canvas_full_name': {
      'type': Sequelize.STRING,
      'allowNull': false
    },
    'canvas_image': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'canvas_email': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'personal_bio': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'points': {
      'type': Sequelize.INTEGER,
      'allowNull': false,
      'defaultValue': 0
    },
    'share_points': {
      'type': Sequelize.BOOLEAN,
      'allowNull': true,
      'defaultValue': null
    },
    'last_activity': {
      'type': Sequelize.DATE,
      'allowNull': true
    },
    'bookmarklet_token': {
      'type': Sequelize.STRING(32),
      'allowNull': false
    },
    'looking_for_collaborators': {
      'type': Sequelize.BOOLEAN,
      'allowNull': false,
      'defaultValue': false
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true,
    'getterMethods': {
      'is_admin': function() {
        if (this.canvas_course_role) {
          var userRoles = this.canvas_course_role.split(',');
          var allAdminRoles = _.union(CollabosphereConstants.ADMIN_ROLES, CollabosphereConstants.TEACHER_ROLES);
          return (_.intersection(allAdminRoles, userRoles).length > 0);
        }
      }
    }
  });

  // Each user belongs to a specific course
  User.belongsTo(Course, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'course_id',
      'allowNull': false
    }
  });

  User.prototype.toJSON = function() {
    var user = _.clone(this.dataValues);
    user.is_admin = this.is_admin;
    delete user.asset_users;
    // Exclude sensitive data
    if (this.excludePoints) {
      delete user.points;
      delete user.share_points;
    }
    if (this.excludeSensitiveData) {
      delete user.canvas_email;
    }
    return user;
  };

  User.prototype.excludePointsFromJSON = function() {
    // Client code cannot _.omit() properties from a Sequelize object;
    // sensitive data must be programmatically excluded from JSON feed.
    this.excludePoints = true;
  };

  User.prototype.excludeSensitiveDataFromJSON = function() {
    // Client code cannot _.omit() properties from a Sequelize object;
    // sensitive data must be programmatically excluded from JSON feed.
    this.excludeSensitiveData = true;
  };

  /**
   * This table tracks user and system events within a course. In other words, user/course analytics.
   *
   * @property  {String}          uuid                            Universally unique identifier (UUID)
   * @property  {String}          event_name                      Name of event (predefined, in most cases)
   * @property  {Object}          event_metadata                  Event metadata
   * @property  {String}          canvas_domain                   The domain on which Canvas is running
   * @property  {Number}          [user_id]                       SuiteC identifier of user
   * @property  {String}          [user_full_name]                The full name of the student
   * @property  {Number}          [canvas_user_id]                The id of the user in Canvas
   * @property  {String}          [canvas_course_role]            The role of the user in the course
   * @property  {Number}          [course_id]                     SuiteC identifier of the course
   * @property  {Number}          [canvas_course_id]              The id of the course in Canvas
   * @property  {String}          [course_name]                   The name of the course
   * @property  {Number}          [activity_id]                   Activity identifier
   * @property  {Number}          [asset_id]                      Asset identifier
   * @property  {Number}          [comment_id]                    Comment identifier
   * @property  {Number}          [whiteboard_id]                 Whiteboard identifier
   * @property  {Number}          [whiteboard_element_uid]        Whiteboard element identifier
   */
  var Event = module.exports.Event = sequelize.define('events', {
    'uuid': {
      'type': Sequelize.UUID,
      'allowNull': false
    },
    'event_name': {
      'type': Sequelize.STRING,
      'allowNull': false
    },
    'event_metadata': {
      'type': Sequelize.JSON,
      'allowNull': false
    },
    'canvas_domain': {
      'type': Sequelize.STRING,
      'allowNull': false
    },
    'user_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'user_full_name': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'canvas_user_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'canvas_course_role': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'course_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'canvas_course_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'course_name': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'activity_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'asset_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'comment_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'whiteboard_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'whiteboard_element_uid': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true
  });

  /**
   * The `asset` table will keep track of each asset that needs to be displayed in the asset library
   *
   * @property {String}       type                    The type of asset
   * @property {String}       title                   The title of the asset
   * @property {Number}       [canvas_assignment_id]  The id of the assignment if the asset was submitted as part of an assignment in canvas
   * @property {String}       [description]           The description of the asset
   * @property {String}       [thumbnail_url]         The thumbnail url of the asset
   * @property {String}       [image_url]             The large url of the asset
   * @property {String}       [pdf_url]               The PDF url of the asset
   * @property {Object}       [preview_metadata]      The preview metadata
   * @property {String}       [url]                   The url of the asset
   * @property {String}       [download_url]          The url used by users to download asset (file)
   * @property {String}       [source]                The source of the asset
   * @property {String}       [body]                  The body of the asset
   * @property {Number}       likes                   The number of likes on the asset
   * @property {Number}       dislikes                The number of of dislikes on the asset
   * @property {Number}       views                   The number of times the asset has been viewed
   * @property {Number}       comment_count           The number of comments on the asset
   * @property {Boolean}      visible                 Whether the asset will be visible in the assets library list
   */
  var Asset = module.exports.Asset = sequelize.define('asset', {
    'type': {
      'type': Sequelize.ENUM(CollabosphereConstants.ASSET.ASSET_TYPES),
      'allowNull': false
    },
    'url': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'download_url': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'title': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'canvas_assignment_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'description': {
      'type': Sequelize.TEXT,
      'allowNull': true
    },
    'preview_status': {
      'type': Sequelize.STRING,
      'allowNull': false,
      'defaultValue': 'pending'
    },
    'thumbnail_url': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'image_url': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'pdf_url': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'preview_metadata': {
      'type': Sequelize.JSON,
      'allowNull': false,
      'defaultValue': '{}'
    },
    'mime': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'source': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'body': {
      'type': Sequelize.TEXT,
      'allowNull': true
    },
    'likes': {
      'type': Sequelize.INTEGER,
      'defaultValue': 0
    },
    'dislikes': {
      'type': Sequelize.INTEGER,
      'defaultValue': 0
    },
    'views': {
      'type': Sequelize.INTEGER,
      'defaultValue': 0
    },
    'comment_count': {
      'type': Sequelize.INTEGER,
      'defaultValue': 0
    },
    'impact_percentile': {
      'type': Sequelize.INTEGER,
      'allowNull': false,
      'defaultValue': 0
    },
    'impact_score': {
      'type': Sequelize.INTEGER,
      'allowNull': false,
      'defaultValue': 0
    },
    'trending_percentile': {
      'type': Sequelize.INTEGER,
      'allowNull': false,
      'defaultValue': 0
    },
    'trending_score': {
      'type': Sequelize.INTEGER,
      'allowNull': false,
      'defaultValue': 0
    },
    'badged': {
      'type': Sequelize.VIRTUAL,
      'allowNull': true
    },
    'visible': {
      'type': Sequelize.BOOLEAN,
      'defaultValue': true,
      'allowNull': false
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'deleted_at': {
      'type': Sequelize.DATE,
      'allowNull': true
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': true,
    'paranoid': true,
    'underscored': true
  });

  // Each asset belongs to a specific course
  Asset.belongsTo(Course, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'course_id',
      'allowNull': false
    }
  });

  // An asset can belong to multiple users
  // e.g., exported whiteboards have multiple collaborators
  Asset.belongsToMany(User, {'as': 'users', 'through': 'asset_users'});
  User.belongsToMany(Asset, {'as': 'assets', 'through': 'asset_users'});

  Asset.prototype.toJSON = function() {
    var asset = _.clone(this.dataValues);

    // Add the liked status
    asset.liked = null;
    // The associated activity type is either stored directly on
    // the asset object or is available as a proper activity object
    // on the asset
    var activity = !_.isEmpty(asset.activities) ? asset.activities[0].type : asset.activity_type;
    if (activity) {
      asset.liked = activity === 'like' ? true : false;
    }
    delete asset.activities;

    // Update signed URLs on preview-service-created images if necessary.
    if (Storage.isS3PreviewUrl(asset.image_url)) {
      asset.image_url = Storage.getSignedS3Url(asset.image_url);
    }
    if (Storage.isS3PreviewUrl(asset.thumbnail_url)) {
      asset.thumbnail_url = Storage.getSignedS3Url(asset.thumbnail_url);
    }

    // Order the asset's categories by title
    if (!_.isEmpty(asset.categories)) {
      asset.categories = _.sortBy(asset.categories, 'title');
    }

    // Filter out unwanted user properties
    var userFields = _.concat(UserConstants.BASIC_USER_FIELDS, 'is_admin');
    asset.users = _.map(asset.users, function(user) {
      return _.pick(user.toJSON(), userFields);
    });

    delete asset.asset_users;

    // 'Impact' and 'trending' values are used for internal calculations and not surfaced through the JSON API.
    delete asset.impact_percentile;
    delete asset.impact_score;
    delete asset.trending_percentile;
    delete asset.trending_score;

    return asset;
  };

  /**
   * The `asset_whiteboard_elements` table will keep track of the whiteboard elements for each exported asset whiteboard in the asset library
   *
   * @property  {Number}      uid                     The unique whiteboard element id
   * @property  {Object}      element                 The serialized whiteboard element
   */
  var AssetWhiteboardElement = module.exports.AssetWhiteboardElement = sequelize.define('asset_whiteboard_elements', {
    'uid': {
      'type': Sequelize.TEXT,
      'primaryKey': true,
      'allowNull': false
    },
    'element': {
      'type': Sequelize.JSON,
      'allowNull': false
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true
  });

  // Each asset whiteboard element belongs to a specific asset
  AssetWhiteboardElement.belongsTo(Asset, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'asset_id',
      'primaryKey': true,
      'allowNull': false
    },
    'as': 'whiteboard_asset'
  });

  // If an asset whiteboard element was itself added from the asset library, it may reference the original asset
  AssetWhiteboardElement.belongsTo(Asset, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'element_asset_id',
      'allowNull': true
    },
    'as': 'element_asset'
  });

  // An asset whiteboard can have multiple asset whiteboard elements. Note that this differs from the WhiteboardElement
  // relation, which tracks asset usage in whiteboards that have not themselves been exported as assets
  Asset.hasMany(AssetWhiteboardElement, {
    'as': 'whiteboard_elements',
    'foreignKey': 'asset_id'
  });

  // An asset may be associated with exported whiteboard assets in which it is included
  Asset.belongsToMany(Asset, {
    'as': 'exported_whiteboards',
    'through': 'asset_whiteboard_elements',
    'foreignKey': 'element_asset_id',
    'otherKey': 'asset_id'
  });

  /**
   * The `comment` table keeps track of comments that were made on assets
   *
   * @property  {String}      body                    The body of the comment
   */
  var Comment = module.exports.Comment = sequelize.define('comment', {
    'body': {
      'type': Sequelize.TEXT,
      'allowNull': false
    },
    'asset_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'user_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true
  });

  // Each comment is made on an asset
  Comment.belongsTo(Asset, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'asset_id',
      'allowNull': false
    }
  });

  // Each comment is made by a user. We do not remove comments if a user is removed from the system
  Comment.belongsTo(User);

  // A comment can have a parent, technically this could allow for multi-level nesting
  // but we will only use this for 1-level nesting
  Comment.belongsTo(Comment, {
    'foreignKey': {
      'name': 'parent_id',
      'allowNull': true
    },
    'as': 'parent'
  });

  // An asset can have multiple comments
  Asset.hasMany(Comment);

  /**
   * The `category` table keeps track of which categories assets can be tagged with
   *
   * @property {String}       title                       The name of the category
   * @property {Boolean}      visible                     Whether assets associated with this category will be visible in the asset library
   * @property {Number}       [canvas_assignment_id]      The id of the assignment to which this category is linked
   * @property {String}       [canvas_assignment_name]    The name of the assignment to which this category is linked
   */
  var Category = module.exports.Category = sequelize.define('category', {
    'title': {
      'type': Sequelize.STRING,
      'allowNull': false
    },
    'visible': {
      'type': Sequelize.BOOLEAN,
      'defaultValue': true,
      'allowNull': false
    },
    'canvas_assignment_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'canvas_assignment_name': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'course_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'deleted_at': {
      'type': Sequelize.DATE,
      'allowNull': true
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': true,
    'paranoid': true,
    'underscored': true
  });

  // A course can have multiple categories
  Course.hasMany(Category, {foreignKey: 'course_id'});

  // An asset can have multiple categories
  Category.belongsToMany(Asset, {'through': 'assets_categories', 'onDelete': 'CASCADE'});
  Asset.belongsToMany(Category, {'through': 'assets_categories', 'onDelete': 'CASCADE'});

  var Pin = module.exports.Pin = sequelize.define('pinned_user_assets', {
    'asset_id': {
      'primaryKey': true,
      'type': Sequelize.INTEGER,
      'allowNull': false
    },
    'user_id': {
      'primaryKey': true,
      'type': Sequelize.INTEGER,
      'allowNull': false
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true
  });

  Asset.hasMany(Pin, {'as': 'pins', 'foreignKey': 'asset_id', 'onDelete': 'CASCADE'});

  User.hasMany(Pin, {'as': 'pinned_assets', 'foreignKey': 'user_id', 'onDelete': 'CASCADE'});

  /**
   * The `whiteboards` table will keep track of the available whiteboards in the Whiteboard tool
   *
   * @property {String}       title                   The title of the whiteboard
   * @property {String}       [thumbnail_url]         The thumbnail url of the whiteboard
   * @property {String}       [image_url]             The large url of the whiteboard
   */
  var Whiteboard = module.exports.Whiteboard = sequelize.define('whiteboard', {
    'title': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'thumbnail_url': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'image_url': {
      'type': Sequelize.STRING,
      'allowNull': true
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'deleted_at': {
      'type': Sequelize.DATE,
      'allowNull': true
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': true,
    'paranoid': true,
    'underscored': true
  });

  // Each whiteboard belongs to a specific course
  Whiteboard.belongsTo(Course, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'course_id',
      'allowNull': false
    }
  });

  // A whiteboard can have multiple members
  User.belongsToMany(Whiteboard, {'through': 'whiteboard_members', 'onDelete': 'CASCADE'});
  Whiteboard.belongsToMany(User, {'through': 'whiteboard_members', 'onDelete': 'CASCADE'});

  Whiteboard.prototype.toJSON = function() {
    var whiteboard = _.clone(this.dataValues);
    // Update signed URLs on preview-service-created images if necessary.
    if (Storage.isS3PreviewUrl(whiteboard.image_url)) {
      whiteboard.image_url = Storage.getSignedS3Url(whiteboard.image_url);
    }
    if (Storage.isS3PreviewUrl(whiteboard.thumbnail_url)) {
      whiteboard.thumbnail_url = Storage.getSignedS3Url(whiteboard.thumbnail_url);
    }
    return whiteboard;
  };

  /**
   * The `whiteboard_elements` table will keep track of the whiteboard elements for each whiteboard in the Whiteboard tool
   *
   * @property  {Number}      uid                     The unique whiteboard element id
   * @property  {Object}      element                 The serialized whiteboard element
   */
  var WhiteboardElement = module.exports.WhiteboardElement = sequelize.define('whiteboard_elements', {
    'uid': {
      'type': Sequelize.INTEGER,
      'primaryKey': true,
      'allowNull': false
    },
    'element': {
      'type': Sequelize.JSON,
      'allowNull': false
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true
  });

  // Each whiteboard element belongs to a specific whiteboard
  WhiteboardElement.belongsTo(Whiteboard, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'whiteboard_id',
      'primaryKey': true,
      'allowNull': false
    }
  });

  // A whiteboard element can reference an asset
  WhiteboardElement.belongsTo(Asset, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'asset_id',
      'allowNull': true
    }
  });

  // A whiteboard can have multiple whiteboard elements
  Whiteboard.hasMany(WhiteboardElement, {'as': 'WhiteboardElements'});

  // An asset can be used as an element in multiple whiteboards. Note that this relation differs from the
  // AssetWhiteboardElement relation, which describes elements in whiteboards that have been exported as assets
  Asset.hasMany(WhiteboardElement, {'as': 'whiteboard_usages'});

  /**
   * The `whiteboard_sessions` table will keep track of the online users for each whiteboard in the Whiteboard tool.
   * Note that a user can have multiple whiteboard sessions for the same whiteboard when the user has the whiteboard
   * open in multiple browser windows. In this case, the socket id will be different for each browser window
   *
   * @property  {String}      socket_id               The unique socket id over which the user is connected
   */
  var WhiteboardSession = module.exports.WhiteboardSession = sequelize.define('whiteboard_sessions', {
    'socket_id': {
      'type': Sequelize.STRING,
      'allowNull': false,
      'primaryKey': true
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true
  });

  // Each whiteboard session belongs to a specific whiteboard
  WhiteboardSession.belongsTo(Whiteboard, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'whiteboard_id',
      'allowNull': false
    }
  });
  Whiteboard.hasMany(WhiteboardSession);

  // Each whiteboard session belongs to a specific user
  WhiteboardSession.belongsTo(User, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'user_id',
      'allowNull': false
    }
  });

  /**
   * The `chat` table keeps track of chat messages that were made on whiteboards
   *
   * @property  {String}      body                    The body of the chat message
   */
  var Chat = module.exports.Chat = sequelize.define('chat', {
    'body': {
      'type': Sequelize.TEXT,
      'allowNull': false
    },
    'user_id': {
      'type': Sequelize.INTEGER,
      'allowNull': false
    },
    'whiteboard_id': {
      'type': Sequelize.INTEGER,
      'allowNull': false
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true
  });

  // Each comment is made on a whiteboard
  Chat.belongsTo(Whiteboard, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'whiteboard_id',
      'allowNull': false
    }
  });

  // Each chat message is made by a user
  Chat.belongsTo(User);

  // A whiteboard can have multiple chat messages
  Whiteboard.hasMany(Chat);

  /**
   * The `activity` table will keep track of actions that users make in the system. This can
   * include things such as:
   *  - liking or disliking assets
   *  - commenting on assets
   *  - submitting an assignment
   *  - posting to a Canvas discussion
   *  - creating a whiteboard
   *  - ...
   *
   * As an activity can be related to different things, it's hard to enforce referential integrity without
   * adding lots of unused foreign keys to the table. That's why a more general approach has been taken:
   *  - `object_id` will be an identifier (e.g., canvas assignment id)
   *  - `object_type` will hold information about the type the id points to (e.g., a canvas assignment)
   *
   * Additional data (e.g., attachment ids for a canvas assignment) can be stored in the  `metadata`
   * property.
   *
   * @property  {String}      type                    The type of the activity
   * @property  {Number}      object_id               The id of the object on which the activity is taking place (e.g., the asset id, the comment id, etc.)
   * @property  {String}      object_type             The type of the object on which the activity is taking place. One of `CollabosphereConstants.ACTIVITY.OBJECT_TYPES`
   * @property  {Object}      metadata                Additional metadata that is associated with the activity
   */
  var Activity = module.exports.Activity = sequelize.define('activity', {
    'type': {
      'type': Sequelize.ENUM(_.map(ActivitiesDefaults, 'type')),
      'allowNull': false
    },
    'object_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'object_type': {
      'type': Sequelize.ENUM(_.values(CollabosphereConstants.ACTIVITY.OBJECT_TYPES)),
      'allowNull': false
    },
    'metadata': {
      'type': Sequelize.JSON,
      'allowNull': true
    },
    'asset_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'course_id': {
      'type': Sequelize.INTEGER,
      'allowNull': false
    },
    'user_id': {
      'type': Sequelize.INTEGER,
      'allowNull': false
    },
    'actor_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'reciprocal_id': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true
  });

  // An activity can be associated to an asset
  Activity.belongsTo(Asset, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'asset_id',
      'allowNull': true
    }
  });
  Asset.hasMany(Activity);

  // An activity can be associated to an comment through 'object_id'. We disable Postgres constraints because
  // 'object_id' may point to things other than comments. When using this association in queries, specify a
  // join on 'object_id' only when 'object_type' = 'comment'. In Sequelize idiom:
  // 'on': {
  //   '$activities.object_type$': 'comment',
  //   '$activities.comment.id$': {$col: 'activities.object_id'}
  // }
  Activity.belongsTo(Comment, {
    'foreignKey': {
      'name': 'object_id',
      'allowNull': true
    },
    'constraints': false
  });

  // Each activity happens within a course
  Activity.belongsTo(Course, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'course_id',
      'allowNull': false
    }
  });

  // The user earning the activity points
  Activity.belongsTo(User, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'user_id',
      'allowNull': false
    }
  });
  User.hasMany(Activity);

  // The actor is the user that triggered the activity when different than the user earning the activity
  // points. For example, when John replies to a comment from Bella, two separate records will be created as
  // both John and Bella will be earning activity points. The first one will have John as the user without
  // an actor, as John is already the user performing the activity. The second one will have Bella as the
  // user, earning points for receiving a reply, and John as the actor as the person who created the comment.
  // If a user drops out of a course then we remove him/her from SuiteC. However, the users that
  // received points through likes and comments from these users should not lose points in the Engagement
  // Index. Therefore, the actor ids will be set to null when such a user is removed.
  Activity.belongsTo(User, {'as': 'actor', 'onDelete': 'SET NULL'});

  // "Passive" activities (of form 'get_*') are associated to a reciprocal "active" activity.
  Activity.belongsTo(Activity, {
    'foreignKey': {
      'name': 'reciprocal_id',
      'allowNull': true
    },
    'as': 'reciprocal'
  });

  /**
   * The `activity_type` table will keep track of the different activities that can occur
   * and the weights that are associated with them.
   *
   * @property  {String}      type                    The activity type. One of the types in `col-activities/lib/constants.js`
   * @property  {Number}      points                  The number of points this activity type contributes towards a user's points
   * @property  {Boolean}     enabled                 Whether activities of this type should contributed towards a user's points
   */
  var ActivityType = module.exports.ActivityType = sequelize.define('activity_type', {
    'type': {
      'type': Sequelize.ENUM(_.map(ActivitiesDefaults, 'type')),
      'allowNull': false
    },
    'points': {
      'type': Sequelize.INTEGER,
      'allowNull': true
    },
    'enabled': {
      'type': Sequelize.BOOLEAN,
      'defaultValue': true,
      'allowNull': true
    },
    'course_id': {
      'type': Sequelize.INTEGER,
      'allowNull': false,
      'references': {
        'model': Course,
        'key': 'id'
      }
    },
    'created_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    },
    'updated_at': {
      'type': Sequelize.DATE,
      'defaultValue': Sequelize.NOW,
      'allowNull': false
    }
  }, {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'timestamps': false,
    'underscored': true,
    'indexes': [
      {
        'unique': true,
        'fields': ['type', 'course_id']
      }
    ]
  });

  // Each activity type belongs to a specific course
  ActivityType.belongsTo(Course, {
    'onDelete': 'CASCADE',
    'foreignKey': {
      'name': 'course_id',
      'primaryKey': true,
      'allowNull': false
    }
  });
};
