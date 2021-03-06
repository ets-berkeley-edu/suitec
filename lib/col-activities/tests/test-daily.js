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
var moment = require('moment-timezone');

var AssetsTestUtil = require('col-assets/tests/util');
var CategoriesTestUtil = require('col-categories/tests/util');
var CourseTestUtil = require('col-course/tests/util');
var DB = require('col-core/lib/db');
var TestsUtil = require('col-tests');
var UsersTestUtil = require('col-users/tests/util');
var WhiteboardsTestUtil = require('col-whiteboards/tests/util');

var ActivitiesTestUtil = require('./util');

describe('Daily activity emails', function() {

  /**
   * Test that verifies that emails are sent to active users in a course with tools enabled
   */
  it('notify all active users in a course with tools enabled', function(callback) {
    ActivitiesTestUtil.setupCourseWithInstructor(function(dbCourse, course, users, instructor) {
      var userObjects = _.map(users, function(user) {
        return user.me;
      });

      // No activity, no email
      ActivitiesTestUtil.assertSendDailyNotificationsEmpty(users.instructor.client, course, dbCourse, userObjects, function() {

        // Verify one user, after receiving a comment on an asset, gets an email
        AssetsTestUtil.assertCreateComment(users.annesophie.client, course, users.nico.asset.id, 'Nice asset!', null, function(anneSophiesComment) {
          ActivitiesTestUtil.assertSendDailyNotifications(users.instructor.client, course, dbCourse, [ users.nico.me ], function() {

            // Verify two users get an email
            AssetsTestUtil.assertCreateComment(users.nico.client, course, users.annesophie.asset.id, 'Thanks, dude!', null, function(anneSophiesComment) {
              ActivitiesTestUtil.assertSendDailyNotifications(users.instructor.client, course, dbCourse, [users.annesophie.me, users.nico.me], function(emails) {
                return callback();
              });
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies authorization when manually triggering a daily activity email for a course
   */
  it('verifies authorization', function(callback) {
    TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
      ActivitiesTestUtil.assertSendDailyNotificationsFails(client, course, 401, function() {

        return callback();
      });
    });
  });

  /**
   * Test that verifies that emails are sent only when daily notifications are enabled
   */
  it('sends emails only if daily notifications are enabled for course', function(callback) {
    ActivitiesTestUtil.setupCourseWithInstructor(function(dbCourse, course, users, instructor) {
      // Generate an activity by commenting on Nico's asset
      AssetsTestUtil.assertCreateComment(users.annesophie.client, course, users.nico.asset.id, 'This is a comment', null, function(anneSophiesComment) {

        // Disable daily notifications
        CourseTestUtil.assertUpdateDailyNotifications(users.instructor.client, course, false, function() {
          dbCourse.reload().complete(function(err, dbCourse) {
          // Verify that no one gets an email
           ActivitiesTestUtil.assertDailyNotifications(dbCourse, [], function(emails) {
              assert.ok(_.isEmpty(emails));

              // Enable daily notifications
              CourseTestUtil.assertUpdateDailyNotifications(users.instructor.client, course, true, function() {
                dbCourse.reload().complete(function(err, dbCourse) {
                  // Verify that Nico gets an email
                  ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {
                    return callback();
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies that emails are only sent to those users who need to be notified
   */
  it('sends emails to only those users who need to be notified', function(callback) {
    ActivitiesTestUtil.setupCourse(function(dbCourse, course, users) {

      // Verify that no emails are sent out in a course that has no activities
      ActivitiesTestUtil.assertDailyNotifications(dbCourse, [], function(emails) {
        assert.ok(_.isEmpty(emails));

        // Generate 1 activity by commenting on an asset
        AssetsTestUtil.assertCreateComment(users.annesophie.client, course, users.nico.asset.id, 'This is a comment', null, function(anneSophiesComment) {
          ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {

            // If a third user comments on the same asset, the asset owner is still the only one to get an email
            AssetsTestUtil.assertCreateComment(users.simon.client, course, users.nico.asset.id, 'This is another comment', null, function(simonsComment) {
              ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {

                // Let a fourth user comment on Anne-Sophie's comment, that should send an email
                // to her as well
                AssetsTestUtil.assertCreateComment(users.paul.client, course, users.nico.asset.id, 'This is a reply', anneSophiesComment.id, function(paulsComment) {
                  ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me, users.annesophie.me], function(emails) {

                    // Generate a chat message on Simon's whiteboard
                    WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.simon.whiteboard.id, 'This is a chat message', function() {
                      ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me, users.annesophie.me, users.simon.me], function(emails) {

                        // Verify writing a chat message on your own board does not trigger an email
                        WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.paul.whiteboard.id, 'This is a chat message', function() {
                          ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me, users.annesophie.me, users.simon.me], function(emails) {

                            // Verify writing a comment on your own asset does not trigger an email
                            AssetsTestUtil.assertCreateComment(users.paul.client, course, users.paul.asset.id, 'This is a comment', null, function() {
                              ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me, users.annesophie.me, users.simon.me], function(emails) {

                                // Verify replying to yourself does not trigger an email. Also verify
                                // that no further emails are sent to these users
                                TestsUtil.setExpectedEmail(users.nico.me.id, 1);
                                TestsUtil.setExpectedEmail(users.annesophie.me.id, 1);
                                TestsUtil.setExpectedEmail(users.simon.me.id, 1);
                                TestsUtil.setExpectedEmail(users.paul.me.id, 0);
                                TestsUtil.setExpectedEmail(users.oliver.me.id, 0);
                                AssetsTestUtil.assertCreateComment(users.paul.client, course, users.nico.asset.id, 'This is a reply', paulsComment.id, function() {
                                  ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me, users.annesophie.me, users.simon.me], function(emails) {

                                    return callback();
                                  });
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies that the email subject depends on which activities took place
   */
  it('changes the email subject depending on which activities took place', function(callback) {
    ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {

      // Oliver ends up with 2 asset activities
      AssetsTestUtil.assertCreateLink(users.oliver.client, course, 'title', 'http://www.google.com', null, function(asset2) {
        AssetsTestUtil.assertCreateComment(users.simon.client, course, users.oliver.asset.id, 'This is a comment', null, function(topComment) {
          AssetsTestUtil.assertCreateComment(users.simon.client, course, asset2.id, 'This is a comment', null, function(topComment) {

            // Ray ends up with 2 whiteboard activities
            WhiteboardsTestUtil.assertCreateWhiteboard(users.ray.client, course, 'title', [], function(whiteboard2) {
              WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.ray.whiteboard.id, 'Chat message', function() {
                WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, whiteboard2.id, 'Chat message', function() {


                  // Collect the daily notifications
                  var expectedEmailedUsers = [users.nico.me, users.annesophie.me, users.simon.me, users.paul.me, users.oliver.me, users.ray.me];
                  ActivitiesTestUtil.assertDailyNotifications(dbCourse, expectedEmailedUsers, function(emails) {
                    var nicosEmail = getEmail(emails, users.nico.me.canvas_email);
                    var anneSophiesEmail = getEmail(emails, users.annesophie.me.canvas_email);
                    var simonsEmail = getEmail(emails, users.simon.me.canvas_email);
                    var paulsEmail = getEmail(emails, users.paul.me.canvas_email);
                    var oliversEmail = getEmail(emails, users.oliver.me.canvas_email);
                    var raysEmail = getEmail(emails, users.ray.me.canvas_email);

                    assert.ok(nicosEmail.email.subject.indexOf('commented on your asset "' + users.nico.asset.title + '"') > -1);
                    assert.strictEqual(anneSophiesEmail.email.subject, users.simon.me.canvas_full_name + ' replied to your comment');
                    assert.strictEqual(simonsEmail.email.subject, users.paul.me.canvas_full_name + ' commented on your whiteboard "' + users.simon.whiteboard.title + '"');
                    assert.strictEqual(paulsEmail.email.subject, 'New Asset Library and Whiteboard activity is waiting for you');
                    assert.strictEqual(oliversEmail.email.subject, 'New Asset Library activity is waiting for you');
                    assert.strictEqual(raysEmail.email.subject, 'New Whiteboard activity is waiting for you');

                    return callback();
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies that replies on an asset owner's comment are grouped as replies
   */
  it('groups replies on an asset owner\'s comment correctly', function(callback) {
    ActivitiesTestUtil.setupCourse(function(dbCourse, course, users) {

      // Simon creates a comment on his own comment which Nico then comments on
      AssetsTestUtil.assertCreateComment(users.simon.client, course, users.simon.asset.id, 'This is a comment', null, function(topComment) {
        AssetsTestUtil.assertCreateComment(users.nico.client, course, users.simon.asset.id, 'This is a reply', topComment.id, function(reply1) {
          AssetsTestUtil.assertCreateComment(users.nico.client, course, users.simon.asset.id, 'This is reply 2', topComment.id, function(reply2) {

            // Simon should get an email notifying him of a reply
            ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.simon.me], function(emails) {
              var simonsEmail = getEmail(emails, users.simon.me.canvas_email);
              assert.strictEqual(simonsEmail.email.subject, users.nico.me.canvas_full_name + ' replied to your comment');

              // Verify the comments are present
              var commentIndex = simonsEmail.email.html.indexOf(topComment.body);
              var reply1Index = simonsEmail.email.html.indexOf(reply1.body);
              var reply2Index = simonsEmail.email.html.indexOf(reply2.body);
              assert.ok(commentIndex > -1);
              assert.ok(reply1Index > -1);
              assert.ok(reply2Index > -1);

              // The top comment should come before the first reply. The first reply should
              // come before the second reply.
              assert.ok(commentIndex < reply1Index);
              assert.ok(reply1Index < reply2Index);
              return callback();
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies that the correct greetings are present
   */
  it('creates the correct greetings', function(callback) {
    ActivitiesTestUtil.setupCourse(function(dbCourse, course, users) {

      // If only 1 activity block is present in the email, there's no need for the greeting
      AssetsTestUtil.assertCreateComment(users.simon.client, course, users.nico.asset.id, 'This is a comment', null, function() {
        ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {
          assert.ok(!getGreeting(emails[0]));

          // Add a chat message to a whiteboard, now there should be a greeting
          WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.nico.whiteboard.id, 'Chat message 1', function() {
            ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {
              var greeting = getGreeting(emails[0]);
              assert.strictEqual(greeting, 'You have a new comment on an asset and a new chat message on a whiteboard.');

              // Add another chat message
              WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.nico.whiteboard.id, 'Chat message 1', function() {
                ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {
                  var greeting = getGreeting(emails[0]);
                  assert.strictEqual(greeting, 'You have a new comment on an asset and 2 chat messages on 1 whiteboard.');

                  // Create another whiteboard with a chat message
                  WhiteboardsTestUtil.assertCreateWhiteboard(users.nico.client, course, 'title', [users.paul.me.id, users.nico.me.id], function(whiteboard) {
                    WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, whiteboard.id, 'Chat message 2', function() {
                      ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {
                        var greeting = getGreeting(emails[0]);
                        assert.strictEqual(greeting, 'You have a new comment on an asset and 3 chat messages on 2 whiteboards.');

                        // Add another comment
                        AssetsTestUtil.assertCreateComment(users.simon.client, course, users.nico.asset.id, 'This is comment 2', null, function() {
                          ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {
                            var greeting = getGreeting(emails[0]);
                            assert.strictEqual(greeting, 'You have 2 comments on 1 asset and 3 chat messages on 2 whiteboards.');

                            // Create another asset with a comment
                            AssetsTestUtil.assertCreateLink(users.nico.client, course, 'title', 'http://www.google.com', null, function(asset) {
                              AssetsTestUtil.assertCreateComment(users.simon.client, course, asset.id, 'This is comment 2', null, function() {
                                ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {
                                  var greeting = getGreeting(emails[0]);
                                  assert.strictEqual(greeting, 'You have 3 comments on 2 assets and 3 chat messages on 2 whiteboards.');

                                  // Create a new asset, comment on it and let someone reply
                                  AssetsTestUtil.assertCreateLink(users.nico.client, course, 'title', 'http://www.google.com', null, function(asset3) {
                                    AssetsTestUtil.assertCreateComment(users.nico.client, course, asset3.id, 'Top comment', null, function(comment) {
                                      AssetsTestUtil.assertCreateComment(users.simon.client, course, asset3.id, 'Reply 1', comment.id, function() {
                                        ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {
                                          var greeting = getGreeting(emails[0]);
                                          assert.strictEqual(greeting, 'You have 3 comments on 2 assets, a new reply on a comment and 3 chat messages on 2 whiteboards.');

                                          // Add another reply
                                          AssetsTestUtil.assertCreateComment(users.simon.client, course, asset3.id, 'Reply 2', comment.id, function() {
                                            ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {
                                              var greeting = getGreeting(emails[0]);
                                              assert.strictEqual(greeting, 'You have 3 comments on 2 assets, 2 replies on 1 comment and 3 chat messages on 2 whiteboards.');

                                              // Create another asset, comment on it and let someone reply
                                              AssetsTestUtil.assertCreateLink(users.nico.client, course, 'title', 'http://www.google.com', null, function(asset3) {
                                                AssetsTestUtil.assertCreateComment(users.nico.client, course, asset3.id, 'Top comment', null, function(comment) {
                                                  AssetsTestUtil.assertCreateComment(users.simon.client, course, asset3.id, 'Reply 1', comment.id, function() {
                                                    ActivitiesTestUtil.assertDailyNotifications(dbCourse, [users.nico.me], function(emails) {
                                                      var greeting = getGreeting(emails[0]);
                                                      assert.strictEqual(greeting, 'You have 3 comments on 2 assets, 3 replies on 2 comments and 3 chat messages on 2 whiteboards.');
                                                      return callback();
                                                    });
                                                  });
                                                });
                                              });
                                            });
                                          });
                                        });
                                      });
                                    });
                                  });
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies that emails contain absolute links to the asset library and whiteboard
   */
  it('should contain absolute links to the asset library and whiteboard tool', function(callback) {
    ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {

      // Collect the daily notifications
      var expectedEmailedUsers = [users.nico.me, users.annesophie.me, users.simon.me, users.paul.me];
      ActivitiesTestUtil.assertDailyNotifications(dbCourse, expectedEmailedUsers, function(emails) {
        var nicosEmail = getEmail(emails, users.nico.me.canvas_email);
        var anneSophiesEmail = getEmail(emails, users.annesophie.me.canvas_email);
        var simonsEmail = getEmail(emails, users.simon.me.canvas_email);
        var paulsEmail = getEmail(emails, users.paul.me.canvas_email);

        // Assert only relevant data is present in each email
        // Nico
        assertEmailContainsAssets(nicosEmail, [users.nico.asset]);
        assertEmailContainsUsers(nicosEmail, [users.annesophie.me, users.simon.me])
        assertEmailContainsWhiteboards(nicosEmail, []);

        // Anne-Sophie
        assertEmailContainsAssets(anneSophiesEmail, [users.nico.asset]);
        assertEmailContainsUsers(anneSophiesEmail, [users.annesophie.me, users.simon.me])
        assertEmailContainsWhiteboards(anneSophiesEmail, []);

        // Simon
        assertEmailContainsAssets(simonsEmail, []);
        assertEmailContainsUsers(simonsEmail, [users.paul.me, users.simon.me])
        assertEmailContainsWhiteboards(simonsEmail, [users.simon.whiteboard]);

        // Paul
        assertEmailContainsAssets(paulsEmail, [users.paul.asset]);
        assertEmailContainsUsers(paulsEmail, [users.nico.me, users.simon.me, users.paul.me])
        assertEmailContainsWhiteboards(paulsEmail, [users.simon.whiteboard]);

        return callback();
      });
    });
  });

  /**
   * Test that verifies that aggregation is performed on the asset or whiteboard
   */
  it('aggregates on asset or whiteboard', function(callback) {
    ActivitiesTestUtil.setupCourse(function(dbCourse, course, users) {

      // Oliver comments on all assets and each asset owner replies in return. Everyone should get
      // an email with a single activity, except for Oliver who should have 4 activities
      createCommentAndReply(course, users.nico.asset, users.oliver.client, users.nico.client, function() {
        createCommentAndReply(course, users.annesophie.asset, users.oliver.client, users.annesophie.client, function() {
          createCommentAndReply(course, users.simon.asset, users.oliver.client, users.simon.client, function() {
            createCommentAndReply(course, users.paul.asset, users.oliver.client, users.paul.client, function() {

              // Everyone gets an email
              var expectedEmailedUsers = [
                users.nico.me,
                users.annesophie.me,
                users.simon.me,
                users.paul.me,
                users.oliver.me
              ];
              ActivitiesTestUtil.assertDailyNotifications(dbCourse, expectedEmailedUsers, function(emails) {
                // Everyone except for Oliver has 1 activity in their email
                _.each(emails, function(email) {
                  if (email.email.to !== users.oliver.me.canvas_email) {
                    assert.strictEqual(email.email.html.split('activity-row').length, 2);
                  }
                });

                // Oliver should have 4 activities
                var oliversEmail = getEmail(emails, users.oliver.me.canvas_email);
                assert.strictEqual(oliversEmail.email.html.split('activity-row').length, 5);
                return callback();
              });
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies that assets with only invisible categories are not returned.
   */
  it('honors category visibility', function(callback) {
    ActivitiesTestUtil.setupCourseWithInstructor(function(dbCourse, course, users) {

      // Oliver comments on all assets and each asset owner replies in return.
      createCommentAndReply(course, users.nico.asset, users.oliver.client, users.nico.client, function() {
        createCommentAndReply(course, users.annesophie.asset, users.oliver.client, users.annesophie.client, function() {
          createCommentAndReply(course, users.simon.asset, users.oliver.client, users.simon.client, function() {
            createCommentAndReply(course, users.paul.asset, users.oliver.client, users.paul.client, function() {

              // Nico's and Anne-Sophie's assets are associated with a hidden category.
              CategoriesTestUtil.assertCreateCategory(users.instructor.client, course, 'Hidden Category', function(hiddenCategory) {
                CategoriesTestUtil.assertEditCategory(users.instructor.client, course, hiddenCategory.id, 'Hidden Category', false, function(hiddenCategory) {
                  AssetsTestUtil.assertEditAsset(users.nico.client, course, users.nico.asset.id, 'Nico Asset', {'categories': hiddenCategory.id}, function(nicoAsset) {
                    AssetsTestUtil.assertEditAsset(users.annesophie.client, course, users.annesophie.asset.id, 'Anne-Sophie Asset', {'categories': hiddenCategory.id}, function(annesophieAsset) {

                      // Paul's asset is associated with a visible category.
                      CategoriesTestUtil.assertCreateCategory(users.instructor.client, course, 'Visible Category', function(visibleCategory) {
                        AssetsTestUtil.assertEditAsset(users.paul.client, course, users.paul.asset.id, 'Paul Asset', {'categories': visibleCategory.id}, function(paulAsset) {

                          // Simon's asset is associated with a visible and a hidden category.
                          AssetsTestUtil.assertEditAsset(users.simon.client, course, users.simon.asset.id, 'Simon Asset', {'categories': [hiddenCategory.id, visibleCategory.id]}, function(simonAsset) {

                            // Everyone except Nico and Anne-Sophie gets an email.
                            var expectedEmailedUsers = [
                              users.simon.me,
                              users.paul.me,
                              users.oliver.me
                            ];
                            ActivitiesTestUtil.assertDailyNotifications(dbCourse, expectedEmailedUsers, function(emails) {
                              // Everyone except for Oliver has 1 activity in their email.
                              _.each(emails, function(email) {
                                if (email.email.to !== users.oliver.me.canvas_email) {
                                  assert.strictEqual(email.email.html.split('activity-row').length, 2);
                                }
                              });

                              // Oliver should have 2 activities for the two visible assets.
                              var oliversEmail = getEmail(emails, users.oliver.me.canvas_email);
                              assert.strictEqual(oliversEmail.email.html.split('activity-row').length, 3);
                              return callback();
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies that the amount of comments per activity is limited
   */
  it('the amount of comments per activity is limited', function(callback) {
    ActivitiesTestUtil.setupCourse(function(dbCourse, course, users) {
      // Create a comment with 3 replies
      AssetsTestUtil.assertCreateComment(users.nico.client, course, users.nico.asset.id, 'This is a comment', null, function(parent) {
        AssetsTestUtil.assertCreateComment(users.simon.client, course, users.nico.asset.id, 'This is reply 1', parent.id, function(reply1) {
          AssetsTestUtil.assertCreateComment(users.simon.client, course, users.nico.asset.id, 'This is reply 2', parent.id, function(reply2) {
            AssetsTestUtil.assertCreateComment(users.simon.client, course, users.nico.asset.id, 'This is reply 3', parent.id, function(reply3) {

              var expectedEmailedUsers = [users.nico.me];
              ActivitiesTestUtil.assertDailyNotifications(dbCourse, expectedEmailedUsers, function(emails) {

                // All the comments should be in the email
                var html = emails[0].email.html;
                assert.ok(html.indexOf('This is a comment') > -1);
                assert.ok(html.indexOf('This is reply 1') > -1);
                assert.ok(html.indexOf('This is reply 2') > -1);
                assert.ok(html.indexOf('This is reply 3') > -1);

                // The link at the bottom should read `Check it out`
                assert.ok(html.indexOf('Check it out') > -1);
                assert.strictEqual(html.indexOf('See all'), -1);

                // Create two more replies
                AssetsTestUtil.assertCreateComment(users.simon.client, course, users.nico.asset.id, 'This is reply 4', parent.id, function(reply4) {
                  AssetsTestUtil.assertCreateComment(users.simon.client, course, users.nico.asset.id, 'This is reply 5', parent.id, function(reply5) {

                    ActivitiesTestUtil.assertDailyNotifications(dbCourse, expectedEmailedUsers, function(emails) {
                      html = emails[0].email.html;

                      // Only the first 4 comments should be in the email
                      assert.ok(html.indexOf('This is a comment') > -1);
                      assert.ok(html.indexOf('This is reply 1') > -1);
                      assert.ok(html.indexOf('This is reply 2') > -1);
                      assert.ok(html.indexOf('This is reply 3') > -1);
                      assert.strictEqual(html.indexOf('This is reply 4'), -1);
                      assert.strictEqual(html.indexOf('This is reply 5'), -1);

                      // The link at the bottom should read `See all`
                      assert.ok(html.indexOf('See all') > -1);
                      assert.strictEqual(html.indexOf('Check it out'), -1);
                      return callback();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies that the amount of chat messages per activity is limited
   */
  it('the amount of chat messages per activity is limited', function(callback) {
    ActivitiesTestUtil.setupCourse(function(dbCourse, course, users) {
      // Create a 4 chat messages
      WhiteboardsTestUtil.assertEditWhiteboard(users.simon.client, course, users.simon.whiteboard.id, users.simon.whiteboard.title, [users.simon.me.id, users.paul.me.id], function() {
        WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.simon.whiteboard.id, 'Chat message 1', function() {
          WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.simon.whiteboard.id, 'Chat message 2', function() {
            WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.simon.whiteboard.id, 'Chat message 3', function() {
              WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.simon.whiteboard.id, 'Chat message 4', function() {

                var expectedEmailedUsers = [users.simon.me];
                ActivitiesTestUtil.assertDailyNotifications(dbCourse, expectedEmailedUsers, function(emails) {

                  // All the chat messages should be in the email
                  var html = emails[0].email.html;
                  assert.ok(html.indexOf('Chat message 1') > -1);
                  assert.ok(html.indexOf('Chat message 2') > -1);
                  assert.ok(html.indexOf('Chat message 3') > -1);
                  assert.ok(html.indexOf('Chat message 4') > -1);

                  // The link at the bottom should read `Check it out`
                  assert.ok(html.indexOf('Check it out') > -1);
                  assert.strictEqual(html.indexOf('See all'), -1);

                  // Create two more replies
                  WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.simon.whiteboard.id, 'Chat message 5', function() {
                    WhiteboardsTestUtil.assertCreateChatMessage(users.paul.client, course, users.simon.whiteboard.id, 'Chat message 6', function() {

                      ActivitiesTestUtil.assertDailyNotifications(dbCourse, expectedEmailedUsers, function(emails) {
                        html = emails[0].email.html;

                        // Only the first 4 chat messages should be in the email
                        assert.ok(html.indexOf('Chat message 1') > -1);
                        assert.ok(html.indexOf('Chat message 2') > -1);
                        assert.ok(html.indexOf('Chat message 3') > -1);
                        assert.ok(html.indexOf('Chat message 4') > -1);
                        assert.strictEqual(html.indexOf('Chat message 5'), -1);
                        assert.strictEqual(html.indexOf('Chat message 6'), -1);

                        // The link at the bottom should read `See all`
                        assert.ok(html.indexOf('See all') > -1);
                        assert.strictEqual(html.indexOf('Check it out'), -1);
                        return callback();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  /**
   * Test that verifies that old data is not used
   */
  it('does not use old data', function(callback) {
    ActivitiesTestUtil.setupCourseWithActivity(function(dbCourse, course, users) {

      // Collect the daily notifications
      var expectedEmailedUsers = [users.nico.me, users.annesophie.me, users.simon.me, users.paul.me];
      ActivitiesTestUtil.assertDailyNotifications(dbCourse, expectedEmailedUsers, function(emails) {

        // Change the timestamps of any created comments and/or whiteboards
        var beforeCutoffDate = moment().subtract(2, 'days').format('YYYY-MM-DD HH:mm:ss');
        DB.Comment.update({'created_at': beforeCutoffDate}, {'where': {}}).complete(function(err) {
          assert.ifError(err);
          DB.Chat.update({'created_at': beforeCutoffDate}, {'where': {}}).complete(function(err) {
            assert.ifError(err);

            ActivitiesTestUtil.assertDailyNotifications(dbCourse, [], function() {
              return callback();
            });
          });
        });
      });
    });
  });

  /**
   * Given a set of collected emails, get the one matching a specific email address
   *
   * @param  {Object[]}     emails      Collected emails (as per ActivitiesTestUtil.assertDailyNotifications)
   * @param  {String}       to          The email address to look for
   * @return {Object}                   The matching email or `undefined` if it could not be found
   * @api private
   */
  var getEmail = function(emails, to) {
    return _.find(emails, function(email) {
      return (email.email.to === to);
    });
  };

  /**
   * Assert that an email contains references to (and only to) a set of assets
   *
   * @param  {Object[]}     email       Collected email (as per ActivitiesTestUtil.assertDailyNotifications)
   * @param  {Asset[]}      assets      The set of assets that should be in the email
   * @api private
   */
  var assertEmailContainsAssets = function(email, assets) {
    // Get all the asset ids in the email
    var re = new RegExp(getToolBaseUrl(email.course, 'assetlibrary') + '\\?col_asset=(\d+)');
    var assetIds = getIdsFromURLs(email, re);

    // Ensure each asset in the email is supposed to be referenced
    _.each(assetIds, function(id) {
      assert.ok(_.find(assets, {'id': id}));
    });

    // Ensure all assets are present both by title and URL
    _.each(assets, function(asset) {
      // Assert the title of the asset is present in the email
      assert.ok(email.email.html.indexOf(asset.title) > -1);

      // Assert a full link to the asset is present
      var expectedLink = getToolBaseUrl(email.course, 'assetlibrary') + '?col_asset=' + asset.id;

      assert.ok(email.email.html.indexOf(expectedLink) > -1);
    });
  };

  /**
   * Assert that an email contains references to (and only to) a set of users
   *
   * @param  {Object[]}     email       Collected email (as per ActivitiesTestUtil.assertDailyNotifications)
   * @param  {User[]}       users       The set of users that should be in the email
   * @api private
   */
  var assertEmailContainsUsers = function(email, users) {
    // Get all the user ids in the email
    var re = new RegExp(getToolBaseUrl(email.course, 'assetlibrary') + '\\?col_user=(\d+)');
    var userIds = getIdsFromURLs(email, re);

    // Ensure each user in the email is supposed to be referenced
    _.each(userIds, function(id) {
      assert.ok(_.find(users, {'id': id}));
    });

    // Ensure all users are present both by full name and URL
    _.each(users, function(user) {
      // Assert the name of the user is present in the email
      assert.ok(email.email.html.indexOf(user.canvas_full_name) > -1);

      // Assert a full link to the user's asset library is present
      var expectedLink = getToolBaseUrl(email.course, 'assetlibrary') + '?col_user=' + user.id;
      assert.ok(email.email.html.indexOf(expectedLink) > -1);
    });
  };

  /**
   * Assert that an email contains references to (and only to) a set of whiteboards
   *
   * @param  {Object[]}         email           Collected email (as per ActivitiesTestUtil.assertDailyNotifications)
   * @param  {Whiteboard[]}     whiteboards     The set of whiteboards that should be in the email
   * @api private
   */
  var assertEmailContainsWhiteboards = function(email, whiteboards) {
    // Get all the whiteboard ids in the email
    var re = new RegExp(getToolBaseUrl(email.course, 'whiteboards') + '\\?col_whiteboard=(\d+)');
    var whiteboardIds = getIdsFromURLs(email, re);

    // Ensure each user in the email is supposed to be referenced
    _.each(whiteboardIds, function(id) {
      assert.ok(_.find(whiteboards, {'id': id}));
    });

    // Ensure all whiteboards are present both by title and URL
    _.each(whiteboards, function(whiteboard) {
      // Assert the title of the whiteboard is present in the email
      assert.ok(email.email.html.indexOf(whiteboard.title) > -1);

      // Assert a full link to the whiteboard is present
      var expectedLink = getToolBaseUrl(email.course, 'whiteboards') + '?col_whiteboard=' + whiteboard.id;
      assert.ok(email.email.html.indexOf(expectedLink) > -1);
    });
  };

  /**
   * Get the base URL for a tool
   *
   * @param  {Course}   course    The course for which to get the asset library URL
   * @param  {String}   toolName  The name of the tool
   * @return {String}             The URL towards the asset library
   * @api private
   */
  var getToolBaseUrl = function(course, toolName) {
    // We expect a numeric tool ID.
    var toolId = [null, 'assetlibrary', 'dashboard', 'engagementindex', 'whiteboards'].indexOf(toolName);
    return getCourseUrl(course) + '/' + toolId;
  };

  /**
   * Get the base URL to the course's external tools
   *
   * @param  {Course}   course    The course for which to get the base URL of the course's external tools
   * @return {String}             The URL towards the base URL of the course's external tools
   * @api private
   */
  var getCourseUrl = function(course) {
    var protocol = (course.canvas.use_https) ? 'https' : 'http';
    return protocol + '://' + course.canvas.canvas_api_domain + '/external_tools';
  };

  /**
   * Get the unique ids from the URLs in an email
   *
   * @param  {Object}     email     Collected email (as per ActivitiesTestUtil.assertDailyNotifications)
   * @param  {RegExp}     re        A regular expression that can be used to parse out the id. The only group in the regex should be the id
   * @return {Number[]}             A set of ids
   * @api private
   */
  var getIdsFromURLs = function(email, re) {
    var ids = [];
    var match = re.exec(email.email.html);
    while (match) {
      ids.push(parseInt(match[1], 10));
      match = re.exec(email.email.html);
    }

    // An asset can be referenced multiple times, only return the id once
    return _.uniq(ids);
  };

  /**
   * Create a comment and reply to it
   *
   * @param  {Course}       course            The course in which to comment and reply on an asset
   * @param  {Asset}        asset             The asset on which to comment and reply
   * @param  {RestClient}   commenterClient   The client who will make the top level comment
   * @param  {RestClient}   replierClient     The client who replies to the top level comment
   * @param  {Function}     callback          Standard callback function
   * @api private
   */
  var createCommentAndReply = function(course, asset, commenterClient, replierClient, callback) {
    AssetsTestUtil.assertCreateComment(commenterClient, course, asset.id, 'This is a comment', null, function(comment) {
      AssetsTestUtil.assertCreateComment(replierClient, course, asset.id, 'This is a reply', comment.id, function() {
        return callback();
      });
    });
  };

  /**
   * Get the email greeting
   *
   * @param  {Object}   email   The email to get the greeting for
   * @return {String}           The greeting (can be null if there is none)
   */
  var getGreeting = function(email) {
    var re = /<h1.*>(.*)<\/h1>/;
    var match = email.email.html.match(re);
    if (match) {
      return match[1];
    } else {
      return null;
    }
  };

});
