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
var OAuth = require('oauth').OAuth;
var xml2js = require('xml2js');
var url = require('url');

var TestsUtil = require('col-tests/lib/util');

var LTIConstants = require('col-lti/lib/constants');

/**
 * Assert that the Dashboard's cartridge can be retrieved
 *
 * @param  {Client}         client        The REST client to make the request with
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 */
var assertDashboardCartridgeSucceeds = module.exports.assertDashboardCartridgeSucceeds = function(client, callback) {
  client.lti.dashboardCartridge(function(err, body, response) {
    return assertCartridge(LTIConstants.DASHBOARD, err, body, response, callback);
  });
};

/**
 * Assert that the Asset Library's cartridge can be retrieved
 *
 * @param  {Client}         client        The REST client to make the request with
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 */
var assertAssetLibraryCartridgeSucceeds = module.exports.assertAssetLibraryCartridgeSucceeds = function(client, callback) {
  client.lti.assetLibraryCartridge(function(err, body, response) {
    return assertCartridge(LTIConstants.ASSETLIBRARY, err, body, response, callback);
  });
};

/**
 * Assert that the Engagement Index's cartridge can be retrieved
 *
 * @param  {Client}         client        The REST client to make the request with
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 */
var assertEngagementIndexCartridgeSucceeds = module.exports.assertEngagementIndexCartridgeSucceeds = function(client, callback) {
  client.lti.engagementIndexCartridge(function(err, body, response) {
    assertCartridge(LTIConstants.ENGAGEMENTINDEX, err, body, response, callback);
  });
};

/**
 * Assert that the Whiteboards' cartridge can be retrieved
 *
 * @param  {Client}         client        The REST client to make the request with
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 */
var assertWhiteboardsCartridgeSucceeds = module.exports.assertWhiteboardsCartridgeSucceeds = function(client, callback) {
  client.lti.whiteboardsCartridge(function(err, body, response) {
    assertCartridge(LTIConstants.WHITEBOARDS, err, body, response, callback);
  });
};

/**
 * Assert that an LTI cartridge contains the expected properties
 *
 * @param  {Object}         tool          The object representing the tool for which the LTI cartridge is asserted
 * @param  {Object}         err           An error object, if any
 * @param  {Object}         body          The LTI cartridge response body
 * @param  {Object}         response      The full LTI cartridge response
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 * @api private
 */
var assertCartridge = function(tool, err, body, response, callback) {
  assert.ifError(err);
  assert.ok(tool);

  // Assert XML was returned
  assert.strictEqual(response.headers['content-type'], 'application/xml; charset=utf-8');

  // Assert a valid cartridge file was returned
  xml2js.parseString(body, function(err, result) {
    assert.ifError(err);

    assert.ok(_.isObject(result));
    assert.ok(_.isObject(result.cartridge_basiclti_link));

    // Assert the correct title is present
    assert.strictEqual(result.cartridge_basiclti_link['blti:title'][0], tool.title);

    // Assert the correct description is present
    assert.strictEqual(result.cartridge_basiclti_link['blti:description'][0], tool.description);

    // Assert the correct launch URL is present
    assert.strictEqual(result.cartridge_basiclti_link['blti:launch_url'][0], 'http://localhost:2000/lti/' + tool.id);

    // Assert we've added some Canvas specific properties such as disabling the tool by default
    assert.ok(result.cartridge_basiclti_link['blti:extensions']);
    var extension = result.cartridge_basiclti_link['blti:extensions'][0];
    assert.ok(extension);
    assert.strictEqual(extension.$.platform, 'canvas.instructure.com');

    // Assert we've given it a unique tool id
    var toolIdProp = getImsPropertyByName(extension['lticm:property'], 'tool_id');
    assert.strictEqual(toolIdProp._, 'collabosphere_' + tool.id);

    // All data within the tool is public
    var privacyLevelProp = getImsPropertyByName(extension['lticm:property'], 'privacy_level');
    assert.strictEqual(privacyLevelProp._, 'public');

    // Assert the correct name for the tool is present in the Canvas menu
    var nameProp = getImsPropertyByName(extension['lticm:options'][0]['lticm:property'], 'text');
    assert.strictEqual(nameProp._, tool.title);

    return callback();
  });
};

/**
 * Assert that the Asset Library can be launched
 *
 * @param  {Client}         client        The REST client to make the request with
 * @param  {Course}         course        The Canvas course in which to launch the Asset Library
 * @param  {User}           user          The user in Canvas
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 */
var assertAssetLibraryLaunchSucceeds = module.exports.assertAssetLibraryLaunchSucceeds = function(client, course, user, callback) {
  // Get the LTI parameters which are signed with OAuth
  var parameters = getLaunchParameters(course, user, 'assetlibrary');

  // Launch the tool
  client.lti.assetLibraryLaunch(course, parameters, function(err, body, response) {
    assertLaunchSucceeds(LTIConstants.ASSETLIBRARY, course, err, body, response, callback);
  });
};

/**
 * Assert that Impact Studio can be launched
 *
 * @param  {Client}         client        The REST client to make the request with
 * @param  {Course}         course        The Canvas course in which to launch the Asset Library
 * @param  {User}           user          The user in Canvas
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 */
var assertImpactStudioLaunchSucceeds = module.exports.assertImpactStudioLaunchSucceeds = function(client, course, user, callback) {
  // Get the LTI parameters which are signed with OAuth
  var parameters = getLaunchParameters(course, user, 'dashboard');

  // Launch the tool
  client.lti.dashboardLaunch(course, parameters, function(err, body, response) {
    assertLaunchSucceeds(LTIConstants.DASHBOARD, course, err, body, response, callback);
  });
};

/**
 * Assert that the Engagement Index can be launched
 *
 * @param  {Client}         client        The REST client to make the request with
 * @param  {Course}         course        The Canvas course in which to launch the Engagement Index
 * @param  {User}           user          The user in Canvas
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 */
var assertEngagementIndexLaunchSucceeds = module.exports.assertEngagementIndexLaunchSucceeds = function(client, course, user, callback) {
  // Get the LTI parameters which are signed with OAuth
  var parameters = getLaunchParameters(course, user, 'engagementindex');

  // Launch the tool
  client.lti.engagementIndexLaunch(course, parameters, function(err, body, response) {
    assertLaunchSucceeds(LTIConstants.ENGAGEMENTINDEX, course, err, body, response, callback);
  });
};

/**
 * Assert that the Whiteboards can be launched
 *
 * @param  {Client}         client        The REST client to make the request with
 * @param  {Course}         course        The Canvas course in which to launch the Whiteboards
 * @param  {User}           user          The user in Canvas
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 */
var assertWhiteboardsLaunchSucceeds = module.exports.assertWhiteboardsLaunchSucceeds = function(client, course, user, callback) {
  // Get the LTI parameters which are signed with OAuth
  var parameters = getLaunchParameters(course, user, 'whiteboards');

  // Launch the tool
  client.lti.whiteboardsLaunch(course, parameters, function(err, body, response) {
    assertLaunchSucceeds(LTIConstants.WHITEBOARDS, course, err, body, response, callback);
  });
};

/**
 * Assert that an LTI tool can be launched
 *
 * @param  {Object}         tool          The object representing the tool for which the LTI launch is asserted
 * @param  {Course}         course        The Canvas course in which LTI tool has been launched
 * @param  {Object}         err           An error object, if any
 * @param  {Object}         body          The LTI launch response body
 * @param  {Object}         response      The full LTI launch response
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 * @api private
 */
var assertLaunchSucceeds = function(tool, course, err, body, response, callback) {
  assert.ifError(err);

  // We should be redirected to the HTML
  assert.strictEqual(response.statusCode, 302);

  // The API domain and course id should be included in the location header
  var location = response.headers.location;
  assert.ok(location);

  var parsedUrl = url.parse(location, true);
  assert.strictEqual(parsedUrl.pathname, '/' + tool.id);
  assert.ok(parsedUrl.query);
  assert.strictEqual(parsedUrl.query.api_domain, course.canvas.canvas_api_domain);
  assert.strictEqual(parseInt(parsedUrl.query.course_id, 10), course.id);

  return callback();
};

/**
 * Find an LTI property in a set of properties. If the property could
 * not be found, `null` will be returned
 *
 * @param  {Object[]}     properties          The set of LTI properties to search through
 * @param  {String}       name                The name of the property to find
 * @return {Object}                           The matching property or `null` if no property could be found
 * @api private
 */
var getImsPropertyByName = function(properties, name) {
  return _.find(properties, function(prop) {
    return (prop.$.name === name);
  });
};

/**
 * Assert that the Asset Library cannot be launched
 *
 * @param  {Client}         client        The REST client to make the request with
 * @param  {Course}         course        The Canvas course the Asset Library will be launched in
 * @param  {User}           user          The user in Canvas
 * @param  {Number}         code          The expected HTTP error code
 * @param  {Function}       callback      Standard callback function
 * @throws {AssertionError}               Error thrown when an assertion failed
 */
var assertAssetLibraryLaunchFails = module.exports.assertAssetLibraryLaunchFails = function(client, course, user, code, callback) {
  // Get the LTI parameters which are signed with OAuth
  var parameters = getLaunchParameters(course, user, 'assetlibrary');

  // Launch the tool
  client.lti.assetLibraryLaunch(course, parameters, function(err) {
    assert.strictEqual(err.code, code);
    return callback();
  });
};

/**
 * Get the parameters that can be sent to the LTI Launch URL. These will
 * be signed with OAuth
 *
 * @param  {Course}         course        The Canvas course the tool will be launched in
 * @param  {User}           user          The user in Canvas
 * @param  {String}         tool          The tool that will be launched
 * @return {Object}                       A set of parameters that can be sent to the launch URL
 * @api private
 */
var getLaunchParameters = function(course, user, tool) {
  // Build up the parameter hash that Canvas would send us
  var parameters = {
    'context_id': 'b166e25b17e0b4fec9e5092b85ba717821f42628',
    'context_label': course.label,
    'context_title': course.title,
    'custom_canvas_api_domain': course.canvas.canvas_api_domain,
    'custom_canvas_course_id': course.id,
    'custom_canvas_enrollment_state': 'active',
    'custom_canvas_user_id': user.id,
    'custom_canvas_user_login_id': user.loginId,
    'custom_external_tool_url': getExternalToolURL(course, tool),
    'ext_roles': user.ext_roles,
    'launch_presentation_document_target': 'iframe',
    'launch_presentation_height': '400',
    'launch_presentation_locale': 'en',
    'launch_presentation_return_url': 'http://localhost:3000/external_content/success/external_tool_redirect',
    'launch_presentation_width': '800',
    'lis_person_contact_email_primary': user.loginId,
    'lis_person_name_family': user.familyName,
    'lis_person_name_full': user.fullName,
    'lis_person_name_given': user.givenName,
    'lti_message_type': 'basic-lti-launch-request',
    'lti_version': 'LTI-1p0',
    'oauth_callback': 'about:blank',
    'resource_link_id': 'b166e25b17e0b4fec9e5092b85ba717821f42628',
    'resource_link_title': 'Collabosphere',
    'roles': user.roles,
    'tool_consumer_info_product_family_code': 'canvas',
    'tool_consumer_info_version': 'cloud',
    'tool_consumer_instance_contact_email': 'canvas@example.com',
    'tool_consumer_instance_guid': '9gfyVrsQjAPap3kyx6uzi4MUaVLTTSe1YTLwmlbw:canvas-lms',
    'tool_consumer_instance_name': 'Berkeley',
    'user_id': user.guid,
    'user_image': user.userImage
  };

  // Construct an OAuth client we can use to sign the launch request
  var oauth = new OAuth(null, null, course.canvas.lti_key, course.canvas.lti_secret, '1.0', null, 'HMAC-SHA1');

  // Although the OAuth library has HTTP capabilities built-in, we can't use them
  // as they are built for Oauth 1.0A which adds the signature in the header whereas
  // Basic LTI expects it as regular POST parameters
  var launchUrl = 'http://localhost:2000/lti/' + tool;
  var oauthParameters = oauth._prepareParameters(null, null, 'POST', launchUrl, parameters);

  // Add the OAuth parameters to our parameter set
  _.each(oauthParameters, function(param) {
    parameters[param[0]] = param[1];
  });

  return parameters;
};

/**
 * Get the external URL for a given course and tool
 *
 * @param  {Course}   course    The course in which the user is launching the LTI tool
 * @param  {String}   tool      The tool that is being launched (One of `assetlibrary`, `dashboard`, `engagementindex`, `whiteboards`)
 * @return {String}
 * @api private
 */
var getExternalToolURL = function(course, tool) {
  var protocol = (course.canvas.use_https) ? 'https' : 'http';
  // We expect a numeric tool ID.
  var toolId = [null, 'assetlibrary', 'dashboard', 'engagementindex', 'whiteboards'].indexOf(tool);
  return protocol + '://' + course.canvas.canvas_api_domain + '/api/v1/external_tools/' + toolId;
};
