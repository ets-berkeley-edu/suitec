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

var AnalyticsAPI = require('col-analytics');
var Collabosphere = require('col-core');
var CollabosphereUtil = require('col-core/lib/util');

var UsersAPI = require('./api');
var UsersUtil = require('./util');

/*!
 * The me feed
 */
Collabosphere.apiRouter.get('/users/me', function(req, res) {
  if (!req.ctx) {
    return res.status(401).send('Unauthenticated API request');
  }

  return res.status(200).send(req.ctx.user);
});

/*!
 * Get user of current course by id
 */
Collabosphere.apiRouter.get('/users/id/:id', function(req, res) {
  UsersAPI.getUser(req.params.id, function(err, user) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }
    // Certain rules of data security (e.g., hide engagement score) depend
    // on values in the requested user data (e.g., share_points is true). Thus,
    // we must scrutinize data AFTER the getUser() query above.
    UsersUtil.protectUserData(req.ctx, user, function(safeUser) {
      return res.status(200).send(safeUser);
    });
  });
});

/*!
 * Get all users in the current course
 */
Collabosphere.apiRouter.get('/users', function(req, res) {
  var options = null;
  if (CollabosphereUtil.getBooleanParam(req.query.includeLastActivity)) {
    options = {'includeLastActivity': true};
  }

  UsersAPI.getAllUsers(req.ctx, options, function(err, users) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.status(200).send(users);
  });
});

/*!
 * Get the users in the current course and their points
 */
Collabosphere.apiRouter.get('/users/leaderboard', function(req, res) {
  // Track the request unless explicitly told otherwise.
  var track = true;
  if (CollabosphereUtil.getBooleanParam(req.query.track) === false) {
    track = false;
  }

  UsersAPI.getLeaderboard(req.ctx, null, function(err, users) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    if (track !== false) {
      AnalyticsAPI.track(req.ctx.user, 'Get engagement index', {
        'total': users.length,
        'ei_points': req.ctx.user.points,
        'ei_share': req.ctx.user.share_points,
        'ei_last_activity': req.ctx.user.last_activity
      });
    }

    return res.status(200).send(users);
  });
});

/*!
 * Update the user's personal description
 */
Collabosphere.apiRouter.post('/users/me/personal_bio', function(req, res) {
  UsersAPI.updatePersonalBio(req.ctx, req.body.personalBio, function(err, user) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.status(200).send(user);
  });
});

/*!
 * Update the points share status for a user
 */
Collabosphere.apiRouter.post('/users/me/share', function(req, res) {
  var share = CollabosphereUtil.getBooleanParam(req.body.share);
  UsersAPI.updateSharePoints(req.ctx, share, function(err, user) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    // Track the engagement index share update
    AnalyticsAPI.track(req.ctx.user, 'Update engagement index share', {
      'ei_share': share
    });

    return res.status(200).send(user);
  });
});

/*!
 * Update the current user's looking-for-collaborators status
 */
Collabosphere.apiRouter.post('/users/me/looking_for_collaborators', function(req, res) {
  var looking = CollabosphereUtil.getBooleanParam(req.body.looking);
  UsersAPI.updateLookingForCollaborators(req.ctx, looking, function(err, user) {
    if (err) {
      return res.status(err.code).send(err.msg);
    }

    return res.status(200).send(user);
  });
});
