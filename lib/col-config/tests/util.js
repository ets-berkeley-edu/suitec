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
var config = require('config');

/**
 * Assert tht the configuration feed has all expected properties
 *
 * @param  {Object}             configuration                 The configuration feed
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 * @return {void}
 */
var assertConfiguration = function(configuration) {
  assert.ok(configuration);

  assert.ok(configuration.activityNetwork.recentUserCutoff);
  assert.strictEqual(configuration.activityNetwork.recentUserCutoff, config.get('activityNetwork.recentUserCutoff'));

  assert.ok(configuration.analytics.mixpanel);
  assert.ok(_.isBoolean(configuration.analytics.mixpanel.enabled));
  assert.strictEqual(configuration.analytics.mixpanel.enabled, config.get('analytics.mixpanel.enabled'));
  assert.ok(configuration.analytics.mixpanel.apiKey);
  assert.strictEqual(configuration.analytics.mixpanel.apiKey, config.get('analytics.mixpanel.apiKey'));
};

/**
 * Assert that the configuration feed can be retrieved
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Function}           callback                        Standard callback function
 * @param  {Object}             callback.configuration          The configuration feed
 * @return {void}
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertGetConfiguration = module.exports.assertGetConfiguration = function(client, course, callback) {
  client.config.getConfiguration(course, function(err, configuration) {
    assert.ifError(err);
    assert.ok(configuration);
    assertConfiguration(configuration);

    return callback(configuration);
  });
};

