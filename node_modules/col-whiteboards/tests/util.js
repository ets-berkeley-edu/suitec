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

var AssetsTestsUtil = require('col-assets/tests/util');
var CanvasTestsUtil = require('col-canvas/tests/util');
var CollabosphereUtil = require('col-core/lib/util');
var DB = require('col-core/lib/db');
var EmailUtil = require('col-core/lib/email');
var UsersTestUtil = require('col-users/tests/util');

/**
 * Assert that a whiteboard has all expected properties
 *
 * @param  {Whiteboard}         whiteboard                    The whiteboard to assert the properties for
 * @param  {Object}             [opts]                        Optional parameters to verify the whiteboard with
 * @param  {Whiteboard}         [opts.expectedWhiteboard]     The whiteboard to which the provided whiteboard should be compared
 * @param  {Boolean}            [opts.expectFullWhiteboard]   Whether the full whiteboard details are expected, including the list of members, online members and whiteboard elements
 * @param  {Number}             [opts.expectedMemberCount]    The total number of members that are expected on the whiteboard
 * @param  {Number}             [opts.expectedOnlineCount]    The total number of online members that are expected on the whiteboard
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 */
var assertWhiteboard = module.exports.assertWhiteboard = function(whiteboard, opts) {
  opts = opts || {};

  // Ensure that all expected properties are present
  assert.ok(whiteboard);
  assert.ok(whiteboard.id);
  assert.ok(whiteboard.course_id);
  assert.ok(whiteboard.title);
  assert.ok(whiteboard.created_at);
  assert.ok(whiteboard.updated_at);

  if (opts.expectFullWhiteboard) {
    assert.ok(_.isArray(whiteboard.whiteboard_elements));
    assert.ok(_.isArray(whiteboard.members));
    if (opts.expectedWhiteboard) {
      assert.strictEqual(whiteboard.members.length, opts.expectedWhiteboard.members.length);
      _.each(whiteboard.members, function(member) {
        UsersTestUtil.assertUser(_.find(opts.expectedWhiteboard.members, {'id': member.id}), {'expectEmail': false});
        assert.ok(_.isBoolean(member.online));
      });
    }
    if (_.isFinite(opts.expectedMemberCount)) {
      assert.strictEqual(whiteboard.members.length, opts.expectedMemberCount);
    }
  } else {
    assert.ok(_.isFinite(whiteboard.online_count));
    if (_.isFinite(opts.expectedOnlineCount)) {
      assert.strictEqual(whiteboard.online_count, opts.expectedOnlineCount);
    }
  }

  if (opts.expectedWhiteboard) {
    assert.strictEqual(whiteboard.id, opts.expectedWhiteboard.id);
    assert.strictEqual(whiteboard.course_id, opts.expectedWhiteboard.course_id);
    assert.strictEqual(whiteboard.title, opts.expectedWhiteboard.title);
    assert.strictEqual(whiteboard.created_at, opts.expectedWhiteboard.created_at);
  }
};

/**
 * Assert that a new whiteboard can be created
 *
 * @param  {RestClient}         client                        The REST client to make the request with
 * @param  {Course}             course                        The Canvas course in which the user is interacting with the API
 * @param  {String}             title                         The title of the whiteboard
 * @param  {Number[]}           [members]                     The ids of the users that should be added to the whiteboard as members. The current user will automatically be added as a member
 * @param  {Function}           callback                      Standard callback function
 * @param  {Object}             callback.err                  An error that occurred, if any
 * @param  {Whiteboard}         callback.whiteboard           The created whiteboard
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 */
var assertCreateWhiteboard = module.exports.assertCreateWhiteboard = function(client, course, title, members, callback) {
  UsersTestUtil.assertGetMe(client, course, null, function(me) {

    // Collect any emails that are sent out when creating the whiteboard
    var emails = [];
    function emailListener(email, user, course) {
      emails.push({
        'email': email,
        'user': user,
        'course': course
      });
    };
    EmailUtil.on(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);

    // Because of the asynchronous process of sending out emails, we only return to the caller when
    // both the REST request finishes and the emails have been sent out
    var _whiteboard = null;
    var done = _.after(2, function() {
      EmailUtil.removeListener(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);

      return callback(_whiteboard);
    });

    var expectedMembers = CollabosphereUtil.toArray(members);
    expectedMembers.push(me.id);
    expectedMembers = _.uniq(expectedMembers);

    client.whiteboards.createWhiteboard(course, title, members, function(err, whiteboard) {
      assert.ifError(err);
      assert.ok(whiteboard);
      assertWhiteboard(whiteboard, {'expectFullWhiteboard': true});
      assert.strictEqual(whiteboard.title, title);

      // Verify that the expected members are present
      assert.strictEqual(whiteboard.members.length, expectedMembers.length);
      _.each(expectedMembers, function(member) {
        UsersTestUtil.assertUser(_.find(whiteboard.members, {'id': member}), {'expectEmail': false});
      });

      _whiteboard = whiteboard;
      return done();
    });

    // Require the whiteboards API inline as it requires the entire application to be bootstrapped
    // when loaded the first time
    var WhiteboardsAPI = require('../lib/api');
    WhiteboardsAPI.once(WhiteboardsAPI.EVENT_NAMES.INVITATIONS_SENT, function() {
      // Verify that an email was sent to all the invited members (except for the current user)
      assert.strictEqual(emails.length, expectedMembers.length - 1);
      _.each(expectedMembers, function(member) {
        if (member !== me.id) {
          // Assert the user was sent an email
          var email = _.find(emails, function(mailData) {
            return (mailData.user.id === member);
          });
          assert.ok(email);

          // Assert that there's some context about the whiteboard in the email
          assert.ok(email.email.subject.indexOf(title) > 0);
          assert.ok(email.email.html.indexOf(title) > 0);
          assert.ok(email.email.html.indexOf(me.canvas_full_name) > 0);
        }
      });

      return done();
    });
  });
};

/**
 * Assert that a whiteboard with a few elements can be created
 *
 * @param  {RestClient}         client                        The REST client to make the request with
 * @param  {Course}             course                        The Canvas course in which the user is interacting with the API
 * @param  {String}             title                         The title of the whiteboard
 * @param  {Number[]}           [members]                     The ids of the users that should be added to the whiteboard as members. The current user will automatically be added as a member
 * @param  {Function}           callback                      Standard callback function
 * @param  {Object}             callback.err                  An error that occurred, if any
 * @param  {Whiteboard}         callback.whiteboard           The created whiteboard
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 */
var assertCreateWhiteboardWithElements = module.exports.assertCreateWhiteboardWithElements = function(client, course, title, members, callback) {
  assertCreateWhiteboard(client, course, title, members, function(whiteboard) {

    addElementsToWhiteboard(client, course, whiteboard, function() {
      return callback(whiteboard);
    });
  });
};

/**
 * Add a few elements to a whiteboard
 *
 * @param  {RestClient}         client                        The REST client to make the request with
 * @param  {Course}             course                        The Canvas course in which the user is interacting with the API
 * @param  {Whiteboard}         whiteboard                    The whiteboard to add the elements to
 * @param  {Function}           callback                      Standard callback function
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 */
var addElementsToWhiteboard = module.exports.addElementsToWhiteboard = function(client, course, whiteboard, callback) {
  DB.WhiteboardElement.bulkCreate([
    mockWhiteboardElement('path1.json', whiteboard.id),
    mockWhiteboardElement('path2.json', whiteboard.id)
  ]).complete(function(err) {
    assert.ifError(err);

    // Assert that the elements have been added to the whiteboard
    assertGetWhiteboard(client, course, whiteboard.id, null, null, function(whiteboard) {
      assert.ok(_.isArray(whiteboard.whiteboard_elements));
      assert.strictEqual(whiteboard.whiteboard_elements.length, 2);
      return callback(whiteboard.whiteboard_elements);
    });
  });
};


/**
 * Add an asset to a whiteboard
 *
 * @param  {RestClient}         client                        The REST client to make the request with
 * @param  {Course}             course                        The Canvas course in which the user is interacting with the API
 * @param  {Asset}              asset                         The asset to add to the whiteboard
 * @param  {Whiteboard}         whiteboard                    The whiteboard to add the asset to
 * @param  {Function}           callback                      Standard callback function
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 */
var addAssetToWhiteboard = module.exports.addAssetToWhiteboard = function(client, course, asset, whiteboard, callback) {
  var assetElement = mockWhiteboardElement('path1.json', whiteboard.id);
  assetElement.asset_id = asset.id;
  // TODO: Use the websocket rather than going through the database directly
  DB.WhiteboardElement.upsert(assetElement).complete(function(err) {
    assert.ifError(err);

    // Assert that the element has been added to the whiteboard
    assertGetWhiteboard(client, course, whiteboard.id, null, null, function(whiteboard) {
      assert.ok(_.isArray(whiteboard.whiteboard_elements));
      assert.strictEqual(whiteboard.whiteboard_elements.length, 1);
      return callback();
    });
  });
};

/**
 * Remove an asset from a whiteboard
 *
 * @param  {RestClient}         client                        The REST client to make the request with
 * @param  {Course}             course                        The Canvas course in which the user is interacting with the API
 * @param  {Asset}              asset                         The asset to remove from the whiteboard
 * @param  {Whiteboard}         whiteboard                    The whiteboard to remove the asset from
 * @param  {Function}           callback                      Standard callback function
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 */
var removeAssetFromWhiteboard = module.exports.removeAssetFromWhiteboard = function(client, course, asset, whiteboard, callback) {
  // TODO: Use the websocket rather than going through the database directly
  var whiteboardElementOptions = {
    'where': {
      'asset_id': asset.id,
      'whiteboard_id': whiteboard.id
    }
  };
  DB.WhiteboardElement.destroy(whiteboardElementOptions).complete(function(err) {
    assert.ifError(err);

    // Assert that the whiteboard has no elements
    assertGetWhiteboard(client, course, whiteboard.id, null, null, function(whiteboard) {
      assert.ok(_.isArray(whiteboard.whiteboard_elements));
      assert.strictEqual(whiteboard.whiteboard_elements.length, 0);
      return callback();
    });
  });
};

/**
 * Mock a whiteboard element
 *
 * @param  {String}   element   The element to load. This should be the name of one of the files in `./data/elements`
 * @param  {Number}   id        The id of the whiteboard the element will be added to
 * @return {Object}             An object from which a whiteboard element can be created
 * @api private
 */
var mockWhiteboardElement = function(element, id) {
  element = require('./data/elements/' + element);
  return {
    'whiteboard_id': id,
    'element': element,
    'uid': element.uid
  };
};

/**
 * Assert that a new whiteboard can not be created
 *
 * @param  {RestClient}         client                        The REST client to make the request with
 * @param  {Course}             course                        The Canvas course in which the user is interacting with the API
 * @param  {String}             title                         The title of the whiteboard
 * @param  {Number[]}           [members]                     The ids of the users that should be added to the whiteboard as members. The current user will automatically be added as a member
 * @param  {Number}             code                          The expected HTTP error code
 * @param  {Function}           callback                      Standard callback function
 * @param  {Object}             callback.err                  An error that occurred, if any
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 */
var assertCreateWhiteboardFails = module.exports.assertCreateWhiteboardFails = function(client, course, title, members, code, callback) {
  client.whiteboards.createWhiteboard(course, title, members, function(err, whiteboard) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!whiteboard);

    return callback();
  });
};

/**
 * Assert that a whiteboard can be retrieved
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard
 * @param  {Whiteboard}         [expectedWhiteboard]            The expected whiteboard to be retrieved
 * @param  {Number}             [expectedMemberCount]           The total number of members that are expected on the whiteboard
 * @param  {Function}           callback                        Standard callback function
 * @param  {Whiteboard}         callback.whiteboard             The retrieved whiteboard
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertGetWhiteboard = module.exports.assertGetWhiteboard = function(client, course, id, expectedWhiteboard, expectedMemberCount, callback) {
  client.whiteboards.getWhiteboard(course, id, function(err, whiteboard) {
    assert.ifError(err);
    assert.ok(whiteboard);
    assert.strictEqual(whiteboard.id, id);
    assertWhiteboard(whiteboard, {'expectFullWhiteboard': true, 'expectedWhiteboard': expectedWhiteboard, 'expectedMemberCount': expectedMemberCount});

    return callback(whiteboard);
  });
};

/**
 * Assert that a whiteboard can not be retrieved
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertGetWhiteboardFails = module.exports.assertGetWhiteboardFails = function(client, course, id, code, callback) {
  client.whiteboards.getWhiteboard(course, id, function(err, whiteboard) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!whiteboard);

    return callback();
  });
};

/**
 * Assert that chat messages for a whiteboard can be retrieved
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard
 * @param  {Whiteboard}         [expectedChatMessageCount]      The expected number of messages to be retrieved
 * @param  {Function}           callback                        Standard callback function
 * @param  {Whiteboard}         callback.messages               The retrieved chat messages
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertGetChatMessages = module.exports.assertGetChatMessages = function(client, course, id, expectedChatMessageCount, callback) {
  client.whiteboards.getChatMessages(course, id, function(err, messages) {
    assert.ifError(err);
    assert.ok(messages);
    if (expectedChatMessageCount !== null) {
      assert.strictEqual(expectedChatMessageCount, messages.total);
      assert.strictEqual(expectedChatMessageCount, messages.results.length);
    }

    return callback(messages);
  });
};

/**
 * Assert that the whiteboards for a course can be retrieved
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Object}             [filters]                       A set of options to filter the results by
 * @param  {Boolean}            [filters.includeDeleted]        Whether to include deleted whiteboards
 * @param  {String}             [filters.keywords]              String filter for whiteboard title
 * @param  {Number}             [filters.user]                  The id of a user associated with the whiteboardss
 * @param  {Number}             [limit]                         The maximum number of results to retrieve. Defaults to 10
 * @param  {Number}             [offset]                        The number to start paging from. Defaults to 0
 * @param  {Number}             expectedTotal                   The expected total number of assets in the current course
 * @param  {Function}           callback                        Standard callback function
 * @param  {Object}             callback.whiteboards            The retrieved whiteboards
 * @param  {Number}             callback.whiteboards.offset     The number the whiteboards are paged from
 * @param  {Number}             callback.whiteboards.total      The total number of whiteboards to which the current user has access in the current course
 * @param  {Whiteboard[]}       callback.whiteboards.results    The paged whiteboard to which the current user has access in the current course
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertGetWhiteboards = module.exports.assertGetWhiteboards = function(client, course, filters, limit, offset, expectedTotal, callback) {
  filters = filters || {};
  client.whiteboards.getWhiteboards(course, filters, limit, offset, function(err, whiteboards) {
    assert.ifError(err);
    assert.ok(whiteboards);
    assert.ok(_.isNumber(whiteboards.offset));
    if (_.isNumber(offset)) {
      assert.strictEqual(whiteboards.offset, offset);
    }
    assert.ok(whiteboards.results);
    assert.ok(whiteboards.results.length <= whiteboards.total);
    assert.strictEqual(whiteboards.total, expectedTotal);

    _.each(whiteboards.results, function(whiteboard) {
      assertWhiteboard(whiteboard);

      if (filters.keywords) {
        var keywords = filters.keywords.toLowerCase().split(' ');
        _.each(keywords, function(keyword) {
          assert.ok(whiteboard.title.toLowerCase().indexOf(keyword) !== -1);
        });
      }
    });
    return callback(whiteboards);
  });
};

/**
 * Assert that the whiteboards for a course can not be retrieved
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Object}             [filters]                       A set of options to filter the results by
 * @param  {String}             [filters.keywords]              String filter for whiteboard title
 * @param  {Number}             [filters.user]                  The id of a user associated with the whiteboardss
 * @param  {Number}             [limit]                         The maximum number of results to retrieve. Defaults to 10
 * @param  {Number}             [offset]                        The number to start paging from. Defaults to 0
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertGetWhiteboardsFails = module.exports.assertGetWhiteboardsFails = function(client, course, filters, limit, offset, code, callback) {
  client.whiteboards.getWhiteboards(course, filters, limit, offset, function(err, whiteboards) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!whiteboards);

    return callback();
  });
};

/**
 * Assert that a whiteboard can be edited
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard that is being edited
 * @param  {String}             title                           The updated title of the whiteboard
 * @param  {Number[]}           members                         The ids of the users that should be a member of the whiteboard
 * @param  {Function}           callback                        Standard callback function
 * @param  {Whiteboard}         callback.whiteboard             The updated whiteboard
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertEditWhiteboard = module.exports.assertEditWhiteboard = function(client, course, id, title, members, callback) {
  UsersTestUtil.assertGetMe(client, course, null, function(me) {

    // Get the whiteboard in its current state
    assertGetWhiteboard(client, course, id, null, null, function(oldWhiteboard) {
      var oldMemberIds = _.map(oldWhiteboard.members, 'id');

      var expectedMembers = CollabosphereUtil.toArray(members);
      expectedMembers = _.uniq(expectedMembers);

      var newMemberIds = _.difference(expectedMembers, oldMemberIds);

      // Collect any emails that are sent out when editing the whiteboard
      var emails = [];
      function emailListener(email, user, course) {
        emails.push({
          'email': email,
          'user': user,
          'course': course
        });
      };
      EmailUtil.on(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);

      // Because of the asynchronous process of sending out emails, we only return to the caller when
      // both the REST request finishes and the emails have been sent out
      var _whiteboard = null;
      var done = _.after(2, function() {
        EmailUtil.removeListener(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);

        return callback(_whiteboard);
      });

      // Edit the whiteboard
      client.whiteboards.editWhiteboard(course, id, title, members, function(err, whiteboard) {
        assert.ifError(err);
        assert.ok(whiteboard);
        assertWhiteboard(whiteboard, {'expectFullWhiteboard': true});
        assert.strictEqual(whiteboard.title, title);

        // Verify that the expected members are present
        assert.strictEqual(whiteboard.members.length, expectedMembers.length);
        _.each(expectedMembers, function(member) {
          UsersTestUtil.assertUser(_.find(whiteboard.members, {'id': member}), {'expectEmail': false});
        });

        _whiteboard = whiteboard;
        return done();
      });

      // Require the whiteboards API inline as it requires the entire application to be bootstrapped
      // when loaded the first time
      var WhiteboardsAPI = require('../lib/api');
      WhiteboardsAPI.once(WhiteboardsAPI.EVENT_NAMES.INVITATIONS_SENT, function() {
        // Verify that an email was sent to all the new members
        assert.strictEqual(emails.length, newMemberIds.length);
        _.each(newMemberIds, function(member) {
          if (member !== me.id) {
            // Assert the user was sent an email
            var email = _.find(emails, function(mailData) {
              return (mailData.user.id === member);
            });
            assert.ok(email);

            // Assert that there's some context about the whiteboard in the email
            assert.ok(email.email.subject.indexOf(title) > 0);
            assert.ok(email.email.html.indexOf(title) > 0);
            assert.ok(email.email.html.indexOf(me.canvas_full_name) > 0);
          }
        });

        return done();
      });
    });
  });
};

/**
 * Assert that a whiteboard can not be edited
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard that is being edited
 * @param  {String}             title                           The updated title of the whiteboard
 * @param  {Number[]}           members                         The ids of the users that should be a member of the whiteboard
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertEditWhiteboardFails = module.exports.assertEditWhiteboardFails = function(client, course, id, title, members, code, callback) {
  client.whiteboards.editWhiteboard(course, id, title, members, function(err, whiteboard) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!whiteboard);

    return callback();
  });
};

/**
 * Assert that a whiteboard can be deleted
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard that is being deleted
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertDeleteWhiteboard = module.exports.assertDeleteWhiteboard = function(client, course, id, callback) {
  client.whiteboards.deleteWhiteboard(course, id, function(err) {
    assert.ifError(err);

    return callback();
  });
};

/**
 * Assert that a whiteboard cannot be deleted
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard that is being deleted
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertDeleteWhiteboardFails = module.exports.assertDeleteWhiteboardFails = function(client, course, id, code, callback) {
  client.whiteboards.deleteWhiteboard(course, id, function(err) {
    assert.ok(err);
    assert.strictEqual(err.code, code);

    return callback();
  });
};

/**
 * Assert that a whiteboard can be restored
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard that is being restored
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertRestoreWhiteboard = module.exports.assertRestoreWhiteboard = function(client, course, id, callback) {
  client.whiteboards.restoreWhiteboard(course, id, function(err) {
    assert.ifError(err);

    return callback();
  });
};

/**
 * Assert that a whiteboard cannot be restored
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard that is being restored
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertRestoreWhiteboardFails = module.exports.assertRestoreWhiteboardFails = function(client, course, id, code, callback) {
  client.whiteboards.restoreWhiteboard(course, id, function(err) {
    assert.ok(err);
    assert.strictEqual(err.code, code);

    return callback();
  });
};

/**
 * Assert that a whiteboard can be exported to PNG
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard to export to PNG
 * @param  {Function}           callback                        Standard callback function
 * @param  {Buffer}             callback.data                   The exported whiteboard in PNG format
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertExportWhiteboardToPng = module.exports.assertExportWhiteboardToPng = function(client, course, id, callback) {
  // Get the whiteboard
  assertGetWhiteboard(client, course, id, null, null, function(whiteboard) {

    // Export the whiteboard
    client.whiteboards.exportWhiteboardToPng(course, id, function(err, data, response) {
      assert.ifError(err);

      // Assert a valid Content-Type header is set
      var contentTypeHeader = response.headers['content-type'];
      assert.ok(contentTypeHeader);
      assert.strictEqual(contentTypeHeader, 'image/png');

      // Assert the PNG is served up as a file attachment
      var dispositionRegex = /attachment; filename="[A-Za-z0-9-]+.png/;
      var dispositionHeader = response.headers['content-disposition'];
      assert.ok(dispositionHeader);
      assert.ok(dispositionRegex.test(dispositionHeader));

      // Assert the whiteboard's title is used in the filename
      var title = whiteboard.title.replace(/[^A-Za-z0-9\.]/g, '-');
      assert.notStrictEqual(dispositionHeader.indexOf(title), -1);

      return callback(data);
    });
  });
};

/**
 * Assert that a whiteboard can not be exported to PNG
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard to export to PNG
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertExportWhiteboardToPngFails = module.exports.assertExportWhiteboardToPngFails = function(client, course, id, code, callback) {
  client.whiteboards.exportWhiteboardToPng(course, id, function(err, data, response) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!data);

    return callback();
  });
};

/**
 * Assert that a whiteboard can be exported to an asset
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard to export to an asset
 * @param  {String}             [title]                         The title of the exported whiteboard. Defaults to the whiteboard's title
 * @param  {Object}             [opts]                          A set of optional parameters
 * @param  {Number[]}           [opts.categories]               The ids of the categories to which the whiteboard should be associated
 * @param  {String}             [opts.description]              The description of the whiteboard
 * @param  {Function}           callback                        Standard callback function
 * @param  {Asset}              callback.asset                  The exported whiteboard asset
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertExportWhiteboardToAsset = module.exports.assertExportWhiteboardToAsset = function(client, course, id, title, opts, callback) {
  // Get the assets in the asset library
  AssetsTestsUtil.assertGetAssets(client, course, null, null, null, null, null, function(assets) {

    // Get the whiteboard that is being exported
    assertGetWhiteboard(client, course, id, null, null, function(whiteboard) {

      // Export the whiteboard
      client.whiteboards.exportWhiteboardToAsset(course, id, title, opts, function(err, asset) {
        assert.ifError(err);

        AssetsTestsUtil.assertAsset(asset, {
          'expectedCommentCount': 0,
          'expectComments': true,
          'expectThumbnail': false
        });

        if (title) {
          assert.strictEqual(asset.title, title);
        } else {
          assert.strictEqual(asset.title, whiteboard.title);
        }

        if (_.has(opts, 'description')) {
          assert.strictEqual(asset.description, opts.description);
        }
        if (_.has(opts, 'categories') && !_.isEmpty(opts.categories)) {
          assert.strictEqual(asset.categories.length, opts.categories.length);
          _.each(opts.categories, function(categoryId) {
            assert.ok(_.find(asset.categories, {'id': categoryId}));
          });
        }

        // Verify the whiteboard was added to the asset library
        AssetsTestsUtil.assertGetAssets(client, course, null, null, null, null, assets.total + 1, function(newAssets) {
          assert.strictEqual(newAssets.results[0].type, 'whiteboard');
          AssetsTestsUtil.assertAsset(newAssets.results[0], {
            'expectedAsset': asset,
            'expectedCommentCount': 0,
            'expectComments': false,
            'expectThumbnail': false
          });

          return callback(asset);
        });
      });
    });
  });
};

/**
 * Assert that a whiteboard can not be exported to an asset
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard to export to an asset
 * @param  {String}             [title]                         The title of the exported whiteboard. Defaults to the whiteboard's title
 * @param  {Object}             [opts]                          A set of optional parameters
 * @param  {Number[]}           [opts.categories]               The ids of the categories to which the whiteboard should be associated
 * @param  {String}             [opts.description]              The description of the whiteboard
 * @param  {Number}             code                            The expected HTTP error code
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertExportWhiteboardToAssetFails = module.exports.assertExportWhiteboardToAssetFails = function(client, course, id, title, opts, code, callback) {
  client.whiteboards.exportWhiteboardToAsset(course, id, title, opts, function(err, asset, response) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!asset);

    return callback();
  });
};

/**
 * Assert that a chat message can be created
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard to create a chat message on
 * @param  {String}             body                            The body of the chat message
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertCreateChatMessage = module.exports.assertCreateChatMessage = function(client, course, id, body, callback) {
  UsersTestUtil.assertGetMe(client, course, null, function(me) {
    // TODO: Use the websocket rather than going through the database directly
    var chatMessage = {
      'whiteboard_id': id,
      'user_id': me.id,
      'body': body
    };
    DB.Chat.create(chatMessage).complete(function(err) {
      assert.ifError(err);
      return callback();
    });
  });
};

/**
 * Assert that a whiteboard session can be created
 *
 * @param  {RestClient}         client                          The REST client to make the request with
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             id                              The id of the whiteboard to create a session on
 * @param  {String}             socket_id                       The id of the socket for the session
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertCreateWhiteboardSession = module.exports.assertCreateWhiteboardSession = function(client, course, id, socket_id, callback) {
  UsersTestUtil.assertGetMe(client, course, null, function(me) {
    // TODO: Use the websocket rather than going through the database directly
    var whiteboardSession = {
      'socket_id': socket_id,
      'whiteboard_id': id,
      'user_id': me.id
    };
    DB.WhiteboardSession.upsert(whiteboardSession).complete(function(err) {
      assert.ifError(err);
      return callback();
    });
  });
};
