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
var assert = require('assert');
var busboy = require('express-busboy');
var config = require('config');
var express = require('express');
var randomstring = require('randomstring');
var url = require('url');
var util = require('util');

var Collabosphere = require('col-core');
var DB = require('col-core/lib/db');

var TestsUtil = require('./util');

// Bootstrap the application server before the tests begin
before(function(callback) {
  // Start up server
  Collabosphere.init(function(err) {
    assert.ifError(err);

    // Reset database schema
    DB.resetSchema(function(dbErr) {
      assert.ok(!dbErr);

      // Create 2 Canvas instances that can be used in the tests
      createCanvas(function(ucberkeleyCanvas) {
        createCanvas(function(ucdavisCanvas) {

          // Expose the Canvas instances on the global object
          global.tests = {
            'canvas': {
              'ucberkeley': ucberkeleyCanvas,
              'ucdavis': ucdavisCanvas
            }
          };

          // Create mock Caliper endpoint and expose globally
          createCaliperEndpoint(function(mockCaliperEndpoint) {
            global.tests.caliper = mockCaliperEndpoint;

            return callback();
          });
        });
      });
    });
  });
});

after(function(callback) {
  Collabosphere.appServer.httpServer.close();
  return callback();
});

// Make sure that any unsatisfied expectations or defined allowances don't linger between tests.
beforeEach(function(callback) {
  global.tests.canvas.ucberkeley.appServer.clear();
  global.tests.canvas.ucberkeley.appServer.clear();
  global.tests.caliper.appServer.clear();
  return callback();
});


var canvasPort = 3001;

/**
 * Create a mock Canvas instance
 *
 * @param  {Function}     callback              Standard callback function
 * @param  {Object}       callback.canvas       The created Canvas object
 * @return {Object}                             Processed Canvas object
 */
var createCanvas = function(callback) {
  // Mock a Canvas instance
  mockExternalAPI(canvasPort, true, function(apiDomain, canvasAppServer) {
    canvasPort++;

    DB.Canvas.build({
      'canvas_api_domain': apiDomain,
      'api_key': randomstring.generate(),
      'lti_key': randomstring.generate(),
      'lti_secret': randomstring.generate(),
      'use_https': false
    }).save().complete(function(err, canvas) {
      assert.ifError(err);
      canvas = canvas.dataValues;
      canvas.appServer = canvasAppServer;
      return callback(canvas);
    });
  });
};

/**
 * Create a mock Caliper endpoint
 *
 * @param  {Function}     callback              Standard callback function
 * @param  {Object}       callback.canvas       The created Caliper endpoint
 * @return {Object}                             Processed Caliper endpoint
 */
var createCaliperEndpoint = function(callback) {
  var caliperUrl = url.parse(config.get('analytics.caliper.url'));
  mockExternalAPI(caliperUrl.port, false, function(apiDomain, caliperEndpointServer) {
    return callback({
      'appServer': caliperEndpointServer
    });
  });
};

/**
 * Mock an external API by spinning up an express web server
 *
 * @param  {Number}           localPort                   The localhost port on which the mock API should listen
 * @param  {Boolean}          emptyQueueError             When false, ignore requests on an empty queue; when true, throw an error
 * @param  {Function}         callback                    Standard callback function
 * @param  {String}           callback.apiDomain          The API domain on which the mock API is available
 * @param  {Express}          callback.app                The express web server that will be used to mock the REST API
 * @param  {Function}         callback.app.expect         A function that allows you to add an expected request
 * @return {Object}                                       Initialized mock REST API
 * @api private
 */
var mockExternalAPI = function(localPort, emptyQueueError, callback) {
  var app = express();

  // A queue of expected requests.
  app.expectations = [];

  // A set of functions defining requests which are allowed to hit the server without expectation matching.
  app.allowances = [];

  var server = app.listen(localPort, function() {
    var port = server.address().port;
    var apiDomain = util.format('localhost:%d', port);

    // Parse incoming requests.
    busboy.extend(app, {'upload': true});
    app.use(function(req, res, next) {
      if (_.isEmpty(app.expectations)) {
        if (emptyQueueError) {
          assert.fail('Mock API was expecting no requests');
        } else {
          return;
        }
      }

      // If the request meets an allowance test, return without comment.
      var isRequestAllowed = _.find(app.allowances, function(test) {
        return test(req);
      });
      if (isRequestAllowed) {
        return;
      }

      // Attempt to match this request against the next expectation in the queue. Failure will be passed as an
      // error to the results callback, or thrown if no results callback is supplied.
      var mockedRequest = app.expectations[0];
      try {
        mockedRequest.isValid(req);
      } catch (err) {
        if (app.expectationResultCallback) {
          app.expectationResultCallback(err);
        } else {
          throw err;
        }
      }

      // Send a response and remove the expected request from the queue.
      mockedRequest.handle(req, res);
      app.expectations.shift();

      // If all requests in the queue have been matched, execute callback.
      if (_.isEmpty(app.expectations) && app.expectationResultCallback) {
        app.expectationResultCallback();
      }
    });

    /**
     * Add a mocked request to the queue of expected requests
     *
     * @param  {MockedRequest}  mockedRequest   The mocked request which should be added to the queue
     * @return {void}
     */
    app.expect = function(mockedRequest) {
      app.expectations.push(mockedRequest);
    };

    /**
     * Define a test for requests which should be allowed without failure
     *
     * @param  {Function}  allowanceTest     A function returning true for requests which should be allowed, false otherwise
     * @return {void}
     */
    app.allow = function(allowanceTest) {
      app.allowances.push(allowanceTest);
    };

    /**
     * Clear any expectations and allowances set by a test case
     *
     * @return {void}
     */
    app.clear = function() {
      app.expectations = [];
      app.allowances = [];
    };

    /**
     * Set a callback when all expectations in the queue are satisfied or an expectation fails
     *
     * @param  {Function}   resultCallback        Callback to execute on satisfaction or failure
     * @return {void}
     */
    app.onExpectationResult = function(resultCallback) {
      app.expectationResultCallback = resultCallback;
    };

    return callback(apiDomain, app);
  });
};
