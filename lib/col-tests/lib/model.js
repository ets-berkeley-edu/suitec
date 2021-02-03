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

var assert = require('assert');

/**
 * The information of a request that is expected to hit the mocked Canvas REST API
 *
 * @param  {String}     method                      The HTTP method
 * @param  {String}     path                        The path of the request
 * @param  {Number}     [statusCode]                The status code of the response that should be returned
 * @param  {Object}     [response]                  The body of the response that should be returned
 * @param  {Object}     [headers]                   The headers of the response that should be returned
 * @param  {Object}     [customHandler]             A custom handler. If this is specified, the `statusCode` and `responseBody` will be ignored and it's up to the `handler` to send a response
 * @param  {Request}    [customHandler.req]         The request that should be handled
 * @param  {Response}   [customHandler.res]         The response
 * @param  {Function}   [customValidator]           A function that adds additional validation of the request
 * @param  {Request}    [customValidator.req]       The request that should be validated
 * @return {void}
 */
var MockedRequest = module.exports.MockedRequest = function(method, path, statusCode, response, headers, customHandler, customValidator) {
  this.method = method;
  this.path = path;
  this.statusCode = statusCode;
  this.response = response;
  this.headers = headers;
  this.customHandler = customHandler;
  this.customValidator = customValidator;
};

/**
 * Check whether a request is valid
 *
 * @param  {Request}          req     The request to validate
 * @throws {AssertionError}           Error thrown when an assertion failed
 * @return {void}
 */
MockedRequest.prototype.isValid = function(req) {
  // Assert some basic properties of the HTTP request
  assert.strictEqual(req.method, this.method);
  assert.strictEqual(req.path, this.path);

  // Delegate any further validation to the custom checker
  if (this.customValidator) {
    this.customValidator(req);
  }
};

/**
 * Handle a request by sending the expected status code and response body or by passing it
 * on to the custom handler
 *
 * @param  {Request}          req     The request to handle
 * @param  {Response}         res     The response
 * @return {void}
 */
MockedRequest.prototype.handle = function(req, res) {
  if (this.customHandler) {
    return this.customHandler(req, res);
  }

  if (this.headers) {
    res.set(this.headers);
  }

  // The default handler is to return a status code and response
  res.status(this.statusCode).send(this.response);
};
