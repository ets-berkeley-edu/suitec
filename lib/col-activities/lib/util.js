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
var moment = require('moment-timezone');
var Sequelize = require('sequelize');

var ActivitiesDefaults = require('./default');
var AssetsAPI = require('col-assets');
var DailyNotifications = require('./notifications/daily');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('col-activities');
var WeeklyNotifications = require('./notifications/weekly');

/* Notifications */

/**
 * Schedule the collection of daily email notifications
 *
 * @api private
 */
var scheduleDailyNotifications = module.exports.scheduleDailyNotifications = function() {
  // When the emails should go out. For now, we're just using the server's timezone
  var hour = config.get('email.dailyHour');

  // Figure out the exact moment when to send out the emails
  var emailMoment = moment().minutes(0).seconds(0);
  var now = moment();
  if (now.hours() < hour) {
    emailMoment = emailMoment.hours(hour)
  } else {
    emailMoment = emailMoment.add(1, 'day').hours(hour);
  }

  var diff = emailMoment.diff(now);
  log.info('Scheduling daily notifications for %s (in %d ms)', emailMoment.format(), diff);
  setTimeout(DailyNotifications.collect, diff, scheduleDailyNotifications);
};

/**
 * Schedule the collection of weekly email notifications
 *
 * @api private
 */
var scheduleWeeklyNotifications = module.exports.scheduleWeeklyNotifications = function() {
  // When the emails should go out. For now, we're just using the server's timezone
  var day = config.get('email.weeklyDay');
  var hour = config.get('email.weeklyHour');

  // Figure out the exact moment when to send out the emails
  var emailMoment = moment().minutes(0).seconds(0);
  var now = moment();
  if (now.day() < day || (now.day() === day && now.hours() < hour)) {
    emailMoment = emailMoment.day(day).hours(hour);
  } else {
    emailMoment = emailMoment.add(1, 'week').day(day).hours(hour);
  }

  var diff = emailMoment.diff(now);
  log.info('Scheduling weekly notifications for %s (in %d ms)', emailMoment.format(), diff);
  setTimeout(WeeklyNotifications.collect, diff, scheduleWeeklyNotifications);
};

/**
 * Schedule the recalculation of trending scores
 *
 * @api private
 */
var scheduleRecalculateTrendingScores = module.exports.scheduleRecalculateTrendingScores = function() {
  // Recalculate trending scores for all courses
  recalculateTrendingScores(null, function() {

    // Schedule the next run
    var recalculationInterval = config.get('trendingScores.recalculationInterval');
    log.info('Will recalculate trending scores in %d minutes', recalculationInterval);
    setTimeout(scheduleRecalculateTrendingScores, recalculationInterval * 60000);
  });
};

/**
 * Recalculate the trending scores for assets in one or all courses. Loop through all persisted
 * activities in the course[s] that fall within the time interval specified in trendingScores.activityWindow
 * and calculate an accurate total for each asset. If no impactful activities are found for an asset within
 * that time interval, its trending score is set to zero.
 *
 * @param  {Course}         [course]            The course for which the user points should be recalculated. If null,
                                                recalculate for all courses.
 * @param  {Function}       callback            Standard callback function
 * @param  {Object}         callback.err        An error that occurred, if any
 */
var recalculateTrendingScores = module.exports.recalculateTrendingScores = function(course, callback) {
  // Since impact scores can't be overriden, the default activities configuration suffices. Index by type
  // for quick lookup.
  var activityConfigurationByType = _.keyBy(ActivitiesDefaults, 'type');
  // Get the activity window (in hours) specifying how far back we should query.
  var activityWindow = config.get('trendingScores.activityWindow');
  var cutoffDate = moment().subtract(activityWindow, 'hour').toDate();

  // Get all recent asset-associated activities for the course[s]
  var activityOptions = {
    'where': {
      'asset_id': {'$ne': null},
      'created_at': {'$gt': cutoffDate}
    }
  };

  if (course) {
    log.info({'course': course.id}, 'Will update trending scores for a single course');
    activityOptions.where.course_id = course.id;
  } else {
    log.info('Will update trending scores for all courses');
  }

  DB.Activity.findAll(activityOptions).complete(function(err, activities) {
    if (err) {
      log.error({'err': err, 'activityOptions': activityOptions}, 'Failed to get activities');
      return callback({'code': 500, 'msg': err.message});
    }

    // Iterate through the activities and increment scores for assets.
    var scoresPerAsset = {};
    _.each(activities, function(activity) {
      var assetId = activity.asset_id;
      scoresPerAsset[assetId] = scoresPerAsset[assetId] || 0;

      var impact = activityConfigurationByType[activity.type].impact;
      if (impact) {
        scoresPerAsset[assetId] += impact;
      }
    });

    // Get ids and trending scores for any assets that currently have a trending score (done in raw SQL to avoid
    // instantiating a bunch of model objects). Any asset ids with no recent activity should have their trending score set to 0.
    var sequelize = DB.getSequelize();
    sequelize.query('SELECT id, trending_score FROM assets WHERE trending_score > 0', {'type': sequelize.QueryTypes.SELECT}).then(function(results) {
      _.each(results, function(result) {
        var assetId = result.id.toString();
        // If we have found no recent activity for this asset, its score should be set to zero.
        scoresPerAsset[assetId] = scoresPerAsset[assetId] || 0;
        // If the trending score has not changed, no update is needed.
        if (scoresPerAsset[assetId] === result.trending_score) {
          delete scoresPerAsset[assetId];
        }
      });

      // Execute database updates for assets with changed scores.
      async.forEachOfSeries(scoresPerAsset, setTrendingScore, function(err) {
        if (err) {
          log.error({'err': err}, 'Could not update trending scores for assets');
          return callback({'code': 500, 'msg': err.message});
        }
        log.info('Recalculation of trending scores complete');

        return callback();
      });
    });
  });
};

/* Activities */

/**
 * Build a JSON representation of an activity and associated objects
 *
 * @param  {Activity}         activity          The source activity
 * @param  {User}             defaultUser       The user associated with the original query, who is added to activities with no explicit actor
 * @return {Object}                             The JSON representation of the activity
 * @api private
 */
var buildActivityJSON = module.exports.buildActivityJSON = function(activity, defaultUser) {
  var activityObj = _.pick(activity, ['id', 'type']);

  // On the front end, EventDrops will get confused if the date property is not called 'date'.
  activityObj.date = activity.created_at;

  if (activity.asset) {
    activityObj.asset = _.pick(activity.asset, ['id', 'title', 'thumbnail_url']);
  }

  if (activity.comment) {
    activityObj.comment = _.pick(activity.comment, ['id', 'body']);
  }

  if (activity.actor_id) {
    activityObj.actor_id = activity.actor_id;
  }

  var user = activity.user || activity.actor || defaultUser;
  activityObj.user = _.pick(user, ['id', 'canvas_full_name', 'canvas_image']);

  return activityObj;
};

/**
 * Adjust the impact score of an asset associated with an activity
 *
 * @param  {Object}          ctx                     Standard context containing the current user and course
 * @param  {Activity}        activity                A newly created activity
 * @param  {Object}          activityConfiguration   Configuration for the activity type
 * @param  {Boolean}         increment               True to increment score, false to decrement score
 * @param  {Function}        callback                Standard callback function
 * @param  {Object}          callback.err            An error that occurred, if any
 * @api private
 */
var adjustImpactScore = module.exports.adjustImpactScore = function(ctx, activity, activityConfiguration, increment, callback) {
  if (!activityConfiguration.impact || !activity.asset_id) {
    return callback();
  }

  AssetsAPI.getAsset(ctx, activity.asset_id, {'incrementViews': false}, function(err, asset) {
    if (err) {
      log.error({'ctx': ctx, 'assetId': asset.id}, 'Failed to retrieve an asset to adjust impact score');
      return callback({'code': 500, 'msg': err.message});
    }

    // Set increment or decrement
    var adjustment = increment ?
      asset.increment('impact_score', {'by': activityConfiguration.impact}) :
      asset.decrement('impact_score', {'by': activityConfiguration.impact});

    adjustment.complete(function(err) {
      if (err) {
        log.error({'err': err}, 'Failed to increment the points for an asset');
        return callback({'code': 500, 'msg': err.message});
      }

      return callback();
    });
  });
};

/**
 * If the passed in user is the user triggering the activity, update the timestamp
 * at which the last activity took place for that user
 *
 * @param  {User}            user                The user for whom to update the timestamp at which the last activity took place
 * @param  {User}            [actor]             The user who triggered the activity
 * @param  {Function}        callback            Standard callback function
 * @param  {Object}          callback.err        An error that occurred, if any
 */
var setUserLastActivity = module.exports.setUserLastActivity = function(user, actor, callback) {
  if (!actor) {
    user.update({'last_activity': new Date()}).complete(function(err) {
      if (err) {
        log.error({'err': err}, 'Failed to set the last activity timestamp for a user');
        return callback({'code': 500, 'msg': err.message});
      }

      return callback();
    });
  } else {
    return callback();
  }
};

/**
 * Set the points for a user
 *
 * @param  {Number}         points              The new points for the user
 * @param  {Number}         userId              The id of the user to set the points for
 * @param  {Function}       callback            Standard callback function
 * @param  {Object}         callback.err        An error that occurred, if any
 */
var setUserPoints = module.exports.setUserPoints = function(points, userId, callback) {
  DB.User.findByPk(userId).complete(function(err, user) {
    if (err) {
      log.error({'err': err, 'user': userId}, 'An error occurred when getting the user to update points for');
      return callback({'code': 500, 'msg': err.message});
    } else if (!user) {
      log.error({'user': userId}, 'Could not find the user to update points for');
      return callback({'code': 404, 'msg': 'Could not find the user to update points for'});
    }

    // Update the user's points
    user.update({'points': points}).complete(function(err) {
      if (err) {
        log.error({'err': err, 'user': userId}, 'Could not update the points for a user');
        return callback({'code': 500, 'msg': err.message});
      }

      return callback();
    });
  });
};

/**
 * Set the impact score for an asset
 *
 * @param  {Number}         score               The new impact score for the asset
 * @param  {Number}         assetId             The id of the asset to set the score for
 * @param  {Function}       callback            Standard callback function
 * @param  {Object}         callback.err        An error that occurred, if any
 */
var setImpactScore = module.exports.setImpactScore = function(score, assetId, callback) {
  DB.Asset.findOne({'where': {'id': assetId}, 'paranoid': false}).complete(function(err, asset) {
    if (err) {
      log.error({'err': err, 'asset': assetId}, 'Error retrieving asset to set impact score');
      return callback({'code': 500, 'msg': err.message});
    } else if (!asset) {
      log.error({'asset': assetId}, 'Could not find asset to set impact score');
      return callback({'code': 404, 'msg': 'Could not find asset to set impact score'});
    }

    // Update the asset's score
    asset.update({'impact_score': score}).complete(function(err) {
      if (err) {
        log.error({'err': err, 'asset': assetId}, 'Could not update the impact score for an asset');
        return callback({'code': 500, 'msg': err.message});
      }

      return callback();
    });
  });
};

/**
 * Set the trending score for an asset
 *
 * @param  {Number}         score               The new trending score for the asset
 * @param  {Number}         assetId             The id of the asset to set the score for
 * @param  {Function}       callback            Standard callback function
 * @param  {Object}         callback.err        An error that occurred, if any
 */
var setTrendingScore = function(score, assetId, callback) {
  DB.Asset.findOne({'where': {'id': assetId}, 'paranoid': false}).complete(function(err, asset) {
    if (err) {
      log.error({'err': err, 'asset': assetId}, 'Error retrieving asset to set trending score');
      return callback({'code': 500, 'msg': err.message});
    } else if (!asset) {
      log.error({'asset': assetId}, 'Could not find asset to set trending score');
      return callback({'code': 404, 'msg': 'Could not find asset to set trending score'});
    }

    // Update the asset's score
    asset.update({'trending_score': score}).complete(function(err) {
      if (err) {
        log.error({'err': err, 'asset': assetId}, 'Could not update the trending score for an asset');
        return callback({'code': 500, 'msg': err.message});
      }

      return callback();
    });
  });
};

/**
 * Get the activity type overrides for a course
 *
 * @param  {Number}           courseId                The id of the course for which the activity type overrides should be retrieved
 * @param  {Function}         callback                Standard callback function
 * @param  {Object}           callback.err            An error that occurred, if any
 * @param  {ActivityType[]}   callback.overrides      The activity type overrides for the course
 * @api private
 */
var getActivityTypeOverrides = module.exports.getActivityTypeOverrides = function(courseId, callback) {
  var options = {
    'where': {
      'course_id': courseId
    }
  };
  DB.ActivityType.findAll(options).complete(function(err, activityTypeOverrides) {
    if (err) {
      log.error({'err': err, 'course': courseId}, 'Failed to get the activity type configuration overrides');
      return callback({'code': 500, 'msg': err.message});
    }

    return callback(null, activityTypeOverrides);
  });
};
