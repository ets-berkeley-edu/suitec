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
var async = require('async');
var csv = require('fast-csv');
var randomstring = require('randomstring');

var AssetsTestUtil = require('col-assets/tests/util');
var CourseTestUtil = require('col-course/tests/util');
var DB = require('col-core/lib/db');
var EmailUtil = require('col-core/lib/email');
var LtiTestUtil = require('col-lti/tests/util');
var TestsUtil = require('col-tests');
var UsersTestUtil = require('col-users/tests/util');
var WhiteboardsTestUtil = require('col-whiteboards/tests/util');

var ActivitiesDefaults = require('col-activities/lib/default');

/* Activities */

/**
 * Assert that the activities for a course can be exported as a CSV file
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Number}             expectedRows                      The expected number of rows in the CSV export
 * @param  {Function}           callback                          Standard callback function
 * @param  {String}             callback.activities               A CSV export of the activities for the course
 */
var assertExportActivities = module.exports.assertExportActivities = function(client, course, expectedRows, callback) {
  // Get the activity type configuration for the course
  assertGetActivityTypeConfiguration(client, course, function(configuration) {

    client.activities.exportActivities(course, function(err, activities, response) {
      assert.ifError(err);

      // Assert the correct filename is returned
      assert.ok(response.headers['content-disposition']);
      var headerRegex = /attachment; filename="engagement_index_activities_[0-9]+_[0-9]{4}_[0-9]{2}_[0-9]{2}_[0-9]{2}_[0-9]{2}.csv/;
      assert.ok(headerRegex.test(response.headers['content-disposition']));

      // If no rows are expected to be returned, the response should be empty
      if (expectedRows === 0) {
        assert.ok(!activities);
        return callback();
      } else {
        // Parse the CSV file
        var rows = [];
        csv.fromString(activities, {'headers': true})
        .on('data', function(exportActivity) {

          // Ensure that all expected properties are present
          assert.ok(exportActivity.user_id);
          assert.ok(exportActivity.user_name);
          assert.ok(exportActivity.action);
          assert.ok(exportActivity.date);
          assert.ok(exportActivity.score);
          assert.ok(exportActivity.running_total);

          // Ensure that the score has the expected value
          var expectedScore = _.find(configuration, {'type': exportActivity.action}).points;
          assert.strictEqual(parseInt(exportActivity.score, 10), expectedScore);

          rows.push(exportActivity);
        }).on('end', function() {
          assert.strictEqual(rows.length, expectedRows);
          return callback(rows);
        });
      }
    });
  });
};

/**
 * Assert that the activities for a course can not be exported as a CSV file
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Number}             code                              The expected HTTP error code
 * @param  {Function}           callback                          Standard callback function
 */
var assertExportActivitiesFails = module.exports.assertExportActivitiesFails = function(client, course, code, callback) {
  client.activities.exportActivities(course, function(err, activities) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!activities);

    return callback();
  });
};

/**
 * Assert that an activity has increased the points for a user by the expected amount
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Me}                 originalMe                        The me object before the activity took place
 * @param  {Number}             expectedIncrease                  The expected increase in points for the user
 * @param  {Boolean}            expectLastActivityUpdate          Whether the last activity timestamp is expected to be updated
 * @param  {Function}           callback                          Standard callback function
 * @api private
 */
var assertPoints = function(client, course, originalMe, expectedIncrease, expectLastActivityUpdate, callback) {
  // Verify that the points for the user have increased as expected
  UsersTestUtil.assertGetMe(client, course, null, function(me) {
    var expectedPoints = originalMe.points + expectedIncrease;
    assert.strictEqual(me.points, expectedPoints);
    if (expectLastActivityUpdate) {
      assert.ok(me.last_activity);
      if (!_.isNull(originalMe.last_activity)) {
        assert.ok(me.last_activity > originalMe.last_activity);
      }
    } else {
      assert.strictEqual(me.last_activity, originalMe.last_activity);
    }

    // Ensure that the user is sharing their points with the course
    UsersTestUtil.assertUpdateSharePoints(client, course, true, function(me) {
      assert.strictEqual(me.points, expectedPoints);
      if (expectLastActivityUpdate) {
        assert.ok(me.last_activity);
        if (!_.isNull(originalMe.last_activity)) {
          assert.ok(me.last_activity > originalMe.last_activity);
        }
      } else {
        assert.strictEqual(me.last_activity, originalMe.last_activity);
      }

      // Verify that the points are reflected in the list of users
      UsersTestUtil.assertGetLeaderboard(client, course, null, false, function(users) {
        var user = _.find(users, {'id': me.id});
        assert.strictEqual(user.points, expectedPoints);
        if (expectLastActivityUpdate) {
          assert.ok(user.last_activity);
          if (!_.isNull(originalMe.last_activity)) {
            assert.ok(user.last_activity > originalMe.last_activity);
          }
        } else {
          assert.strictEqual(user.last_activity, originalMe.last_activity);
        }

        return callback();
      });
    });
  });
};

/**
 * Assert that a new link asset can be created and activity points are earned
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {String}             title                             The title of the link
 * @param  {String}             url                               The url of the link
 * @param  {Object}             [opts]                            A set of optional parameters
 * @param  {Number[]}           [opts.categories]                 The ids of the categories to which the link should be associated
 * @param  {String}             [opts.description]                The description of the link
 * @param  {String}             [opts.source]                     The source of the link
 * @param  {Function}           callback                          Standard callback function
 * @param  {Asset}              callback.asset                    The created link asset
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertCreateLinkActivity = module.exports.assertCreateLinkActivity = function(client, course, title, url, opts, callback) {
  // Get the points that are earned when creating a new link asset
  assertGetActivityTypeConfiguration(client, course, function(configuration) {
    var activityPoints = _.find(configuration, {'type': 'add_asset'}).points;

    // Get the me object for the current user
    UsersTestUtil.assertGetMe(client, course, null, function(me) {
      // Create the link asset
      AssetsTestUtil.assertCreateLink(client, course, title, url, opts, function(asset) {
        // Verify that the points for the user have increased
        assertPoints(client, course, me, activityPoints, true, function() {

          return callback(asset);
        });
      });
    });
  });
};

/**
 * Assert that a hidden link asset can be created and no activity points are earned
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {String}             title                             The title of the link
 * @param  {String}             url                               The url of the link
 * @param  {Function}           callback                          Standard callback function
 * @param  {Asset}              callback.asset                    The created link asset
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertCreateHiddenLink = module.exports.assertCreateHiddenLink = function(client, course, title, url, callback) {
  // Get the me object for the current user
  UsersTestUtil.assertGetMe(client, course, null, function(me) {
    // Create the hidden link asset
    var opts = {
      'visible': false
    };
    AssetsTestUtil.assertCreateLink(client, course, title, url, opts, function(asset) {
      // Verify that the points for the user have not increased and no activity is logged
      assertPoints(client, course, me, 0, false, function() {

        return callback(asset);
      });
    });
  });
};

/**
 * Assert that a whiteboard can be exported to an asset and activity points are earned
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
var assertExportWhiteboardToAssetActivity = module.exports.assertExportWhiteboardToAssetActivity = function(client, course, id, title, opts, callback) {
  // Get the points that are earned when exporting a whiteboard to an asset
  assertGetActivityTypeConfiguration(client, course, function(configuration) {
    var activityPoints = _.find(configuration, {'type': 'export_whiteboard'}).points;

    // Get all the collaborators of the board
    WhiteboardsTestUtil.assertGetWhiteboard(client, course, id, null, null, function(whiteboard) {

      // Get the leaderboard for the course so we can verify whether each collaborator's
      // points total increased after exporting the whiteboard to an asset
      var instructor = TestsUtil.generateInstructor();
      TestsUtil.getAssetLibraryClient(null, course, instructor, function(instructorClient, course, instructor) {
        UsersTestUtil.assertGetLeaderboard(instructorClient, course, null, true, function(oldLeaderboard) {

          // Export the board
          WhiteboardsTestUtil.assertExportWhiteboardToAsset(client, course, whiteboard.id, null, null, function(asset) {

            // Get the new leaderboard
            UsersTestUtil.assertGetLeaderboard(instructorClient, course, null, true, function(newLeaderboard) {

              // Verify that the points for each collaborator have increased
              _.each(whiteboard.members, function(member) {
                var oldPoints = _.find(oldLeaderboard, {'id': member.id}).points;
                var newPoints = _.find(newLeaderboard, {'id': member.id}).points;
                assert.strictEqual(newPoints, oldPoints + activityPoints);
              });

              return callback(asset);
            });
          });
        });
      });
    });
  });
};

/**
 * Assert that an asset can be commented on and activity points are earned
 *
 * @param  {RestClient}         commenterClient                 The REST client representing the user commenting on the asset
 * @param  {RestClient[]}       creatorClients                  The REST clients representing the users that created the asset
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             assetId                         The id of the asset that is commented on
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertCreateCommentActivity = module.exports.assertCreateCommentActivity = function(commenterClient, creatorClients, course, assetId, callback) {
  // Get the points that are earned when commenting on an asset
  assertGetActivityTypeConfiguration(commenterClient, course, function(configuration) {
    var assetCommentPoints = _.find(configuration, {'type': 'asset_comment'}).points;
    var getAssetCommentPoints = _.find(configuration, {'type': 'get_asset_comment'}).points;
    var getAssetCommentReplyPoints = _.find(configuration, {'type': 'get_asset_comment_reply'}).points;
    var assetCommentImpact = _.find(configuration, {'type': 'asset_comment'}).impact;

    // Get the me object for the various users
    UsersTestUtil.assertGetMe(commenterClient, course, null, function(commenterMe) {
      getMeObjects(creatorClients, course, function(creatorMeObjects) {

        // Get the asset that is being commented on
        AssetsTestUtil.assertGetAsset(commenterClient, course, assetId, null, null, function(asset) {

          // Get the asset's initial impact score from the database
          AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
            var initialImpactScore = dbAsset.impact_score;

            // Comment on the asset and get the updated impact score
            AssetsTestUtil.assertCreateComment(commenterClient, course, assetId, 'My special comment', null, function(comment) {
              AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
                var updatedImpactScore = dbAsset.impact_score;

                // A commenter who creates a top-level comment on their own asset
                if (_.find(creatorMeObjects, {'id': commenterMe.id})) {
                  // Impact score should not change
                  assert.strictEqual(updatedImpactScore, initialImpactScore);
                  assertPoints(commenterClient, course, commenterMe, 0, false, callback);

                // A commenter who creates a top-level comment on another user's asset
                } else {
                  // Impact score should increment
                  assert.strictEqual(updatedImpactScore, initialImpactScore + assetCommentImpact);
                  assertPoints(commenterClient, course, commenterMe, assetCommentPoints, true, function() {
                    var done = _.after(creatorClients.length, callback);
                    _.each(creatorMeObjects, function(creatorMe, i) {
                      assertPoints(creatorClients[i], course, creatorMe, getAssetCommentPoints, false, done);
                    });
                  });
                }
              });
            });
          });
        });
      });
    });
  });
};

/**
 * Assert that activities for a user can be retrieved
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Number}             userId                            The SuiteC id of the user for which activities are requested
 * @param  {Function}           callback                          Standard callback function
 * @param  {Object}             callback.activities               The returned activities, grouped by type
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertGetActivitiesForUserId = module.exports.assertGetActivitiesForUserId = function(client, course, userId, callback) {
  client.activities.getActivitiesForUserId(course, userId, function(err, activities, response) {
    assert.ifError(err);

    return callback(activities);
  });
};

/**
 * Assert that activities for a user cannot be retrieved
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Number}             userId                            The SuiteC id of the user for which activities are requested
 * @param  {Number}             code                              The expected HTTP error code
 * @param  {Function}           callback                          Standard callback function
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertGetActivitiesForUserIdFails = module.exports.assertGetActivitiesForUserIdFails = function(client, course, userId, code, callback) {
  client.activities.getActivitiesForUserId(course, userId, function(err, activities, response) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!activities);

    return callback();
  });
};

/**
 * Assert that activities for an asset can be retrieved
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Number}             assetId                           The id of the asset for which activities are requested
 * @param  {Function}           callback                          Standard callback function
 * @param  {Object}             callback.activities               The returned activities, grouped by type
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertGetActivitiesForAssetId = module.exports.assertGetActivitiesForAssetId = function(client, course, assetId, callback) {
  client.activities.getActivitiesForAssetId(course, assetId, function(err, activities, response) {
    assert.ifError(err);

    return callback(activities);
  });
};

/**
 * Assert that activities for an asset cannot be retrieved
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Number}             assetId                           The id of the asset for which activities are requested
 * @param  {Number}             code                              The expected HTTP error code
 * @param  {Function}           callback                          Standard callback function
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertGetActivitiesForAssetIdFails = module.exports.assertGetActivitiesForAssetIdFails = function(client, course, assetId, code, callback) {
  client.activities.getActivitiesForAssetId(course, assetId, function(err, activities, response) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!activities);

    return callback();
  });
};

/**
 * Assert that interaction data for a course can be retrieved
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Function}           callback                          Standard callback function
 * @param  {Object}             callback.interactions             The returned interaction data
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertGetInteractions = module.exports.assertGetInteractions = function(client, course, callback) {
  client.activities.getInteractions(course, function(err, interactions, response) {
    assert.ifError(err);

    return callback(interactions);
  });
};

/**
 * Get the me objects for a set of REST clients
 *
 * @param  {RestClient[]}   clients     The REST clients for which to get the me objects
 * @param  {Course}         course      The Canvas course in which the clients are interacting with the API
 * @param  {Function}       callback    Standard callback function
 */
var getMeObjects = function(clients, course, callback) {
  var meObjects = [];

  // Ensure that the me objects are returned in the same order as the corresponding clients
  async.eachSeries(clients, function(client, done) {
    UsersTestUtil.assertGetMe(client, course, null, function(me) {
      meObjects.push(me);
      return done();
    });
  }, function() {
    return callback(meObjects);
  });
};

/**
 * Assert that a reply can be made on an asset comment and activity points are earned
 *
 * @param  {RestClient}         commenterClient                 The REST client representing the user commenting on the asset
 * @param  {RestClient[]}       creatorClients                  The REST clients representing the users that created the asset
 * @param  {RestClient}         parentClient                    The REST client representing the user that created the parent comment
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             assetId                         The id of the asset that is commented on
 * @param  {Number}             parentId                        The id of the parent comment
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertCreateReplyActivity = module.exports.assertCreateReplyActivity = function(commenterClient, creatorClients, parentClient, course, assetId, parentId, callback) {
  // Get the points that are earned when commenting on an asset
  assertGetActivityTypeConfiguration(commenterClient, course, function(configuration) {
    var assetCommentPoints = _.find(configuration, {'type': 'asset_comment'}).points;
    var getAssetCommentPoints = _.find(configuration, {'type': 'get_asset_comment'}).points;
    var getAssetCommentReplyPoints = _.find(configuration, {'type': 'get_asset_comment_reply'}).points;
    var assetCommentImpact = _.find(configuration, {'type': 'asset_comment'}).impact;

    // Get the me object for the various users
    UsersTestUtil.assertGetMe(commenterClient, course, null, function(commenterMe) {
      getMeObjects(creatorClients, course, function(creatorMeObjects) {
        UsersTestUtil.assertGetMe(parentClient, course, null, function(parentMe) {

          // Get the asset that is being commented on
          AssetsTestUtil.assertGetAsset(commenterClient, course, assetId, null, null, function(asset) {

            // Get the asset's initial impact score from the database
            AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
              var initialImpactScore = dbAsset.impact_score;

              // Comment on the asset and get the updated impact score
              AssetsTestUtil.assertCreateComment(commenterClient, course, assetId, 'My special comment', parentId, function(comment) {
                AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
                  var updatedImpactScore = dbAsset.impact_score;

                  var commenterIsCreator = _.find(creatorMeObjects, {'id': commenterMe.id});
                  var parentCommenterIsCreator = _.find(creatorMeObjects, {'id': parentMe.id});

                  // A commenter who replies to their own comment on their own asset
                  if (commenterIsCreator && commenterMe.id === parentMe.id) {
                    // Impact score should not change
                    assert.strictEqual(updatedImpactScore, initialImpactScore);
                    assertPoints(commenterClient, course, commenterMe, 0, false, callback);

                  // A commenter who replies to a comment of someone else on their own asset
                  } else if (commenterIsCreator && commenterMe.id !== parentMe.id) {
                    assertPoints(commenterClient, course, commenterMe, assetCommentPoints + getAssetCommentPoints, true, function() {
                      var expectedIncrease = getAssetCommentReplyPoints;

                      // Impact score should increment
                      assert.strictEqual(updatedImpactScore, initialImpactScore + assetCommentImpact);

                      // If the parent commenter is also an asset owner, points should be added for getting
                      // a comment on the asset
                      if (parentCommenterIsCreator) {
                        expectedIncrease += getAssetCommentPoints;
                      }

                      assertPoints(parentClient, course, parentMe, expectedIncrease, false, callback);
                    });

                  // A commenter who replies to their own comment on another user's asset
                  } else if (!commenterIsCreator && commenterMe.id === parentMe.id) {

                    // Impact score should increment
                    assert.strictEqual(updatedImpactScore, initialImpactScore + assetCommentImpact);

                    assertPoints(commenterClient, course, commenterMe, assetCommentPoints, true, function() {
                      var done = _.after(creatorClients.length, callback);
                      _.each(creatorMeObjects, function(creatorMe, i) {
                        assertPoints(creatorClients[i], course, creatorMe, getAssetCommentPoints, false, done);
                      });
                    });

                  // A commenter who replies to a comment of a user on another user's asset where the asset
                  // creator is the same user as the parent commenter
                  } else if (!commenterIsCreator && commenterMe.id !== parentMe.id && parentCommenterIsCreator) {

                    // Impact score should increment
                    assert.strictEqual(updatedImpactScore, initialImpactScore + assetCommentImpact);

                    assertPoints(commenterClient, course, commenterMe, assetCommentPoints, true, function() {
                      assertPoints(parentClient, course, parentMe, getAssetCommentReplyPoints + getAssetCommentPoints, false, callback);
                    });

                  // A commenter who replies to a comment of a user on another user's asset where the asset
                  // creator is different from the parent commenter
                  } else if (!commenterIsCreator && commenterMe.id !== parentMe.id && !parentCommenterIsCreator) {

                    // Impact score should increment
                    assert.strictEqual(updatedImpactScore, initialImpactScore + assetCommentImpact);

                    assertPoints(commenterClient, course, commenterMe, assetCommentPoints, true, function() {
                      assertPoints(parentClient, course, parentMe, getAssetCommentReplyPoints, false, function() {
                        var done = _.after(creatorClients.length, callback);
                        _.each(creatorMeObjects, function(creatorMe, i) {
                          assertPoints(creatorClients[i], course, creatorMe, getAssetCommentPoints, false, done);
                        });
                      });
                    });
                  }
                });
              });
            });
          });
        });
      });
    });
  });
};

/**
 * Assert that a comment can be deleted and activity points are adjusted
 *
 * @param  {RestClient}         commenterClient                 The REST client representing the user deleting the comment
 * @param  {RestClient}         creatorClient                   The REST client representing the user that owns the asset
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             assetId                         The id of the asset on which the comment is removed
 * @param  {Number}             commentId                       The id of the comment that will be deleted
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertDeleteCommentActivity = module.exports.assertDeleteCommentActivity = function(commenterClient, creatorClient, course, assetId, commentId, callback) {
  // Get the points and impact score that are earned when commenting on an asset
  assertGetActivityTypeConfiguration(commenterClient, course, function(configuration) {
    var assetCommentPoints = _.find(configuration, {'type': 'asset_comment'}).points;
    var getAssetCommentPoints = _.find(configuration, {'type': 'get_asset_comment'}).points;
    var assetCommentImpact = _.find(configuration, {'type': 'asset_comment'}).impact;

    // Get the me object for both users
    UsersTestUtil.assertGetMe(commenterClient, course, null, function(commenterMe) {
      UsersTestUtil.assertGetMe(creatorClient, course, null, function(creatorMe) {

        // Get the asset's initial impact score from the database
        AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
          var initialImpactScore = dbAsset.impact_score;

          // Delete the comment and get the updated impact score
          AssetsTestUtil.assertDeleteComment(commenterClient, course, assetId, commentId, function() {
            AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
              var updatedImpactScore = dbAsset.impact_score;

              // Verify the points are adjusted
              // A commenter who deletes their comment on their own asset
              if (commenterMe.id === creatorMe.id) {
                // Impact score should not change
                assert.strictEqual(updatedImpactScore, initialImpactScore);

                assertPoints(commenterClient, course, commenterMe, 0, false, callback);

              // A comment who deletes their comment on another user's asset
              } else {
                // Impact score should decrement
                assert.strictEqual(updatedImpactScore, initialImpactScore - assetCommentImpact);

                assertPoints(commenterClient, course, commenterMe, -1 * assetCommentPoints, false, function() {
                  assertPoints(creatorClient, course, creatorMe, -1 * getAssetCommentPoints, false, callback);
                });
              }
            });
          });
        });
      });
    });
  });
};

/**
 * Assert that a comment can be deleted and activity points are adjusted
 *
 * @param  {RestClient}         commenterClient                 The REST client representing the user deleting the comment
 * @param  {RestClient}         creatorClient                   The REST client representing the user that owns the asset
 * @param  {RestClient}         parentClient                    The REST client representing the user that made the parent comment
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             assetId                         The id of the asset on which the comment is removed
 * @param  {Number}             commentId                       The id of the comment that will be deleted
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertDeleteReplyActivity = module.exports.assertDeleteReplyActivity = function(commenterClient, creatorClient, parentClient, course, assetId, commentId, callback) {
  // Get the points and impact score that are earned when commenting on an asset
  assertGetActivityTypeConfiguration(commenterClient, course, function(configuration) {
    var assetCommentPoints = _.find(configuration, {'type': 'asset_comment'}).points;
    var getAssetCommentPoints = _.find(configuration, {'type': 'get_asset_comment'}).points;
    var getAssetCommentReplyPoints = _.find(configuration, {'type': 'get_asset_comment_reply'}).points;
    var assetCommentImpact = _.find(configuration, {'type': 'asset_comment'}).impact;

    // Get the me object for all users
    UsersTestUtil.assertGetMe(commenterClient, course, null, function(commenterMe) {
      UsersTestUtil.assertGetMe(creatorClient, course, null, function(creatorMe) {
        UsersTestUtil.assertGetMe(parentClient, course, null, function(parentMe) {

          // Get the asset that the reply is deleted from
          AssetsTestUtil.assertGetAsset(commenterClient, course, assetId, null, null, function(asset) {

            // Get the asset's initial impact score from the database
            AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
              var initialImpactScore = dbAsset.impact_score;

              // Delete the reply and get the updated impact score
              AssetsTestUtil.assertDeleteComment(commenterClient, course, assetId, commentId, function() {
                AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
                  var updatedImpactScore = dbAsset.impact_score;

                  // A commenter who deletes a reply on their own comment on their own asset
                  if (commenterMe.id === creatorMe.id && commenterMe.id === parentMe.id) {
                    // Impact score should not change
                    assert.strictEqual(updatedImpactScore, initialImpactScore);
                    assertPoints(commenterClient, course, commenterMe, 0, false, callback);

                  // A commenter who deletes a reply to a comment of someone else on their own asset
                  } else if (commenterMe.id === creatorMe.id && commenterMe.id !== parentMe.id) {
                    // Impact score should decrement
                    assert.strictEqual(updatedImpactScore, initialImpactScore - assetCommentImpact);
                    assertPoints(commenterClient, course, commenterMe, -1 * (assetCommentPoints + getAssetCommentPoints), false, function() {
                      assertPoints(parentClient, course, parentMe, -1 * getAssetCommentReplyPoints, false, callback);
                    });

                  // A commenter who deleted a reply to their own comment on another user's asset
                  } else if (commenterMe.id !== creatorMe.id && commenterMe.id === parentMe.id) {
                    // Impact score should decrement
                    assert.strictEqual(updatedImpactScore, initialImpactScore - assetCommentImpact);
                    // Commenter activity timestamp is incremented for the 'view' activity; creator activity timestamp is not.
                    assertPoints(commenterClient, course, commenterMe, -1 * assetCommentPoints, true, function() {
                      assertPoints(creatorClient, course, creatorMe, -1 * getAssetCommentPoints, false, callback);
                    });

                  // A commenter who deletes a reply to a comment of another user on another user's asset where the asset
                  // creator is the same user as the parent commenter
                  } else if (commenterMe.id !== creatorMe.id && commenterMe.id !== parentMe.id && parentMe.id === creatorMe.id) {
                    // Impact score should decrement
                    assert.strictEqual(updatedImpactScore, initialImpactScore - assetCommentImpact);
                    // Commenter activity timestamp is incremented for the 'view' activity; creator activity timestamp is not.
                    assertPoints(commenterClient, course, commenterMe, -1 * assetCommentPoints, true, function() {
                      assertPoints(parentClient, course, parentMe, -1 * (getAssetCommentReplyPoints + getAssetCommentPoints), false, callback);
                    });

                  // A commenter who deletes a reply to a comment of another user on another user's asset where the asset
                  // creator is different from the parent commenter
                  } else if (commenterMe.id !== creatorMe.id && commenterMe.id !== parentMe.id && parentMe.id !== creatorMe.id) {
                    // Impact score should decrement
                    assert.strictEqual(updatedImpactScore, initialImpactScore - assetCommentImpact);
                    // Commenter activity timestamp is incremented for the 'view' activity; creator activity timestamp is not.
                    assertPoints(commenterClient, course, commenterMe, -1 * assetCommentPoints, true, function() {
                      assertPoints(parentClient, course, parentMe, -1 * getAssetCommentReplyPoints, false, function() {
                        assertPoints(creatorClient, course, creatorMe, -1 * getAssetCommentPoints, false, callback);
                      });
                    });
                  }
                });
              });
            });
          });
        });
      });
    });
  });
};

/**
 * Assert that an asset can be liked or disliked and activity points are earned
 *
 * @param  {RestClient}         likerClient                     The REST client representing the user liking or disliking the asset
 * @param  {RestClient}         creatorClient                   The REST client representing the user that created the asset
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             assetId                         The id of the asset that is liked or disliked
 * @param  {Boolean}            [like]                          `true` when the asset should be liked, `false` when the asset should be disliked. When `null` is provided, the previous like or dislike will be undone
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertLikeActivity = module.exports.assertLikeActivity = function(likerClient, creatorClient, course, assetId, like, callback) {
  // Get the points and impact score that are earned when liking or disliking an asset
  assertGetActivityTypeConfiguration(likerClient, course, function(configuration) {
    var likePoints = _.find(configuration, {'type': 'like'}).points;
    var dislikePoints = _.find(configuration, {'type': 'dislike'}).points;
    var getLikePoints = _.find(configuration, {'type': 'get_like'}).points;
    var getDislikePoints = _.find(configuration, {'type': 'get_dislike'}).points;
    var likeImpact = _.find(configuration, {'type': 'like'}).impact;
    var viewImpact = _.find(configuration, {'type': 'view_asset'}).impact;

    // Get the me object for the user liking or disliking the asset
    UsersTestUtil.assertGetMe(likerClient, course, null, function(likerMe) {
      // Get the me object for the user that created the asset
      UsersTestUtil.assertGetMe(creatorClient, course, null, function(creatorMe) {

        // Get the asset that is being liked or disliked
        AssetsTestUtil.assertGetAsset(likerClient, course, assetId, null, null, function(asset) {

          // Get the asset's initial impact score from the database
          AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
            var initialImpactScore = dbAsset.impact_score;

            // Like or dislike the asset and get the updated impact score
            AssetsTestUtil.assertLike(likerClient, course, asset.id, like, function() {
              AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
                var updatedImpactScore = dbAsset.impact_score;

                // The asset was not liked or disliked before
                if (asset.liked === null) {
                  // No point changes are expected
                  if (like === null) {
                    // Impact score increments for views but not likes
                    assert.strictEqual(updatedImpactScore, initialImpactScore + (2 * viewImpact));
                    // The liker client has an updated timestamp from the view activity, but no updated points
                    assertPoints(likerClient, course, likerMe, 0, true, function() {
                      // The creator client has no updated points or timestamp
                      assertPoints(creatorClient, course, creatorMe, 0, false, callback);
                    });
                  // Points for liking are expected to be rewarded to the user liking and the user receiving the like
                  } else if (like === true) {
                    // Impact score increments for views and likes
                    assert.strictEqual(updatedImpactScore, initialImpactScore + (2 * viewImpact) + likeImpact);
                    assertPoints(likerClient, course, likerMe, likePoints, true, function() {
                      assertPoints(creatorClient, course, creatorMe, getLikePoints, false, callback);
                    });
                  // Points for disliking are expected to be rewarded to the user disliking and the user receiving the dislike
                  } else if (like === false) {
                    assertPoints(likerClient, course, likerMe, dislikePoints, true, function() {
                      assertPoints(creatorClient, course, creatorMe, getDislikePoints, false, callback);
                    });
                  }
                // The asset was liked before
                } else if (asset.liked === true) {
                  // Points for liking are expected to be removed from the user that liked and the user that received the like
                  if (like === null) {
                    // Impact score is incremented for views but the like is decremented
                    assert.strictEqual(updatedImpactScore, initialImpactScore + (2 * viewImpact) - likeImpact);
                    // The liker client has an updated timestamp from the view activity, but no updated points
                    assertPoints(likerClient, course, likerMe, -likePoints, true, function() {
                      // The creator client has no updated points or timestamp
                      assertPoints(creatorClient, course, creatorMe, -getLikePoints, false, callback);
                    });
                  // No point changes are expected
                  } else if (like === true) {
                    // Impact score increments for views but not likes
                    assert.strictEqual(updatedImpactScore, initialImpactScore + (2 * viewImpact));
                    assertPoints(likerClient, course, likerMe, 0, true, function() {
                      assertPoints(creatorClient, course, creatorMe, 0, false, callback);
                    });
                  // Points for liking are expected to be removed from the user that liked and the user that received the like
                  // and points for disliking are expected to be rewarded to the user disliking and the user receiving the dislike
                  } else if (like === false) {
                    assertPoints(likerClient, course, likerMe, dislikePoints - likePoints, true, function() {
                      assertPoints(creatorClient, course, creatorMe, getDislikePoints - getLikePoints, false, callback);
                    });
                  }
                // The asset was disliked before
                } else if (asset.liked === false) {
                  // Points for disliking are expected to be removed from the user that disliked and the user that received the dislike
                  if (like === null) {
                    // The liker client has an updated timestamp from the view activity, but no updated points
                    assertPoints(likerClient, course, likerMe, -dislikePoints, true, function() {
                      // The creator client has no updated points or timestamp
                      assertPoints(creatorClient, course, creatorMe, -getDislikePoints, false, callback);
                    });
                  // Points for disliking are expected to be removed from the user that disliked and the user that received the dislike
                  // and points for liking are expected to be rewarded to the user liking and the user receiving the like
                  } else if (like === true) {
                    assertPoints(likerClient, course, likerMe, likePoints - dislikePoints, true, function() {
                      assertPoints(creatorClient, course, creatorMe, getLikePoints - getDislikePoints, false, callback);
                    });
                  // No point changes are expected
                  } else if (like === false) {
                    assertPoints(likerClient, course, likerMe, 0, true, function() {
                      assertPoints(creatorClient, course, creatorMe, 0, false, callback);
                    });
                  }
                }
              });
            });
          });
        });
      });
    });
  });
};

/**
 * Assert that an asset can be viewed and activity points are earned
 *
 * @param  {RestClient}         viewerClient                    The REST client representing the user viewing the asset
 * @param  {RestClient}         creatorClient                    The REST client representing the user that created the asset
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             assetId                         The id of the viewed asset
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertViewAssetActivity = module.exports.assertViewAssetActivity = function(viewerClient, creatorClient, course, assetId, callback) {
  // Get the points and impact score that are earned when viewing an asset
  assertGetActivityTypeConfiguration(viewerClient, course, function(configuration) {
    var viewPoints = _.find(configuration, {'type': 'view_asset'}).points;
    var getViewPoints = _.find(configuration, {'type': 'get_view_asset'}).points;
    var viewImpact = _.find(configuration, {'type': 'view_asset'}).impact;

    // Get the me object for the user viewing the asset
    UsersTestUtil.assertGetMe(viewerClient, course, null, function(viewerMe) {
      // Get the me object for the asset creator
      UsersTestUtil.assertGetMe(creatorClient, course, null, function(creatorMe) {

        // Get the asset's initial impact score from the database
        AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
          var initialImpactScore = dbAsset.impact_score;

          // View the asset and get the updated impact score
          AssetsTestUtil.assertGetAsset(viewerClient, course, assetId, null, null, function(asset) {
            AssetsTestUtil.getDbAsset(assetId, function(dbAsset) {
              var updatedImpactScore = dbAsset.impact_score;

              // If viewer is among asset creators
              if (_.find(asset.users, {'id': viewerMe.id})) {
                // Asset recieves no impact score
                assert.strictEqual(updatedImpactScore, initialImpactScore);
                // Viewer's points are not changed and last_activity timestamp is not updated
                assertPoints(viewerClient, course, viewerMe, 0, false, function() {
                  // Creator's points are not changed and last_activity timestamp is not updated
                  assertPoints(creatorClient, course, creatorMe, 0, false, callback);
                });

              // If viewer is not among asset creators
              } else {
                // Asset recieves impact score
                assert.strictEqual(updatedImpactScore, initialImpactScore + viewImpact);
                // Viewer's points are changed (or not changed if viewPoints is 0) and last_activity timestamp is updated
                assertPoints(viewerClient, course, viewerMe, viewPoints, true, function() {
                  // Creator's points are changed (or not changed if getViewPoints is 0) and last_activity timestamp is not updated
                  assertPoints(creatorClient, course, creatorMe, getViewPoints, false, callback);
                });
              }
            });
          });
        });
      });
    });
  });
};

/**
 * Assert that a whiteboard can be remixed and activity points are earned
 *
 * @param  {RestClient}         remixerClient                   The REST client representing the user viewing the asset
 * @param  {Course}             course                          The Canvas course in which the user is interacting with the API
 * @param  {Number}             exportedWhiteboard              The exported whiteboard asset
 * @param  {Function}           callback                        Standard callback function
 * @throws {AssertionError}                                     Error thrown when an assertion failed
 */
var assertRemixWhiteboardActivities = module.exports.assertRemixWhiteboardActivities = function(remixerClient, course, exportedWhiteboard, callback) {
  // Get the points and impact score earned when remixing a whitebaord
  assertGetActivityTypeConfiguration(remixerClient, course, function(configuration) {
    var remixPoints = _.find(configuration, {'type': 'remix_whiteboard'}).points;
    var getRemixPoints = _.find(configuration, {'type': 'get_remix_whiteboard'}).points;
    var remixImpact = _.find(configuration, {'type': 'remix_whiteboard'}).impact;

    // Get the me object for the user remixing the asset
    UsersTestUtil.assertGetMe(remixerClient, course, null, function(remixerMe) {

      // Get the whiteboard asset's initial impact score from the database
      AssetsTestUtil.getDbAsset(exportedWhiteboard.id, function(dbAsset) {
        var initialImpactScore = dbAsset.impact_score;

        // Remix the exported whiteboard and get the updated impact score
        AssetsTestUtil.assertRemixWhiteboard(remixerClient, course, exportedWhiteboard, function() {
          AssetsTestUtil.getDbAsset(exportedWhiteboard.id, function(dbAsset) {
            var updatedImpactScore = dbAsset.impact_score;

            // If remixer is among asset creators
            if (_.find(exportedWhiteboard.users, {'id': remixerMe.id})) {
              // Asset recieves no impact score
              assert.strictEqual(updatedImpactScore, initialImpactScore);
              // Remixer gets no points for performing the remix and no activity is created
              assertPoints(remixerClient, course, remixerMe, 0, false, callback);

            // If remixer is not among asset creators
            } else {
              // The asset's impact score is incremented only once although there are multiple creators
              assert.strictEqual(updatedImpactScore, initialImpactScore + remixImpact);
              // Remixer's points are changed (or not changed if remixPoints is 0) and last_activity timestamp is updated
              assertPoints(remixerClient, course, remixerMe, remixPoints, true, callback);
            }
          });
        });
      });
    });
  });
};

/**
 * Assert that per-asset activities are well-formed and have the expected counts per type
 *
 * @param  {Object}            activities                          Activities grouped by type
 * @param  {Object}            expectedActivityCounts              Expected activity counts by type
 * @throws {AssertionError}                                        Error thrown when an assertion failed
 */
var assertAssetActivities = module.exports.assertAssetActivities = function(activities, expectedActivityCounts) {
  _.each(activities, function(activitySeries, type) {
    if (expectedActivityCounts[type]) {
      assert.strictEqual(activitySeries.length, expectedActivityCounts[type]);
      _.each(activitySeries, function(activity) {
        // Activities should have basic metadata
        assert.ok(activity.id);
        assert.ok(activity.date);

        // Activities should have user data
        assert.ok(activity.user.id);
        assert.ok(activity.user.canvas_full_name);
        assert.ok(activity.user.canvas_image);

        // Only comment activities should include comments
        if (activity.type === 'asset_comment') {
          assert.ok(activity.comment.id);
          assert.ok(activity.comment.body);
        } else {
          assert.ok(!activity.comment);
        }
      });
    } else {
      assert.strictEqual(activitySeries.length, 0);
    }
  });
};

/**
 * Assert that per-user activities are well-formed and have the expected counts per type
 *
 * @param  {Object}            activities                          Activities grouped by type
 * @param  {Object}            user                                The user object for which activities were requested
 * @param  {Object}            expectedActivityCounts              Expected activity counts by type
 * @throws {AssertionError}                                        Error thrown when an assertion failed
 */
var assertUserActivities = module.exports.assertUserActivities = function(activities, user, expectedActivityCounts) {
  _.each([
    'actions.creations',
    'actions.interactions',
    'actions.engagements',
    'impacts.creations',
    'impacts.interactions',
    'impacts.engagements'
  ], function(activityType) {
    var activitySeries = _.get(activities, activityType);
    if (expectedActivityCounts[activityType]) {
      assert.strictEqual(activitySeries.length, expectedActivityCounts[activityType]);
      _.each(activitySeries, function(activity) {
        // Activities should have basic metadata
        assert.ok(activity);
        assert.ok(activity.id);
        assert.ok(activity.date);
        assert.ok(activity.type);

        // Activities should have user data
        assert.ok(activity.user.id);
        assert.ok(activity.user.canvas_full_name);
        assert.ok(activity.user.canvas_image);

        // 'Actions' should be associated with the user for whom activity was requested
        if (activityType.startsWith('actions')) {
          assert.strictEqual(activity.user.id, user.me.id);
        // 'Impacts' should be associated with other users
        } else {
          assert.notEqual(activity.user.id, user.me.id);
        }

        // Activities should have asset data
        assert.ok(activity.asset.id);
        assert.ok(activity.asset.title);
        // Without the preview service assets will have no thumbnails, but the property should be included
        assert.ok(activity.asset.hasOwnProperty('thumbnail_url'));

        // Only comment activities should include comments
        if (activity.type === 'asset_comment' || activity.type === 'get_asset_comment' || activity.type === 'get_asset_comment_reply') {
          assert.ok(activity.comment.id);
          assert.ok(activity.comment.body);
        } else {
          assert.ok(!activity.comment);
        }
      });
    } else {
      assert.strictEqual(activitySeries.length, 0);
    }
  });
  _.each([
    'actions.counts.user',
    'actions.counts.course',
    'actions.totals.user',
    'actions.totals.course',
    'impacts.counts.user',
    'impacts.counts.course',
    'impacts.totals.user',
    'impacts.totals.course'
  ], function(activityCountType) {
    var countResult = _.get(activities, activityCountType);
    assert.deepEqual(countResult, expectedActivityCounts[activityCountType]);
  });
};

/* Points configuration */

/**
 * Assert that an activity type configuration has all expected properties
 *
 * @param  {ActivityType}       activityType                      The activity type to assert the properties for
 * @param  {Object}             [opts]                            Optional parameters to verify the activity type with
 * @param  {Category}           [opts.expectedActivityType]       The activity type to which the provided activity type should be compared
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertActivityType = module.exports.assertActivityType = function(activityType, opts) {
  opts = opts || {};

  // Ensure that all expected properties are present
  assert.ok(activityType);
  assert.ok(activityType.type);
  assert.ok(_.find(ActivitiesDefaults, {'type': activityType.type}));
  assert.ok(activityType.title);
  assert.ok(_.isFinite(activityType.points));
  assert.ok(_.isBoolean(activityType.enabled));

  // Ensure that all the activity type configuration properties are the same as the ones for
  // the expected activity type configuration
  if (opts.expectedActivityType) {
    assert.strictEqual(activityType.type, opts.expectedActivityType.type);
    assert.strictEqual(activityType.title, opts.expectedActivityType.title);
    assert.strictEqual(activityType.points, opts.expectedActivityType.points);
    assert.strictEqual(activityType.impact, opts.expectedActivityType.impact);
    assert.strictEqual(activityType.enabled, opts.expectedActivityType.enabled);
  }
};

/**
 * Assert that the activity type configration for a course can be retrieved
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Function}           callback                          Standard callback function
 * @param  {Object}             callback.configuration            The activity type configuration for the course
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertGetActivityTypeConfiguration = module.exports.assertGetActivityTypeConfiguration = function(client, course, callback) {
  client.activities.getActivityTypeConfiguration(course, function(err, configuration) {
    assert.ifError(err);
    assert.ok(configuration);
    // Verify that a configuration for all activity types is present
    assert.strictEqual(configuration.length, ActivitiesDefaults.length);
    _.each(ActivitiesDefaults, function(activityTypeDefault) {
      assertActivityType(_.find(configuration, {'type': activityTypeDefault.type}));
    });

    return callback(configuration);
  });
};

/**
 * Assert that the activity type configration for a course can not be retrieved
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Number}             code                              The expected HTTP error code
 * @param  {Function}           callback                          Standard callback function
 * @param  {Object}             callback.configuration            The activity type configuration for the course
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertGetActivityTypeConfigurationFails = module.exports.assertGetActivityTypeConfigurationFails = function(client, course, code, callback) {
  client.activities.getActivityTypeConfiguration(course, function(err, configuration) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!configuration);

    return callback();
  });
};

/**
 * Assert that the configuration for an activity type in a course can be edited
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Object[]}           activityTypeUpdates               Activity type configuration overrides that should be aplied to the activity type configuration for the course
 * @param  {String}             activityTypeUpdates.type          The type of the activity type configuration override. One of the types in `col-activities/lib/constants.js`
 * @param  {Number}             [activityTypeUpdates.points]      The number of points this activity type should contribute towards a user's points
 * @param  {Boolean}            [activityTypeUpdates.enabled]     Whether activities of this type should contribute towards a user's points
 * @param  {Function}           callback                          Standard callback function
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertEditActivityTypeConfiguration = module.exports.assertEditActivityTypeConfiguration = function(client, course, activityTypeUpdates, callback) {
  client.activities.editActivityTypeConfiguration(course, activityTypeUpdates, function(err) {
    assert.ifError(err);

    // Verify that the activity type configuration overrides have been applied
    assertGetActivityTypeConfiguration(client, course, function(configuration) {
      _.each(activityTypeUpdates, function(activityTypeUpdate) {
        var activityType = _.find(configuration, {'type': activityTypeUpdate.type});
        if (!_.isUndefined(activityTypeUpdate.points)) {
          assert.strictEqual(activityType.points, activityTypeUpdate.points);
        }
        if (!_.isUndefined(activityTypeUpdate.enabled)) {
          assert.strictEqual(activityType.enabled, activityTypeUpdate.enabled);
        }
      });

      return callback();
    });
  });
};

/**
 * Override to disable asset view activities. For testing purposes, this reduces noise in activity logging.
 */
var OVERRIDE_VIEWS_DISABLED = module.exports.OVERRIDE_VIEWS_DISABLED = [
  {
    'type': 'view_asset',
    'enabled': false
  },
  {
    'type': 'get_view_asset',
    'enabled': false
  }
];

/**
 * Assert that the configuration for an activity type in a course can be edited
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Object[]}           activityTypeUpdates               Activity type configuration overrides that should be aplied to the activity type configuration for the course
 * @param  {String}             activityTypeUpdates.type          The type of the activity type configuration override. One of the types in `col-activities/lib/constants.js`
 * @param  {Number}             [activityTypeUpdates.points]      The number of points this activity type should contribute towards a user's points
 * @param  {Boolean}            [activityTypeUpdates.enabled]     Whether activities of this type should contribute towards a user's points
 * @param  {Number}             code                              The expected HTTP error code
 * @param  {Function}           callback                          Standard callback function
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertEditActivityTypeConfigurationFails = module.exports.assertEditActivityTypeConfigurationFails = function(client, course, activityTypeUpdates, code, callback) {
  client.activities.editActivityTypeConfiguration(course, activityTypeUpdates, function(err) {
    assert.ok(err);
    assert.strictEqual(err.code, code);

    return callback();
  });
};

/**
 * Assert that reciprocal activities can be matched
 *
 * @param  {Course}              course               The course in which activities are taking place
 * @param  {String}              passiveType          Passive activity type expected to be present
 * @param  {String}              activeType           Active activity type expected to match
 * @param  {Function}            callback             Standard callback function
 * @throws {AssertionError}                           Error thrown when an assertion failed
 */
var assertReciprocals = module.exports.assertReciprocals = function(course, passiveType, activeType, callback) {
  CourseTestUtil.getDbCourse(course.id, function(dbCourse) {
    DB.Activity.findAll({'where': {'course_id': dbCourse.id}}).complete(function(err, activities) {
      assert.ifError(err);
      var passiveActivities = _.filter(activities, {'type': passiveType});
      assert.ok(passiveActivities.length);
      _.each(passiveActivities, function(activity) {
        // For every passive activity, assert that the reciprocal active activity can be matched.
        assert.ok(activity.reciprocal_id);
        assert.ok(_.find(activities, {
          'type': activeType,
          'id': activity.reciprocal_id,
          'user_id': activity.actor_id
        }));
      });
      return callback();
    });
  });
};

/**
 * Assert that the daily notifications can be collected
 *
 * @param  {Course}              course                           The course for which to collect the daily notifications (database model)
 * @param  {User[]}              users                            The users who should've gotten an email
 * @param  {Function}            callback                         Standard callback function
 * @param  {Object[]}            callback.emails                  The sent out emails
 * @param  {Object}              callback.emails[i].email         Information such as the subject, html body, who the email was sent to etc.
 * @param  {User}                callback.emails[i].user          The user to whom the email was sent
 * @param  {Course}              callback.emails[i].course        The course for which the email was sent
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertDailyNotifications = module.exports.assertDailyNotifications = function(course, users, callback) {
  // Collect any emails that are sent out when collecting the daily notifications
  var emails = [];
  function emailListener(email, user, course) {
    emails.push({
      'email': email,
      'user': user,
      'course': course
    });
  };
  EmailUtil.on(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);

  // Send out the daily notifications
  var DailyNotifications = require('../lib/notifications/daily');
  DailyNotifications.collectCourse(course, function() {
    EmailUtil.removeListener(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);
    assertEmailsForUsers(emails, users);

    return callback(emails);
  });
};

/**
 * Assert that weekly notification emails are sent
 *
 * @param  {RestClient}          client                           The REST client to make the request with
 * @param  {Course}              course                           The Canvas course in which the user is interacting with the API
 * @param  {Course}              dbCourse                         The database model for the course
 * @param  {User[]}              users                            The users who should receive an email
 * @param  {Function}            callback                         Standard callback function
 * @param  {Object[]}            callback.emails                  The sent email messages
 * @param  {Object}              callback.emails[i].email         Information including the subject, html body, recipient
 * @param  {User}                callback.emails[i].user          The user to whom the email was sent
 * @param  {Course}              callback.emails[i].course        The course for which the email was sent
 * @throws {AssertionError}                                       Error thrown when an assertion fails
 */
var assertSendWeeklyNotifications = module.exports.assertSendWeeklyNotifications = function(client, course, dbCourse, users, callback) {
  // Collect any emails that are sent out when collecting the weekly notifications
  var emails = [];
  function emailListener(email, user, dbCourse) {
    emails.push({
      'email': email,
      'user': user,
      'course': dbCourse
    });
  };
  EmailUtil.on(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);

  client.activities.sendWeeklyNotificationsForCourse(course, function(err, response) {
    assert.ifError(err);
    assert.ok(response);

    EmailUtil.removeListener(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);
    assertEmailsForUsers(emails, users);

    return callback(emails);
  });
};

/**
 * Assert that a set of email messages matches user data
 *
 * @param  {User[]}              users                     The users who should have received an email
 * @param  {Object[]}            emails                    The sent email messages
 * @throws {AssertionError}                                Error thrown when an assertion fails
 * @api private
 */
var assertEmailsForUsers = function(emails, users) {
  // Verify the correct number of emails was sent
  assert.strictEqual(_.size(emails), _.size(users));

  // Verify the notifications were sent to the correct users
  if (users) {
    var emailAddresses = _.chain(emails)
      .map('email')
      .map('to')
      .value()
      .sort();

    var expectedEmailAddresses = _.map(users, 'canvas_email').sort();
    assert.deepEqual(emailAddresses, expectedEmailAddresses);

    // Verify the correct name was used when addressing the user
    var emailNames = _.chain(emails)
      .map('email')
      .map('toname')
      .value()
      .sort();

    var expectedEmailNames = _.map(users, 'canvas_full_name').sort();
    assert.deepEqual(emailNames, expectedEmailNames);
  }
};

/**
 * Assert that a request to send weekly notification emails passes authorization but sends no messages
 *
 * @param  {RestClient}          client                           The REST client to make the request with
 * @param  {Course}              course                           The Canvas course in which the user is interacting with the API
 * @param  {Course}              dbCourse                         The database model for the course
 * @param  {User[]}              users                            The users who should receive an email
 * @param  {Function}            callback                         Standard callback function
 * @param  {Object[]}            callback.emails                  The sent email messages
 * @throws {AssertionError}                                       Error thrown when an assertion fails
 */
var assertSendWeeklyNotificationsEmpty = module.exports.assertSendWeeklyNotificationsEmpty = function(client, course, dbCourse, users, callback) {
  // Collect any emails that are sent out when collecting the weekly notifications
  var emails = [];
  function emailListener(email, user, dbCourse) {
    emails.push({
      'email': email,
      'user': user,
      'course': dbCourse
    });
  };
  EmailUtil.on(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);

  client.activities.sendWeeklyNotificationsForCourse(course, function(err, response) {
    assert.ifError(err);
    assert.ok(response);

    EmailUtil.removeListener(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);
    assert.ok(!emails.length);

    return callback();
  });
};

/**
 * Assert that the weekly notification email for a course can not be manually triggered
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Number}             code                              The expected HTTP error code
 * @param  {Function}           callback                          Standard callback function
 * @param  {Object}             callback.configuration            The activity type configuration for the course
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertSendWeeklyNotificationsFails = module.exports.assertSendWeeklyNotificationsFails = function(client, course, code, callback) {
  client.activities.sendWeeklyNotificationsForCourse(course, function(err, response) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!response);

    return callback();
  });
};

/**
 * Assert that daily notification emails are sent
 *
 * @param  {RestClient}          client                           The REST client to make the request with
 * @param  {Course}              course                           The Canvas course in which the user is interacting with the API
 * @param  {Course}              dbCourse                         The database model for the course
 * @param  {User[]}              users                            The users who should receive an email
 * @param  {Function}            callback                         Standard callback function
 * @param  {Object[]}            callback.emails                  The sent email messages
 * @param  {Object}              callback.emails[i].email         Information including the subject, html body, recipient
 * @param  {User}                callback.emails[i].user          The user to whom the email was sent
 * @param  {Course}              callback.emails[i].course        The course for which the email was sent
 * @throws {AssertionError}                                       Error thrown when an assertion fails
 */
var assertSendDailyNotifications = module.exports.assertSendDailyNotifications = function(client, course, dbCourse, users, callback) {
  // Collect any emails that are sent out when collecting the daily notifications
  var emails = [];
  function emailListener(email, user, dbCourse) {
    emails.push({
      'email': email,
      'user': user,
      'course': dbCourse
    });
  };
  EmailUtil.on(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);

  client.activities.sendDailyNotificationsForCourse(course, function(err, response) {
    assert.ifError(err);
    assert.ok(response);

    EmailUtil.removeListener(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);
    assertEmailsForUsers(emails, users);

    return callback(emails);
  });
};

/**
 * Assert that a request to send daily notification emails passes authorization but sends no messages
 *
 * @param  {RestClient}          client                           The REST client to make the request with
 * @param  {Course}              course                           The Canvas course in which the user is interacting with the API
 * @param  {Course}              dbCourse                         The database model for the course
 * @param  {User[]}              users                            The users who should receive an email
 * @param  {Function}            callback                         Standard callback function
 * @param  {Object[]}            callback.emails                  The sent email messages
 * @throws {AssertionError}                                       Error thrown when an assertion fails
 */
var assertSendDailyNotificationsEmpty = module.exports.assertSendDailyNotificationsEmpty = function(client, course, dbCourse, users, callback) {
  // Collect any emails that are sent out when collecting the daily notifications
  var emails = [];
  function emailListener(email, user, dbCourse) {
    emails.push({
      'email': email,
      'user': user,
      'course': dbCourse
    });
  };
  EmailUtil.on(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);

  client.activities.sendDailyNotificationsForCourse(course, function(err, response) {
    assert.ifError(err);
    assert.ok(response);

    EmailUtil.removeListener(EmailUtil.EVENT_NAMES.EMAIL_SENT, emailListener);
    assert.ok(!emails.length);

    return callback();
  });
};

/**
 * Assert expected failure when attempting to send daily notification email, manually triggered
 *
 * @param  {RestClient}         client                            The REST client to make the request with
 * @param  {Course}             course                            The Canvas course in which the user is interacting with the API
 * @param  {Number}             code                              The expected HTTP error code
 * @param  {Function}           callback                          Standard callback function
 * @param  {Object}             callback.configuration            The activity type configuration for the course
 * @throws {AssertionError}                                       Error thrown when an assertion failed
 */
var assertSendDailyNotificationsFails = module.exports.assertSendDailyNotificationsFails = function(client, course, code, callback) {
  client.activities.sendDailyNotificationsForCourse(course, function(err, response) {
    assert.ok(err);
    assert.strictEqual(err.code, code);
    assert.ok(!response);

    return callback();
  });
};

/* Utilities specific to notification email tests */

/**
 * Set up a course with 6 users that each have their own asset and whiteboard.
 *
 * @param  {Function}     callback                            Standard callback function
 * @param  {Couse}        callback.dbCourse                   The course in which the activity takes place (database object)
 * @param  {Couse}        callback.course                     The course in which the activity takes place
 * @param  {Object}       callback.users                      An object for the 5 created users
 * @param  {Object}       callback.users.nico                 The information for Nico
 * @param  {RestClient}   callback.users.nico.client          Nico's rest client
 * @param  {Object}       callback.users.nico.me              Nico's me feed information
 * @param  {Object}       callback.users.nico.user            Nico's user object
 * @param  {Asset}        callback.users.nico.asset           Nico's asset
 * @param  {Whiteboard}   callback.users.nico.whiteboard      Nico's whiteboard
 * @param  {Object}       callback.users.annesophie           The information for Anne-Sophie
 * @param  {Object}       callback.users.simon                The information for Simon
 * @param  {Object}       callback.users.paul                 The information for Paul
 * @param  {Object}       callback.users.oliver               The information for Oliver
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 * @api private
 */
var setupCourse = module.exports.setupCourse = function(callback) {
  setupUser(null, function(client1, course, user1, me1, asset1, whiteboard1) {
    setupUser(course, function(client2, course, user2, me2, asset2, whiteboard2) {
      setupUser(course, function(client3, course, user3, me3, asset3, whiteboard3) {
        setupUser(course, function(client4, course, user4, me4, asset4, whiteboard4) {
          setupUser(course, function(client5, course, user5, me5, asset5, whiteboard5) {
            setupUser(course, function(client6, course, user6, me6, asset6, whiteboard6) {

              // Launch 1 user into the whiteboards tool so it can be persisted on the course
              LtiTestUtil.assertWhiteboardsLaunchSucceeds(client1, course, user1, function() {

                // Get the actual course object so we can pass it into the poller
                CourseTestUtil.getDbCourse(course.id, function(dbCourse) {

                  return callback(dbCourse, course, {
                    'nico': {
                      'client': client1,
                      'user': user1,
                      'me': me1,
                      'asset': asset1,
                      'whiteboard': whiteboard1
                    },
                    'annesophie': {
                      'client': client2,
                      'user': user2,
                      'me': me2,
                      'asset': asset2,
                      'whiteboard': whiteboard2
                    },
                    'paul': {
                      'client': client3,
                      'user': user3,
                      'me': me3,
                      'asset': asset3,
                      'whiteboard': whiteboard3
                    },
                    'oliver': {
                      'client': client4,
                      'user': user4,
                      'me': me4,
                      'asset': asset4,
                      'whiteboard': whiteboard4
                    },
                    'simon': {
                      'client': client5,
                      'user': user5,
                      'me': me5,
                      'asset': asset5,
                      'whiteboard': whiteboard5
                    },
                    'ray': {
                      'client': client6,
                      'user': user6,
                      'me': me6,
                      'asset': asset6,
                      'whiteboard': whiteboard6
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

/**
 * Set up a course with 6 users that each have their own asset and whiteboard.
 * Additionally, add a seventh user with an instructor role.
 *
 * @param  {Function}     callback                            Standard callback function
 * @param  {Couse}        callback.dbCourse                   The course in which the activity takes place (database object)
 * @param  {Couse}        callback.course                     The course in which the activity takes place
 * @param  {Object}       callback.users                      An object for the 7 created users
 */
var setupCourseWithInstructor = module.exports.setupCourseWithInstructor = function(callback) {
  setupCourse(function(dbCourse, course, users) {
    var instructor = TestsUtil.generateInstructor();
    TestsUtil.getAssetLibraryClient(null, course, instructor, function(instructorClient, course, instructor) {
      UsersTestUtil.assertGetMe(instructorClient, course, null, function(instructorMe) {
        users.instructor = {
          'client': instructorClient,
          'user': instructor,
          'me': instructorMe
        };
        return callback(dbCourse, course, users);
      });
    });
  });
};

/**
 * Set up a course with 6 users that each have their own asset and whiteboard.
 *
 * Additionally, the following activity takes place:
 *   - Anne-Sophie comments on Nico's Asset
 *   - Simon replies to Anne-sophie's comment on Nico's asset
 *   - Simon adds paul as a whiteboard collaborator
 *   - Paul creates a chat message on Simon's whiteboard
 *   - Simon replies to Paul's chat message
 *   - Simon and Nico comment on Paul's asset
 *
 * @param  {Function}     callback                            Standard callback function
 * @param  {Couse}        callback.dbCourse                   The course in which the activity takes place (database object)
 * @param  {Couse}        callback.course                     The course in which the activity takes place
 * @param  {Object}       callback.users                      An object for the 6 created users
 * @param  {Object}       callback.users.nico                 The information for Nico
 * @param  {RestClient}   callback.users.nico.client          Nico's rest client
 * @param  {Object}       callback.users.nico.me              Nico's me feed information
 * @param  {Object}       callback.users.nico.user            Nico's user object
 * @param  {Asset}        callback.users.nico.asset           Nico's asset
 * @param  {Whiteboard}   callback.users.nico.whiteboard      Nico's whiteboard
 * @param  {Object}       callback.users.annesophie           The information for Anne-Sophie
 * @param  {Object}       callback.users.simon                The information for Simon
 * @param  {Object}       callback.users.paul                 The information for Paul
 * @param  {Object}       callback.users.oliver               The information for Oliver
 * @throws {AssertionError}                                   Error thrown when an assertion failed
 * @api private
 */
var setupCourseWithActivity = module.exports.setupCourseWithActivity = function(callback) {
  setupCourse(function(dbCourse, course, users) {

    // The following takes place:

    // This should result in the following emails:
    //  - To Nico - Anne Sophie and Simon commented on your asset '...'
    //  - To Anne-Sophie - Simon replied to your comment '...'
    //  - To Simon - Paul commented on your whiteboard '...'
    //  - To Paul - Simon and Nico commented on your asset '...'
    AssetsTestUtil.assertCreateComment(users.annesophie.client, course, users.nico.asset.id, 'This is a comment by Anne-Sophie', null, function(anneSophiesComment) {
      AssetsTestUtil.assertCreateComment(users.simon.client, course, users.nico.asset.id, 'This is a reply by Simon', anneSophiesComment.id, function(simonsReply) {
        WhiteboardsTestUtil.assertEditWhiteboard(users.simon.client, course, users.simon.whiteboard.id, users.simon.whiteboard.title, [users.simon.me.id, users.paul.me.id], function() {
          WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.simon.whiteboard.id, 'Chat message by Paul', function() {
            WhiteboardsTestUtil.assertCreateChatMessage(users.simon.client, course, users.simon.whiteboard.id, 'Chat message by Simon', function() {
              AssetsTestUtil.assertCreateComment(users.simon.client, course, users.paul.asset.id, 'This is a comment by Simon', null, function(simonsComment) {
                AssetsTestUtil.assertCreateComment(users.nico.client, course, users.paul.asset.id, 'This is a comment by Nico', null, function(nicosComment) {

                  return callback(dbCourse, course, users);
                });
              });
            });
          });
        });
      });
    });
  });
};

/**
 * Set up a user in a course with its own asset and whiteboard
 *
 * @param  {Course}         course                  The course in which to set up the user
 * @param  {Function}       callback                Standard callback function
 * @param  {Asset}          callback.asset          The user's asset
 * @param  {Whiteboard}     callback.whiteboard     The user's whiteboard
 * @throws {AssertionError}                         Error thrown when an assertion failed
 * @api private
 */
var setupUser = function(course, callback) {
  TestsUtil.getAssetLibraryClient(null, course, null, function(client, course, user) {
    UsersTestUtil.assertGetMe(client, course, null, function(me) {

      // Create an asset for the user
      var assetTitle = randomstring.generate(25);
      AssetsTestUtil.assertCreateLink(client, course, assetTitle, 'http://www.google.com', null, function(asset) {

        // Create a whiteboard for the user
        var whiteboardTitle = randomstring.generate(25);
        WhiteboardsTestUtil.assertCreateWhiteboard(client, course, whiteboardTitle, null, function(whiteboard) {
          return callback(client, course, user, me, asset, whiteboard);
        });
      });
    })
  });
};
