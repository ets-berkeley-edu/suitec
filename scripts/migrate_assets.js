// #!/usr/bin/env node

/**
 * Copyright ©2017. The Regents of the University of California (Regents). All Rights Reserved.
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

var argv = require('yargs')
    .usage('Usage: $0 --fromuser [fromuser] --touser [touser] --categories [categories]')
    .demand(['fromuser', 'touser'])
    .boolean('categories')
    .describe('fromuser', 'The Collabosphere id of the user to migrate assets from')
    .describe('touser', 'The Collabosphere id of the user to migrate assets to')
    .describe('categories', 'Whether to migrate categories')
    .help('h')
    .alias('h', 'help')
    .argv;

var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/migrate_assets');
var MigrateAssetsAPI = require('col-assets/lib/migrate');
var UserAPI = require('col-users');

/**
 * Connect to the Collabosphere database and kick off asset migration
 */
var init = function() {
  // Apply global utilities
  require('col-core/lib/globals');

  // Connect to the database
  DB.init(function(err) {
    if (err) {
      return log.error({'err': err}, 'Unable to set up a connection to the database');
    }

    log.info('Connected to the database');

    // Create the context for interaction with the API
    createSourceContext(argv.fromuser, function(err, fromCtx) {
      if (err) {
        return log.error({'err': err}, 'Could not create context for source user');
      }

      var opts = {
        'categories': argv.categories,
        'destinationUserId': argv.touser,
        // When running shell script, user accounts are not required to match or be admins.
        'validateUserAccounts': false
      }

      MigrateAssetsAPI.getMigrationContexts(fromCtx, opts, function(err, toCtx, adminCtx) {
        if (err) {
          return log.error({'err': err}, 'Migration failed');
        }

        MigrateAssetsAPI.migrate(fromCtx, toCtx, adminCtx, opts, function(err, results) {
          if (err) {
            return log.error({'err': err}, 'Migration failed');
          }

          log.info('Migration succeeded.');            
        });
      });
    });
  });
};

/**
 * Create a mock context for the source user
 *
 * @param  {Number}           userId              Collabosphere id for the source user
 * @param  {Function}         callback            Standard callback function
 * @param  {Context}          callback.err        Error if any
 * @param  {Context}          callback.fromCtx    Context for source user
 */
var createSourceContext = function(userId, callback) {
  UserAPI.getUser(userId, function(err, userObj) {
    if (err) {
      return callback(err);
    }

    fromCtx = {
      'user': userObj,
      'course': userObj.course
    };

    return callback(null, fromCtx);
  });
};

init();
