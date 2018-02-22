#!/usr/bin/env node

/**
 * Copyright ©2018. The Regents of the University of California (Regents). All Rights Reserved.
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
var log = require('col-core/lib/logger')('scripts/20160525-col378/populate_element_asset_id');

/**
 * Connect to the SuiteC database
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

    // Get the asset whiteboard elements to migrate
    return getAssetWhiteboardElements();
  });
};

/**
 * Get the asset whiteboard elements that need to be migrated
 */
var getAssetWhiteboardElements = function() {
  DB.AssetWhiteboardElement.findAll().complete(function(err, assetWhiteboardElements) {
    if (err) {
      return log.error({'err': err}, 'Failed to get asset whiteboard elements');
    }

    log.info('Starting element_asset_id population for ' + assetWhiteboardElements.length + ' asset whiteboard elements');

    // Keep track of results
    var populated = 0;
    var notFound = 0;
    var errored = 0;

    async.eachSeries(assetWhiteboardElements, function(assetWhiteboardElement, callback) {
      populateElementAssetId(assetWhiteboardElement, function(err, assetId) {
        if (err) {
          errored++;
          log.error({'id': assetWhiteboardElement.id, 'err': err}, 'Failed to migrate asset whiteboard element');
        } else if (assetId) {
          populated++;
        } else {
          notFound++;
        }

        log.info({'id': assetWhiteboardElement.id}, 'Migrated ' + (populated + notFound + errored) + ' / ' + assetWhiteboardElements.length);

        return callback();
      });
    }, function() {
    	log.info('Finished migrating. ' + populated + ' elements populated with asset ids, ' + notFound + ' elements had no asset id, ' + errored + ' errors.');
    });
  });
};

/**
 * Parse the serialized asset whiteboard element, populating the element_asset_id column if found
 *
 * @param  {AssetWhiteboardElement}       assetWhiteboardElement      The element to parse an asset id from
 * @param  {Function}                     callback                    Standard callback function
 * @param  {Object}                       callback.err                An error that occurred, if any
 * @param  {Number}                       callback.assetId            Parsed asset id, if any
 */
var populateElementAssetId = function(assetWhiteboardElement, callback) {
  var assetId = assetWhiteboardElement.element.assetId;
  if (assetId) {
    assetWhiteboardElement.element_asset_id = assetId;
    assetWhiteboardElement.save().complete(function(err, assetWhiteboardElement) {
      return callback(err, assetId);
    });
  } else {
    return callback();
  }
};

init();
