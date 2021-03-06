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

var Collabosphere = require('col-core');
var CollabosphereUtil = require('col-core/lib/util');

var CourseAPI = require('./api');

/*!
 * Get public course-wide properties
 */
Collabosphere.apiRouter.get('/course', function(req, res) {
  CourseAPI.getCoursePublic(req.ctx, function(err, course) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.status(200).send(course);
  });
});

/*!
* Update daily notifications
*/
Collabosphere.apiRouter.post('/course/daily_notifications', function(req, res) {
  var enabled = CollabosphereUtil.getBooleanParam(req.body.enabled);
  CourseAPI.updateDailyNotifications(req.ctx, enabled, function(err) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.sendStatus(200);
  });
});

/*!
* Update weekly notifications
*/
Collabosphere.apiRouter.post('/course/weekly_notifications', function(req, res) {
  var enabled = CollabosphereUtil.getBooleanParam(req.body.enabled);
  CourseAPI.updateWeeklyNotifications(req.ctx, enabled, function(err) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.sendStatus(200);
  });
});

/*!
* Mark course as active
*/
Collabosphere.apiRouter.post('/course/activate', function(req, res) {
  CourseAPI.activateCourse(req.ctx, function(err) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.sendStatus(200);
  });
});

/*!
 * Get active courses associated with the current user's Canvas account
 */
Collabosphere.apiRouter.get('/courses', function(req, res) {
  var filters = {
    'admin': req.query.admin,
    'asset_library': req.query.assetLibrary,
    'exclude_current': req.query.excludeCurrent
  };

  CourseAPI.getUserCourses(req.ctx, filters, function(err, courses) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.status(200).send(courses);
  });
});
