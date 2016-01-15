// #!/usr/bin/env node

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
var fs = require('fs');
var request = require('request');
var temp = require('temp').track();;
var argv = require('yargs')
    .usage('Usage: $0 --fromcourse [fromcourse] --fromuser [fromuser] --tocourse [tocourse] --touser [touser]')
    .demand(['fromcourse', 'fromuser', 'tocourse', 'touser'])
    .describe('fromcourse', 'The Collabosphere id of the course to migrate assets from')
    .describe('fromuser', 'The Collabosphere id of the user to migrate assets from')
    .describe('tocourse', 'The Collabosphere id of the course to migrate assets to')
    .describe('touser', 'The Collabosphere id of the user to migrate assets to')
    .help('h')
    .alias('h', 'help')
    .argv;

var AssetsAPI = require('col-assets');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/migrate_assets');
var UserAPI = require('col-users');
var UserConstants = require('col-users/lib/constants');

// Extract the information about the course and user to migrate assets from
var fromCourse = argv.fromcourse;
var fromUser = argv.fromuser;
var toCourse = argv.tocourse;
var toUser = argv.touser;

// Variable that will keep track of the context for interaction with the API
var ctx = null;
// Variable that will keep track of how many assets have successfully migrated and
// how many have failed to migrate for every asset type
var results = {};

/**
 * Connect to the Collabosphere database
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
    createContext();
  });
};

/**
 * Create a mock context to use for interaction with the API
 */
var createContext = function() {
  UserAPI.getUser(toUser, function(err, user) {
    if (err) {
      return log.error({'toUser': toUser}, 'Unable to retrieve user to migrate to');
    }

    // Create the mock context
    ctx = {
      'user': user,
      'course': user.course
    };

    // Get the assets to migrate
    return getAssets();
  });
};

/**
 * Get the assets that need to be migrated
 */
var getAssets = function() {
  var options = {
    'where': {
      'course_id': fromCourse,
    },
    'include': {
      'model': DB.User,
      'as': 'users',
      'required': true,
      'attributes': UserConstants.BASIC_USER_FIELDS,
      'where': {
        'id': fromUser
      }
    }
  };

  DB.Asset.findAll(options).complete(function(err, assets) {
    if (err) {
      return log.error({'err': err}, 'Failed to get the assets to migrate');
    }

    async.eachSeries(assets, function(asset, callback) {
      migrateAsset(asset.toJSON(), callback);
    }, function() {
      log.info({'total': assets.length, 'results': results}, 'Finished migrating assets');
    });
  });
};

/**
 * Migrate an asset
 *
 * @param  {Asset}            asset               The asset to migrate
 * @param  {Function}         callback            Standard callback function
 */
var migrateAsset = function(asset, callback) {
  var type = asset.type;

  // Callback executed when the asset has finished migrating
  var migrateCallback = function(err, newAsset) {
    results[type] = results[type] || {
      'success': 0,
      'error': 0
    };

    if (err) {
      log.error({'asset': asset, 'err': err}, 'Failed to migrate an asset');
      results[type].error++;
    } else {
      log.info({'asset': asset, 'newAsset': newAsset}, 'Successfully migrated an asset');
      results[type].success++;
    }
    return callback();
  };

  if (asset.type === 'link') {
    migrateLink(asset, migrateCallback);
  } else if (asset.type === 'file') {
    migrateFile(asset, migrateCallback);
  } else if (asset.type === 'whiteboard') {
    log.info({'asset': asset}, 'Skipping whiteboard migration');
    return callback();
  } else {
    log.error({'asset': asset}, 'Unrecognized asset type');
    return callback();
  }
};

/**
 * Migrate a link asset
 *
 * @param  {Asset}            link                The link to migrate
 * @param  {Function}         callback            Standard callback function
 */
var migrateLink = function(link, callback) {
  AssetsAPI.createLink(ctx, link.title, link.url, {
    'description': link.description || undefined,
    'source': link.source || undefined,
    'thumbnail_url': link.thumbnail_url || undefined,
    'image_url': link.image_url || undefined,
    'embed_id': link.embed_id || undefined,
    'embed_key': link.embed_key || undefined,
    'embed_code': link.embed_code || undefined
  }, callback);
};

/**
 * Migrate a file asset
 *
 * @param  {Asset}            file                The file to migrate
 * @param  {Function}         callback            Standard callback function
 */
var migrateFile = function(file, callback) {
  // Download the file to a temporary folder
  var path = temp.path();
  request(file.download_url).pipe(fs.createWriteStream(path))
    .on('error', callback)
    .on('finish', function() {

      // Create the file asset
      AssetsAPI.createFile(ctx, file.title, {
        'mimetype': file.mime,
        'file': path,
        'filename': file.title
      }, {
        'description': file.description || undefined,
        'thumbnail_url': file.thumbnail_url || undefined,
        'image_url': file.image_url || undefined,
        'embed_id': file.embed_id || undefined,
        'embed_key': file.embed_key || undefined,
        'embed_code': file.embed_code || undefined
      }, function(err, asset) {
        if (err) {
          return callback(err);
        }

        // Remove the temporary file
        temp.cleanup(function(err, stats) {
          return callback();
        });
      });
    });
};

init();
