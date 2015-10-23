#!/usr/bin/env node

/**
 * Copyright ©2015. The Regents of the University of California (Regents). All Rights Reserved.
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
var Embdr = require('embdr');
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

  if (!config.get('embdr.enabled')) {
    return log.warn('As the embdr integration has not been enabled, no reprocessing will take place');
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
        'thumbnail_url': null
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
      reprocessAssetPreview(asset, function(err) {
        if (err) {
          errored++;
          log.error({'id': asset.id, 'err': err}, 'Failed to process asset preview');
        } else {
          completed++;
        }

        log.info({'id': asset.id}, 'Processed asset preview ' + (errored + completed) + ' / ' + assets.length);

        return callback();
      });
    }, function() {
      log.info('Finished reprocessing asset previews. ' + completed + ' assets were processed. ' + errored + ' assets failed.');
    });
  });
};

/**
 * Reprocess the preview for an asset
 *
 * @param  {Asset}          asset             The asset for which to reprocess the preview
 * @param  {Function}       callback          Standard callback function
 * @param  {Object}         callback.err      An error that occurred, if any
 */
var reprocessAssetPreview = function(asset, callback) {
  var assetUrl = null;
  if (asset.type === 'file' || asset.type === 'whiteboard') {
    assetUrl = asset.download_url;
  } else if (asset.type === 'link') {
    assetUrl = asset.url;
  }

  if (!assetUrl) {
    return callback();
  }

  var embdr = new Embdr(config.get('embdr.apiKey'));
  embdr.process(assetUrl, {
    'start': function(preview) {
      AssetsAPI.updateAssetPreview(asset, {
        'embedId': preview.id,
        'embedKey': preview.embedKey,
        'embedCode': preview.embedCode
      });
    },
    'thumbnails': {
      'sizes': [CollabosphereConstants.THUMBNAIL_SIZE],
      'complete': function(thumbnails) {
        var thumbnail = thumbnails[CollabosphereConstants.THUMBNAIL_SIZE];
        if (thumbnail && thumbnail.url) {
          AssetsAPI.updateAssetPreview(asset, {'thumbnailUrl': thumbnail.url});
        }
      }
    },
    'images': {
      'sizes': [CollabosphereConstants.IMAGE_SIZE],
      'complete': function(images) {
        var image = images[CollabosphereConstants.IMAGE_SIZE];
        if (image && image.url) {
          AssetsAPI.updateAssetPreview(asset, {'imageUrl': image.url});
        }
      }
    },
    'complete': function() {
      return callback();
    },
    'error': callback
  });
};

init();
