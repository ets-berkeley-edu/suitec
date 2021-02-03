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

module.exports = function(client) {
  client.assets = {};
  client.assets.bookmarklet = {};

  /**
   * Get an asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the asset
   * @param  {Boolean}        [incrementViews]                Whether the total number of views for the asset should be incremented by 1
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.getAsset = function(course, id, incrementViews, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(id);
    var data = {
      'incrementViews': incrementViews
    };
    client.request(requestUrl, 'GET', data, null, callback);
  };

  /**
   * Get the assets for the current course
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Object}         [filters]                       A set of options to filter the results by
   * @param  {String}         [filters.keywords]              A string to filter the assets by
   * @param  {Number}         [filters.category]              The id of the category to filter the assets by
   * @param  {Number}         [filters.user]                  The id of the user who created the assets
   * @param  {String[]}       [filters.types]                 The type of assets. One or more of `CollabosphereConstants.ASSET.ASSET_TYPES`
   * @param  {Boolean}        [filters.hasComments]           If true then exclude zero comment_count; if false then zero comment_count only; if null do nothing
   * @param  {Boolean}        [filters.hasImpact]             If true then exclude zero impact; if false then zero impact only; if null do nothing
   * @param  {Boolean}        [filters.hasLikes]              If true then exclude zero likes; if false then zero likes only; if null do nothing
   * @param  {Boolean}        [filters.hasPins]               If true then exclude assets with zero pins; if false then zero pins only; if null do nothing
   * @param  {Boolean}        [filters.hasTrending]           If true then exclude zero trending score; if false then zero trending score only; if null do nothing
   * @param  {Boolean}        [filters.hasViews]              If true then exclude zero views; if false then zero views only; if null do nothing
   * @param  {String}         [sort]                          An optional criterion to sort by. Defaults to id descending
   * @param  {Number}         [limit]                         The maximum number of results to retrieve. Defaults to 10
   * @param  {Number}         [offset]                        The number to start paging from. Defaults to 0
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.getAssets = function(course, filters, sort, limit, offset, callback) {
    filters = filters || {};
    var requestUrl = client.util.apiPrefix(course) + '/assets';
    var data = {
      'keywords': filters.keywords,
      'category': filters.category,
      'user': filters.user,
      'section': filters.section,
      'type': filters.types,
      'hasComments': filters.hasComments,
      'hasImpact': filters.hasImpact,
      'hasLikes': filters.hasLikes,
      'hasPins': filters.hasPins,
      'hasTrending': filters.hasTrending,
      'hasViews': filters.hasViews,
      'sort': sort,
      'limit': limit,
      'offset': offset
    };
    client.request(requestUrl, 'GET', data, null, callback);
  };

  /**
   * Create a new link asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {String}         title                           The title of the link
   * @param  {String}         url                             The url of the link
   * @param  {Object}         [opts]                          A set of optional parameters
   * @param  {Number[]}       [opts.categories]               The ids of the categories to which the link should be associated
   * @param  {String}         [opts.description]              The description of the link
   * @param  {String}         [opts.source]                   The source of the link
   * @param  {Boolean}        [opts.visible]                  Whether the link is expected to be visible in the assets library list
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.createLink = function(course, title, url, opts, callback) {
    opts = opts || {};

    var requestUrl = client.util.apiPrefix(course) + '/assets';
    var data = {
      'type': 'link',
      'title': title,
      'url': url,
      'categories': opts.categories,
      'description': opts.description,
      'source': opts.source,
      'visible': opts.visible
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Create a new link asset using a bookmarklet token
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {String}         userId                          The id of the user creating the link
   * @param  {String}         bookmarkletToken                The bookmarklet access token for the user
   * @param  {String}         title                           The title of the link
   * @param  {String}         url                             The url of the link
   * @param  {Object}         [opts]                          A set of optional parameters
   * @param  {Number[]}       [opts.categories]               The ids of the categories to which the link should be associated
   * @param  {String}         [opts.description]              The description of the link
   * @param  {String}         [opts.source]                   The source of the link
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.bookmarklet.createLink = function(course, userId, bookmarkletToken, title, url, opts, callback) {
    opts = opts || {};

    var requestUrl = client.util.apiPrefix(course) + '/assets';
    var data = {
      'type': 'link',
      'title': title,
      'url': url,
      'categories': opts.categories,
      'description': opts.description,
      'source': opts.source
    };
    var headers = {
      'x-collabosphere-user': userId,
      'x-collabosphere-token': bookmarkletToken
    };
    client.request(requestUrl, 'POST', data, headers, callback);
  };

  /**
   * Create a new file asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {String}         title                           The title of the file
   * @param  {Stream}         file                            The file to upload
   * @param  {Object}         [opts]                          A set of optional parameters
   * @param  {Number[]}       [opts.categories]               The ids of the categories to which the file should be associated
   * @param  {String}         [opts.description]              The description of the file
   * @param  {String}         [opts.source]                   The source of the file
   * @param  {Boolean}        [opts.visible]                  Whether the file is expected to be visible in the assets library list
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.createFile = function(course, title, file, opts, callback) {
    opts = opts || {};

    var requestUrl = client.util.apiPrefix(course) + '/assets';
    var data = {
      'type': 'file',
      'title': title,
      'file': file,
      'categories': opts.categories,
      'description': opts.description,
      'source': opts.source,
      'visible': opts.visible
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Edit an asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the asset that is being edited
   * @param  {String}         title                           The updated title of the asset
   * @param  {Object}         [opts]                          A set of optional parameters
   * @param  {Number[]}       [opts.categories]               The updated ids of the categories to which the asset should be associated
   * @param  {String}         [opts.description]              The updated description of the asset
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.editAsset = function(course, id, title, opts, callback) {
    opts = opts || {};

    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(id);
    var data = {
      'title': title,
      'categories': opts.categories,
      'description': opts.description
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Delete an asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         id                              The id of the asset that is being deleted
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.deleteAsset = function(course, id, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(id);
    client.request(requestUrl, 'DELETE', null, null, callback);
  };

  /**
   * Migrate assets
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         destinationUserId               Course-associated SuiteC id for destination user
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.migrateAssets = function(course, destinationUserId, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/migrate';
    var data = {
      'destinationUserId': destinationUserId
    }
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Create a new comment on an asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         assetId                         The id of the asset to which the comment is added
   * @param  {String}         body                            The body of the comment
   * @param  {Number}         [parent]                        The id of the comment to which the comment is a reply
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.createComment = function(course, assetId, body, parent, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(assetId) + '/comments';
    var data = {
      'body': body,
      'parent': parent
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Edit a comment on an asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         assetId                         The id of the asset to which the comment belongs
   * @param  {Number}         id                              The id of the comment that is being edited
   * @param  {String}         body                            The updated comment body
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.editComment = function(course, assetId, id, body, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(assetId) + '/comments/' + client.util.encodeURIComponent(id);
    var data = {
      'body': body
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Download an asset (file)
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         assetId                         The id of the asset to download
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.downloadAsset = function(course, assetId, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(assetId) + '/download';
    client.request(requestUrl, 'GET', null, null, callback);
  };

  /**
   * Delete a comment on an asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         assetId                         The id of the asset to which the comment belongs
   * @param  {Number}         id                              The id of the comment that is being deleted
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.deleteComment = function(course, assetId, id, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(assetId) + '/comments/' + client.util.encodeURIComponent(id);
    client.request(requestUrl, 'DELETE', null, null, callback);
  };

  /**
   * Like or dislike an asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         assetId                         The id of the asset that is liked or disliked
   * @param  {Boolean}        like                            `true` when the asset should be liked, `false` when the asset should be disliked. When `null` is provided, the previous like or dislike will be undone
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.like = function(course, assetId, like, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(assetId) + '/like';
    var data = {
      'like': like
    };
    client.request(requestUrl, 'POST', data, null, callback);
  };

  /**
   * Pin an asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         assetId                         The id of the asset to be pinned
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.pin = function(course, assetId, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(assetId) + '/pin';
    client.request(requestUrl, 'POST', null, null, callback);
  };

  /**
   * Unpin an asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         assetId                         The id of the asset to be unpinned
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.unpin = function(course, assetId, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(assetId) + '/unpin';
    client.request(requestUrl, 'POST', null, null, callback);
  };

  /**
   * Remix an exported whiteboard asset
   *
   * @param  {Course}         course                          The Canvas course in which the user is interacting with the API
   * @param  {Number}         assetId                         The id of the exported whiteboard asset to which the comment belongs
   * @param  {Function}       callback                        Standard callback function
   * @param  {Object}         callback.err                    An error that occurred, if any
   * @param  {Object}         callback.body                   The JSON response from the REST API
   * @param  {Response}       callback.response               The response object as returned by requestjs
   * @see col-assets/lib/rest.js for more information
   */
  client.assets.remixWhiteboard = function(course, assetId, callback) {
    var requestUrl = client.util.apiPrefix(course) + '/assets/' + client.util.encodeURIComponent(assetId) + '/whiteboard';
    client.request(requestUrl, 'POST', null, null, callback);
  };
};
