#!/usr/bin/env node

/**
 * Copyright ©2016. The Regents of the University of California (Regents). All Rights Reserved.
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
var argv = require('yargs')
    .usage('Usage: $0 [--all]')
    .alias('a', 'all')
    .describe('a', 'Reprocess all assets')
    .help('h')
    .alias('h', 'help')
    .argv;

var AssetsAPI = require('col-assets');
var CollabosphereConstants = require('col-core/lib/constants');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/reprocess_previews');

/**
 * Connect to the Collabosphere database
 */
var init = function() {
  // Apply global utilities
  require('col-core/lib/globals');

  if (!config.get('previews.enabled')) {
    return log.warn('As the previews integration has not been enabled, no reprocessing will take place');
  }

  // Connect to the database
  DB.init(function(err) {
    if (err) {
      return log.error({'err': err}, 'Unable to set up a connection to the database');
    }

    log.info('Connected to the database');

    // Get the assets to reprocess
    return getAssets();
  });
};

/**
 * Get the assets that need to be reprocessed
 */
var getAssets = function() {
  var options = {};
  if (!argv.all) {
    options = {
      'where': {
        'thumbnail_url': null,
        'deleted_at': null
      }
    };
  }

  DB.Asset.findAll(options).complete(function(err, assets) {
    if (err) {
      return log.error({'err': err}, 'Failed to get the available assets');
    }

    log.info('Starting preview reprocessing for ' + assets.length + ' assets');

    // Keep track of how the reprocessing results
    var completed = 0;
    var errored = 0;

    async.eachSeries(assets, function(asset, callback) {
      AssetsAPI.generatePreviews(asset, function(err) {
        if (err) {
          errored++;
          log.error({'id': asset.id, 'err': err}, 'Failed to schedule preview processing');
        } else {
          completed++;
        }
        return callback();
      });
    }, function() {
      log.info('Finished scheduling asset previews. ' + completed + ' assets were scheduled. ' + errored + ' assets failed to be scheduled.');
      process.exit(0);
    });
  });
};

init();
