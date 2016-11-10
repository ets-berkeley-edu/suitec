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

var CollabosphereConstants = require('col-core/lib/constants');
var DB = require('col-core/lib/db');
var log = require('col-core/lib/logger')('scripts/20161011-col509/update_whiteboard_asset_previews');

var init = function() {
  // Apply global utilities
  require('col-core/lib/globals');

  // Connect to the database
  DB.init(function(err) {
    if (err) {
      return log.error({'err': err}, 'Unable to set up a connection to the database');
    }

    log.info('Connected to the database');

    getWhiteboardsWithElements().complete(function(err, whiteboards) {
      if (err) {
        return log.error({'err': err}, 'Failed to get whiteboards');
      }
      updateWhiteboards(whiteboards);
    });
  });
};

/**
 * Get all whiteboards with associated elements from the database.
 *
 * @param  {Function}   callback       Standard callback function
 */
var getWhiteboardsWithElements = function(callback) {
  var options = {
    'include': [
      {'model': DB.WhiteboardElement, 'as': 'WhiteboardElements'}
    ]
  };
  return DB.Whiteboard.findAll(options);
};

/**
 * Update previews for assets included in all whiteboards.
 *
 * @param  {Whiteboard[]}   whiteboards       The whiteboards to update
 */
var updateWhiteboards = function(whiteboards) {
  log.info('Starting asset preview update for ' + whiteboards.length + ' whiteboards');

  // Keep track of results
  var updated = 0;
  var notUpdated = 0;
  var errored = 0;

  async.eachSeries(whiteboards, function(whiteboard, callback) {
    updateAssetPreviewsForWhiteboard(whiteboard, function(err, assetPreviewsUpdated) {
      if (err) {
        errored++;
      } else if (assetPreviewsUpdated) {
        updated++;
      } else {
        notUpdated++;
      }

      log.info({'id': whiteboard.id}, 'Migrated ' + (updated + notUpdated + errored) + ' / ' + whiteboards.length);

      return callback();
    });
  }, function() {
      log.info('Finished updating. ' + updated + ' whiteboards updated, ' + notUpdated + ' whiteboards required no update, ' + errored + ' errors.');
  });
};

/**
 * Update previews for assets included in whiteboards. Similar to
 * WhiteboardsAPI.checkWhiteboardExportability, but with no dependency on a running server.
 *
 * @param  {Whiteboard}   whiteboard       The whiteboard to update
 * @param  {Function}     callback         Standard callback function
 */
var updateAssetPreviewsForWhiteboard = function(whiteboard, callback) {
  var assetIds = _.chain(whiteboard.WhiteboardElements)
                  .map('asset_id')
                  .compact()
                  .uniq()
                  .value();
  if (_.isEmpty(assetIds)) {
    // No need to go on if no assets are included.
    return callback();
  }

  // Keep track of errors.
  errors = {};

  // Keep track of whether asset preview updates are required.
  var assetPreviewsUpdated = false;

  var assetOpts = {
    // Include deleted assets, since whiteboards may still refer to them.
    'paranoid': false,
    'where': {'id': assetIds}
  };

  DB.Asset.findAll(assetOpts).complete(function(err, assets) {
    async.eachSeries(whiteboard.WhiteboardElements, function(whiteboardElement, done) {
      var assetId = whiteboardElement.asset_id;
      if (!assetId) {
        // Nothing to do if this element is not sourced from an asset.
        return done();
      } else {
        var matchingAsset = _.find(assets, {'id': assetId});

        if (!matchingAsset) {
          errors[assetId] = 'Asset not found';
          return done();
        }

        var imageUrl = _.get(matchingAsset, 'image_url');
        var previewStatus = _.get(matchingAsset, 'preview_status');
        var width = _.get(matchingAsset, 'preview_metadata.image_width');

        // If we don't have complete preview data, mark the asset as lacking a preview.
        if (previewStatus !== 'done' || !imageUrl || !width) {
          errors[assetId] = {
            'previewStatus': previewStatus,
            'imageUrl': imageUrl,
            'width': width
          };
          return done();
        } else if (imageUrl !== whiteboardElement.element.src) {
          // If the whiteboard element has not been updated to reflect the preview, update it now.
          updateAssetPreviewForWhiteboardElement(whiteboardElement, imageUrl, width, function(err) {
            if (err) {
              errors[assetId] = err;
            } else {
              assetPreviewsUpdated = true;
            }
            return done();
          });
        } else {
          return done();
        }
      }
    }, function(err) {
      if (err) {
        return callback(err);
      } else if (!_.isEmpty(errors)) {
        var msg = 'Errors for assets: ' + JSON.stringify(errors);
        log.error(msg);
        return callback({'code': 500, 'msg': msg});
      } else {
        // No missing preview data; we are good to continue.
        return callback(null, assetPreviewsUpdated);
      }
    });
  });
};

/**
 * Update the asset preview information for an individual whiteboard element. Similar to
 * WhiteboardsAPI.updateAssetPreviewForElement, but with no dependency on a running server.
 *
 * @param  {WhiteboardElement}  whiteboardElement     The whiteboard element to update
 * @param  {String}             imageUrl              The URL where the generated image can be downloaded
 * @param  {Number}             width                 The width of the generated image
 * @param  {Function}           callback              Standard callback function
 */
var updateAssetPreviewForWhiteboardElement = function(whiteboardElement, imageUrl, width, callback) {
  // Calculate the scale factor to retain the image dimensions
  var ratio = whiteboardElement.element.width * whiteboardElement.element.scaleX / width;
  whiteboardElement.element.scaleX = ratio;
  whiteboardElement.element.scaleY = ratio;
  whiteboardElement.element.src = imageUrl;

  var dbElement = {
    'whiteboard_id': whiteboardElement.whiteboard_id,
    'uid': whiteboardElement.element.uid,
    'element': whiteboardElement.element,
    'asset_id': whiteboardElement.element.assetId
  };

  DB.WhiteboardElement.upsert(dbElement).complete(function(err) {
    if (err) {
      log.error({'type': err}, 'Failed to update a whiteboard element');
    }
    return callback(err);
  });
};

init();
