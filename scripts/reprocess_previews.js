#!/usr/bin/env node
/**
 * Copyright 2015 UC Berkeley (UCB) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

var _ = require('lodash');
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

    var done = _.after(assets.length, function() {
      log.info('Finished reprocessing asset previews. ' + completed + ' assets were processed. ' + errored + ' assets failed.');
    });

    _.each(assets, function(asset) {
      reprocessAssetPreview(asset, function(err) {
        if (err) {
          errored++;
          log.error({'id': asset.id}, 'Failed to process asset preview');
        } else {
          completed++;
        }

        log.info({'id': asset.id}, 'Processed asset preview ' + (errored + completed) + ' / ' + assets.length);

        done();
      });
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
