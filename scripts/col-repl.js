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
var repl = require('repl');

var DB = require('col-core/lib/db');

console.log('Loading SuiteC environment...');

/**
 * Load SuiteC environment and start an instance of Node's REPL (read-eval-print loop),
 * an interactive interpreter that evaluates input line by line and displays evaluation results.
 * @see https://nodejs.org/api/repl.html
 * @return {void}
 */
var init = function() {
  // Apply global utilities
  require('col-core/lib/globals');

  // Connect to the SuiteC database
  DB.init(function() {

    // Require additional modules and utilities, assigning them to properties
    // to be exported to the REPL.
    var exports = {
      // A small set of external modules frequently used in code; more could be added.
      'async': require('async'),
      'config': require('config'),
      'Joi': require('joi'),
      // Node's REPL treats _ as a special variable, returning the result of the last
      // expression, so we can't assign to it.
      'lodash': _,
      'moment': require('moment-timezone'),
      'Sequelize': require('sequelize'),

      // SuiteC modules, including:
      // - Top-level APIs;
      // - Constants and utilities frequently called across modules.
      'ActivitiesAPI': require('col-activities'),
      'ActivitiesDefaults': require('col-activities/lib/default'),
      'AnalyticsAPI': require('col-analytics'),
      'AssetsAPI': require('col-assets'),
      'CanvasAPI': require('col-canvas'),
      'CategoriesAPI': require('col-categories'),
      'Collabosphere': require('col-core'),
      'CollabosphereConstants': require('col-core/lib/constants'),
      'CollabosphereUtil': require('col-core/lib/util'),
      'CourseAPI': require('col-course'),
      'DailyNotifications': require('col-activities/lib/notifications/daily'),
      'DB': DB,
      'EmailUtil': require('col-core/lib/email'),
      'log': require('col-core/lib/logger')('col-repl'),
      'LtiAPI': require('col-lti'),
      'LtiConstants': require('col-lti/lib/constants'),
      'RestAPI': require('col-rest'),
      'UserConstants': require('col-users/lib/constants'),
      'UsersAPI': require('col-users')
      // WhiteboardAPI is not included as it expects a running Express server on load.
    };

    console.log('SuiteC environment loaded. Enjoy!');

    // Start the REPL and make exports available.
    var replInstance = repl.start({'prompt': 'col-repl> '});
    _.extend(replInstance.context, exports);
  });
};

init();
