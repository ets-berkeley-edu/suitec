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
var util = require('util');

var ActivitiesTestsUtil = require('col-activities/tests/util');
var AssetsTestsUtil = require('col-assets/tests/util');
var AnalyticsTestsUtil = require('./util');
var LtiTestsUtil = require('col-lti/tests/util');
var TestsUtil = require('col-tests');
var UsersTestsUtil = require('col-users/tests/util');
var WhiteboardsTestsUtil = require('col-whiteboards/tests/util');

describe('Analytics', function() {
  describe('Caliper', function() {

    describe('LTI launch events', function() {

      it('tracks an Asset Library launch', function(callback) {
        var client = TestsUtil.getAnonymousClient();
        var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
        var user = TestsUtil.generateUser(global.tests.canvas.ucberkeley);

        AnalyticsTestsUtil.expectCaliperEvent(user, course, {
          'type': 'NavigationEvent',
          'action': 'NavigatedTo',
          'object': {
            'id': 'http://suitec.berkeley/lti/assetlibrary.xml',
            'type': 'SoftwareApplication',
            'name': 'Asset Library'
          }
        });

        AnalyticsTestsUtil.onExpectationResult(callback);

        LtiTestsUtil.assertAssetLibraryLaunchSucceeds(client, course, user, _.noop);
      });

      it('tracks an Engagement Index launch', function(callback) {
        var client = TestsUtil.getAnonymousClient();
        var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
        var user = TestsUtil.generateUser(global.tests.canvas.ucberkeley);

        AnalyticsTestsUtil.expectCaliperEvent(user, course, {
          'type': 'NavigationEvent',
          'action': 'NavigatedTo',
          'object': {
            'id': 'http://suitec.berkeley/lti/engagementindex.xml',
            'type': 'SoftwareApplication',
            'name': 'Engagement Index'
          }
        });

        AnalyticsTestsUtil.onExpectationResult(callback);

        LtiTestsUtil.assertEngagementIndexLaunchSucceeds(client, course, user, _.noop);
      });

      it('tracks a Whiteboards launch', function(callback) {
        var client = TestsUtil.getAnonymousClient();
        var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
        var user = TestsUtil.generateUser(global.tests.canvas.ucberkeley);

        AnalyticsTestsUtil.expectCaliperEvent(user, course, {
          'type': 'NavigationEvent',
          'action': 'NavigatedTo',
          'object': {
            'id': 'http://suitec.berkeley/lti/whiteboards.xml',
            'type': 'SoftwareApplication',
            'name': 'Whiteboards'
          }
        });

        AnalyticsTestsUtil.onExpectationResult(callback);

        LtiTestsUtil.assertWhiteboardsLaunchSucceeds(client, course, user, _.noop);
      });

      it('tracks an Impact Studio launch', function(callback) {
        var client = TestsUtil.getAnonymousClient();
        var course = TestsUtil.generateCourse(global.tests.canvas.ucberkeley);
        var user = TestsUtil.generateUser(global.tests.canvas.ucberkeley);

        AnalyticsTestsUtil.expectCaliperEvent(user, course, {
          'type': 'NavigationEvent',
          'action': 'NavigatedTo',
          'object': {
            'id': 'http://suitec.berkeley/lti/dashboard.xml',
            'type': 'SoftwareApplication',
            'name': 'Impact Studio'
          }
        });

        AnalyticsTestsUtil.onExpectationResult(callback);

        LtiTestsUtil.assertImpactStudioLaunchSucceeds(client, course, user, _.noop);
      });
    });

    describe('Asset library view events', function() {

      it('tracks an Asset Library listing', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created']);

        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          AssetsTestsUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset1) {
            AssetsTestsUtil.assertCreateLink(client, course, 'UC Irvine', 'http://www.uci.edu/', null, function(asset2) {

              AnalyticsTestsUtil.expectCaliperEvent(user, course, {
                'type': 'ViewEvent',
                'action': 'Viewed',
                'object': {
                  'id': util.format('http://suitec.berkeley/api/%s/%s/assets', course.canvas.canvas_api_domain, course.id),
                  'type': 'DigitalResourceCollection'
                },
                'extensions': {
                  'queryResultsOffset': 0,
                  'queryResultsTotal': 2
                }
              });

              AnalyticsTestsUtil.onExpectationResult(callback);

              AssetsTestsUtil.assertGetAssets(client, course, null, null, null, null, 2, _.noop);
            });
          });
        });
      });

      it('tracks an Asset Library search', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created']);

        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          AssetsTestsUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset1) {
            AssetsTestsUtil.assertCreateLink(client, course, 'UC Irvine', 'http://www.uci.edu/', null, function(asset2) {

              AnalyticsTestsUtil.expectCaliperEvent(user, course, {
                'type': 'Event',
                'action': 'Searched',
                'object': {
                  'id': util.format('http://suitec.berkeley/api/%s/%s/assets', course.canvas.canvas_api_domain, course.id),
                  'type': 'DigitalResourceCollection'
                },
                'extensions': {
                  'queryResultsOffset': 0,
                  'queryResultsTotal': 1,
                  'assetSearchKeywords': 'irvine'
                }
              });

              AnalyticsTestsUtil.onExpectationResult(callback);

              AssetsTestsUtil.assertGetAssets(client, course, {'keywords': 'irvine'}, null, null, null, 1, _.noop);
            });
          });
        });
      });

      it('tracks an asset view', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created']);

        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          AssetsTestsUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {

            AnalyticsTestsUtil.expectCaliperEvent(user, course, {
              'type': 'ViewEvent',
              'action': 'Viewed',
              'object': {
                'id': util.format('http://suitec.berkeley/api/%s/%s/assets/%s', course.canvas.canvas_api_domain, course.id, asset.id),
                'type': 'DigitalResource',
                'name': 'UC Davis',
                'creators': [
                  {
                    'id': util.format('http://%s/users/%s', course.canvas.canvas_api_domain, user.id),
                    'type': 'Person',
                    'name': user.fullName
                  }
                ],
                'extensions': {
                  'assetType': 'link',
                  'assetUrl': 'http://www.ucdavis.edu/',
                  'assetCommentCount': 0,
                  'assetLikeCount': 0,
                  'assetPinCount': 0,
                  'assetViewCount': 0
                }
              }
            });

            AnalyticsTestsUtil.onExpectationResult(callback);

            AssetsTestsUtil.assertGetAsset(client, course, asset.id, asset, 0, _.noop);
          });
        });
      });
    });

    describe('Asset creation and modification', function() {

      it('tracks link asset creation', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions([ 'NavigatedTo' ]);

        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          var linkTitle = 'UC Berkeley';
          var linkUrl = 'http://www.berkeley.edu';
          var linkProperties = {
            'description': 'University of California, Berkeley homepage',
            'source': 'http://www.universityofcalifornia.edu/uc-system'
          };

          AnalyticsTestsUtil.expectCaliperEvent(user, course, {
            'type': 'Event',
            'action': 'Created',
            'object': {
              'type': 'DigitalResource',
              'name': linkTitle,
              'description': linkProperties.description,
              'creators': [
                {
                  'id': util.format('http://%s/users/%s', course.canvas.canvas_api_domain, user.id),
                  'type': 'Person',
                  'name': user.fullName
                }
              ],
              'extensions': {
                'assetSource': linkProperties.source,
                'assetType': 'link',
                'assetUrl': linkUrl
              }
            },
            'extensions': {
              'assetCreationViaBookmarklet': false
            }
          });

          AnalyticsTestsUtil.onExpectationResult(callback);

          AssetsTestsUtil.assertCreateLink(client, course, linkTitle, linkUrl, linkProperties, _.noop);
        });
      });

      it('tracks file asset creation', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions([ 'NavigatedTo' ]);

        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {

          var expectImageWithTitle = function(title) {
            AnalyticsTestsUtil.expectCaliperEvent(user, course, {
              'type': 'Event',
              'action': 'Created',
              'object': {
                'type': 'ImageObject',
                'creators': [
                  {
                    'id': util.format('http://%s/users/%s', course.canvas.canvas_api_domain, user.id),
                    'type': 'Person',
                    'name': user.fullName
                  }
                ],
                'extensions': {
                  'assetType': 'file'
                }
              }
            });
          };
          expectImageWithTitle('UC Davis');
          expectImageWithTitle('logo-ucberkeley.png');
          expectImageWithTitle('UC Berkeley');

          AnalyticsTestsUtil.onExpectationResult(callback);

          AssetsTestsUtil.assertFileCreateAndStorage(client, course, null, _.noop);
        });
      });

      it('tracks asset modification', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created']);

        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          AssetsTestsUtil.assertCreateLink(client, course, 'UC Davis', 'http://www.berkeley.edu/', null, function(asset) {

            var modifiedTitle = 'UC Berkeley';
            var modifiedDescription = 'University of California, Berkeley';

            AnalyticsTestsUtil.expectCaliperEvent(user, course, {
              'type': 'Event',
              'action': 'Modified',
              'object': {
                'id': util.format('http://suitec.berkeley/api/%s/%s/assets/%s', course.canvas.canvas_api_domain, course.id, asset.id),
                'type': 'DigitalResource',
                'name': modifiedTitle,
                'description': modifiedDescription,
                'creators': [
                  {
                    'id': util.format('http://%s/users/%s', course.canvas.canvas_api_domain, user.id),
                    'type': 'Person',
                    'name': user.fullName
                  }
                ]
              }
            });

            AnalyticsTestsUtil.onExpectationResult(callback);

            AssetsTestsUtil.assertEditAsset(client, course, asset.id, modifiedTitle, {'description': modifiedDescription}, _.noop);
          });
        });
      });
    });

    describe('Asset (dis/un)liking', function() {

      it('tracks like creation and removal', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created', 'Viewed']);

        TestsUtil.getAssetLibraryClient(null, null, null, function(creatorClient, creatorCourse, creatorUser) {
          AssetsTestsUtil.assertCreateLink(creatorClient, creatorCourse, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
            TestsUtil.getAssetLibraryClient(null, creatorCourse, null, function(reactorClient, course, reactorUser) {

              var caliperAssetId = util.format('http://suitec.berkeley/api/%s/%s/assets/%s', course.canvas.canvas_api_domain, course.id, asset.id);
              var caliperUserId = util.format('http://%s/users/%s', course.canvas.canvas_api_domain, reactorUser.id);
              var caliperLikeId = util.format('%s/likes/%s', caliperAssetId, reactorUser.id);

              AnalyticsTestsUtil.expectCaliperEvent(reactorUser, course, {
                'type': 'Event',
                'action': 'Liked',
                'object': {
                  'id': caliperAssetId,
                  'type': 'DigitalResource'
                },
                'generated': {
                  'id': caliperLikeId,
                  'type': 'Annotation',
                  'name': 'Like',
                  'annotator': caliperUserId,
                  'annotated': caliperAssetId
                }
              });

              AnalyticsTestsUtil.expectCaliperEvent(reactorUser, course, {
                'type': 'Event',
                'action': 'Removed',
                'object': caliperLikeId
              });

              AnalyticsTestsUtil.onExpectationResult(callback);

              AssetsTestsUtil.assertLike(reactorClient, course, asset.id, true, function() {
                AssetsTestsUtil.assertLike(reactorClient, course, asset.id, null, _.noop);
              });
            });
          });
        });
      });

      it('tracks dislike creation and removal', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created', 'Viewed']);

        TestsUtil.getAssetLibraryClient(null, null, null, function(creatorClient, creatorCourse, creatorUser) {
          AssetsTestsUtil.assertCreateLink(creatorClient, creatorCourse, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
            TestsUtil.getAssetLibraryClient(null, creatorCourse, null, function(reactorClient, course, reactorUser) {

              var caliperAssetId = util.format('http://suitec.berkeley/api/%s/%s/assets/%s', course.canvas.canvas_api_domain, course.id, asset.id);
              var caliperUserId = util.format('http://%s/users/%s', course.canvas.canvas_api_domain, reactorUser.id);
              var caliperDislikeId = util.format('%s/likes/%s', caliperAssetId, reactorUser.id);

              AnalyticsTestsUtil.expectCaliperEvent(reactorUser, course, {
                'type': 'Event',
                'action': 'Disliked',
                'object': {
                  'id': caliperAssetId,
                  'type': 'DigitalResource'
                },
                'generated': {
                  'id': caliperDislikeId,
                  'type': 'Annotation',
                  'name': 'Dislike',
                  'annotator': caliperUserId,
                  'annotated': caliperAssetId
                }
              });

              AnalyticsTestsUtil.expectCaliperEvent(reactorUser, course, {
                'type': 'Event',
                'action': 'Removed',
                'object': caliperDislikeId
              });

              AnalyticsTestsUtil.onExpectationResult(callback);

              AssetsTestsUtil.assertLike(reactorClient, course, asset.id, false, function() {
                AssetsTestsUtil.assertLike(reactorClient, course, asset.id, null, _.noop);
              });
            });
          });
        });
      });
    });

    describe('Asset comments', function() {

      it('tracks comment creation and reply', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created', 'Viewed']);

        TestsUtil.getAssetLibraryClient(null, null, null, function(creatorClient, creatorCourse, creatorUser) {
          AssetsTestsUtil.assertCreateLink(creatorClient, creatorCourse, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
            TestsUtil.getAssetLibraryClient(null, creatorCourse, null, function(commenterClient, course, commenterUser) {

              var caliperAssetId = util.format('http://suitec.berkeley/api/%s/%s/assets/%s', course.canvas.canvas_api_domain, course.id, asset.id);

              AnalyticsTestsUtil.expectCaliperEvent(commenterUser, course, {
                'type': 'MessageEvent',
                'action': 'Posted',
                'object': {
                  'type': 'Message',
                  'body': 'Comment 1',
                  'creators': [ util.format('http://%s/users/%s', course.canvas.canvas_api_domain, commenterUser.id) ]
                },
                'referrer': caliperAssetId
              });

              AssetsTestsUtil.assertCreateComment(commenterClient, course, asset.id, 'Comment 1', null, function(comment) {
                AnalyticsTestsUtil.expectCaliperEvent(commenterUser, course, {
                  'type': 'MessageEvent',
                  'action': 'Posted',
                  'object': {
                    'type': 'Message',
                    'body': 'Comment 1 Reply 1',
                    'creators': [ util.format('http://%s/users/%s', course.canvas.canvas_api_domain, commenterUser.id) ],
                    'replyTo': util.format('%s/comments/%s', caliperAssetId, comment.id)
                  },
                  'referrer': caliperAssetId
                });

                AnalyticsTestsUtil.onExpectationResult(callback);

                AssetsTestsUtil.assertCreateComment(commenterClient, course, asset.id, 'Comment 1 Reply 1', comment.id, _.noop);
              });
            });
          });
        });
      });

      it('tracks comment editing', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions([
          'NavigatedTo',
          'Created',
          'Viewed',
          'Posted'
        ]);

        TestsUtil.getAssetLibraryClient(null, null, null, function(creatorClient, creatorCourse, creatorUser) {
          AssetsTestsUtil.assertCreateLink(creatorClient, creatorCourse, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
            TestsUtil.getAssetLibraryClient(null, creatorCourse, null, function(commenterClient, course, commenterUser) {
              AssetsTestsUtil.assertCreateComment(commenterClient, course, asset.id, 'Comment 1', null, function(comment) {

                var caliperAssetId = util.format('http://suitec.berkeley/api/%s/%s/assets/%s', course.canvas.canvas_api_domain, course.id, asset.id);

                AnalyticsTestsUtil.expectCaliperEvent(commenterUser, course, {
                  'type': 'Event',
                  'action': 'Modified',
                  'object': {
                    'type': 'Message',
                    'body': 'Updated comment 1',
                    'creators': [ util.format('http://%s/users/%s', course.canvas.canvas_api_domain, commenterUser.id) ]
                  }
                });

                AnalyticsTestsUtil.onExpectationResult(callback);

                AssetsTestsUtil.assertEditComment(commenterClient, course, asset.id, comment.id, 'Updated comment 1', _.noop);
              });
            });
          });
        });
      });

      it('tracks comment deletion', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions([
          'NavigatedTo',
          'Created',
          'Viewed',
          'Posted'
        ]);

        TestsUtil.getAssetLibraryClient(null, null, null, function(creatorClient, creatorCourse, creatorUser) {
          AssetsTestsUtil.assertCreateLink(creatorClient, creatorCourse, 'UC Davis', 'http://www.ucdavis.edu/', null, function(asset) {
            TestsUtil.getAssetLibraryClient(null, creatorCourse, null, function(commenterClient, course, commenterUser) {
              AssetsTestsUtil.assertCreateComment(commenterClient, course, asset.id, 'Comment 1', null, function(comment) {

                var caliperAssetId = util.format('http://suitec.berkeley/api/%s/%s/assets/%s', course.canvas.canvas_api_domain, course.id, asset.id);

                AnalyticsTestsUtil.expectCaliperEvent(commenterUser, course, {
                  'type': 'Event',
                  'action': 'Deleted',
                  'object': util.format('%s/comments/%s', caliperAssetId, comment.id)
                });

                AnalyticsTestsUtil.onExpectationResult(callback);

                AssetsTestsUtil.assertDeleteComment(commenterClient, course, asset.id, comment.id, _.noop);
              });
            });
          });
        });
      });
    });

    describe('Engagement Index', function() {

      it('tracks leaderboard views', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions([ 'NavigatedTo' ]);
        var instructorUser = TestsUtil.generateInstructor();
        TestsUtil.getAssetLibraryClient(null, null, instructorUser, function(client, course, user) {

          AnalyticsTestsUtil.expectCaliperEvent(user, course, {
            'type': 'ViewEvent',
            'action': 'Viewed',
            'object': {
              'id': util.format('http://suitec.berkeley/api/%s/%s/leaderboard', course.canvas.canvas_api_domain, course.id),
              'type': 'DigitalResource'
            }
          });

          AnalyticsTestsUtil.onExpectationResult(callback);

          UsersTestsUtil.assertGetLeaderboard(client, course, 1, true, _.noop);
        });
      });

      it('tracks points configuration views', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions([ 'NavigatedTo' ]);
        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {

          AnalyticsTestsUtil.expectCaliperEvent(user, course, {
            'type': 'ViewEvent',
            'action': 'Viewed',
            'object': {
              'id': util.format('http://suitec.berkeley/api/%s/%s/pointsconfiguration', course.canvas.canvas_api_domain, course.id),
              'type': 'DigitalResource'
            }
          });

          AnalyticsTestsUtil.onExpectationResult(callback);

          ActivitiesTestsUtil.assertGetActivityTypeConfiguration(client, course, _.noop);
        });
      });

      it('tracks opt-in and opt-out', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Viewed']);
        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {

          var leaderboardId = util.format('http://suitec.berkeley/api/%s/%s/leaderboard', course.canvas.canvas_api_domain, course.id);
          AnalyticsTestsUtil.expectCaliperEvent(user, course, {
            'type': 'Event',
            'action': 'Showed',
            'object': {
              'id': leaderboardId,
              'type': 'DigitalResource'
            }
          });

          AnalyticsTestsUtil.onExpectationResult(callback);

          UsersTestsUtil.assertUpdateSharePoints(client, course, true, function(me) {
            AnalyticsTestsUtil.expectCaliperEvent(user, course, {
              'type': 'Event',
              'action': 'Hid',
              'object': {
                'id': leaderboardId,
                'type': 'DigitalResource'
              }
            });

            UsersTestsUtil.assertUpdateSharePoints(client, course, false, _.noop);
          });
        });
      });
    });

    describe('Whiteboard view events', function() {

      it('tracks a Whiteboards listing', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created']);
        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          WhiteboardsTestsUtil.assertCreateWhiteboard(client, course, 'Godzilla', null, function(whiteboard1) {
            WhiteboardsTestsUtil.assertCreateWhiteboard(client, course, 'Monster Zero', null, function(whiteboard2) {

              AnalyticsTestsUtil.expectCaliperEvent(user, course, {
                'type': 'ViewEvent',
                'action': 'Viewed',
                'object': {
                  'id': util.format('http://suitec.berkeley/api/%s/%s/whiteboards', course.canvas.canvas_api_domain, course.id),
                  'type': 'DigitalResourceCollection'
                },
                'extensions': {
                  'queryResultsOffset': 0,
                  'queryResultsTotal': 2
                }
              });

              AnalyticsTestsUtil.onExpectationResult(callback);

              WhiteboardsTestsUtil.assertGetWhiteboards(client, course, null, null, null, 2, _.noop);
            });
          });
        });
      });

      it('tracks a Whiteboards search', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created']);
        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          WhiteboardsTestsUtil.assertCreateWhiteboard(client, course, 'Godzilla', null, function(whiteboard1) {
            WhiteboardsTestsUtil.assertCreateWhiteboard(client, course, 'Monster Zero', null, function(whiteboard2) {

              AnalyticsTestsUtil.expectCaliperEvent(user, course, {
                'type': 'Event',
                'action': 'Searched',
                'object': {
                  'id': util.format('http://suitec.berkeley/api/%s/%s/whiteboards', course.canvas.canvas_api_domain, course.id),
                  'type': 'DigitalResourceCollection'
                },
                'extensions': {
                  'queryResultsOffset': 0,
                  'queryResultsTotal': 1,
                  'whiteboardsSearchKeywords': 'zero'
                }
              });

              AnalyticsTestsUtil.onExpectationResult(callback);

              WhiteboardsTestsUtil.assertGetWhiteboards(client, course, {'keywords': 'zero'}, null, null, 1, _.noop);
            });
          });
        });
      });

      it('tracks a whiteboard view', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created']);
        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          WhiteboardsTestsUtil.assertCreateWhiteboard(client, course, 'Monster Zero', null, function(whiteboard) {

            AnalyticsTestsUtil.expectCaliperEvent(user, course, {
              'type': 'ViewEvent',
              'action': 'Viewed',
              'object': {
                'id': util.format('http://suitec.berkeley/api/%s/%s/whiteboards/%s', course.canvas.canvas_api_domain, course.id, whiteboard.id),
                'type': 'DigitalResource',
                'name': 'Monster Zero',
                'creators': [
                  {
                    'id': util.format('http://%s/users/%s', course.canvas.canvas_api_domain, user.id),
                    'type': 'Person',
                    'name': user.fullName
                  }
                ]
              }
            });

            AnalyticsTestsUtil.onExpectationResult(callback);

            WhiteboardsTestsUtil.assertGetWhiteboard(client, course, whiteboard.id, whiteboard, 1, _.noop);
          });
        });
      });
    });

    describe('Whiteboard creation and editing', function() {

      it('tracks whiteboard creation', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions([ 'NavigatedTo' ]);
        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {

          AnalyticsTestsUtil.expectCaliperEvent(user, course, {
            'type': 'Event',
            'action': 'Created',
            'object': {
              'type': 'DigitalResource',
              'name': 'Monster Zero',
              'creators': [
                {
                  'id': util.format('http://%s/users/%s', course.canvas.canvas_api_domain, user.id),
                  'type': 'Person',
                  'name': user.fullName
                }
              ]
            }
          });

          AnalyticsTestsUtil.onExpectationResult(callback);

          WhiteboardsTestsUtil.assertCreateWhiteboard(client, course, 'Monster Zero', null, _.noop);
        });
      });

      it('tracks modification of whiteboard settings', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created', 'Viewed']);
        TestsUtil.getAssetLibraryClient(null, null, null, function(client1, course1, user1) {
          TestsUtil.getAssetLibraryClient(null, course1, null, function(client2, course, user2) {
            UsersTestsUtil.assertGetMe(client1, course, null, function(me1) {
              UsersTestsUtil.assertGetMe(client2, course, null, function(me2) {
                WhiteboardsTestsUtil.assertCreateWhiteboard(client1, course, 'Monster Zero', null, function(whiteboard) {

                  AnalyticsTestsUtil.expectCaliperEvent(user1, course, {
                    'type': 'Event',
                    'action': 'Modified',
                    'object': {
                      'id': util.format('http://suitec.berkeley/api/%s/%s/whiteboards/%s', course.canvas.canvas_api_domain, course.id, whiteboard.id),
                      'type': 'DigitalResource',
                      'name': 'Godzilla',
                      'creators': [
                        {
                          'id': util.format('http://%s/users/%s', course.canvas.canvas_api_domain, user1.id),
                          'type': 'Person',
                          'name': user1.fullName
                        },
                        {
                          'id': util.format('http://%s/users/%s', course.canvas.canvas_api_domain, user2.id),
                          'type': 'Person',
                          'name': user2.fullName
                        }
                      ]
                    }
                  });

                  AnalyticsTestsUtil.onExpectationResult(callback);

                  WhiteboardsTestsUtil.assertEditWhiteboard(client1, course, whiteboard.id, 'Godzilla', [me1.id, me2.id], _.noop);
                });
              });
            });
          });
        });
      });
    });

    describe('Whiteboard chat messages', function() {

      it('tracks a whiteboard chat message listing', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created']);
        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          WhiteboardsTestsUtil.assertCreateWhiteboard(client, course, 'Monster Zero', null, function(whiteboard) {
            WhiteboardsTestsUtil.assertCreateChatMessage(client, course, whiteboard.id, 'Message 1', function() {
              WhiteboardsTestsUtil.assertCreateChatMessage(client, course, whiteboard.id, 'Message 2', function() {
                var whiteboardId = util.format('http://suitec.berkeley/api/%s/%s/whiteboards/%s', course.canvas.canvas_api_domain, course.id, whiteboard.id);

                AnalyticsTestsUtil.expectCaliperEvent(user, course, {
                  'type': 'ViewEvent',
                  'action': 'Viewed',
                  'object': {
                    'id': util.format('%s/chats', whiteboardId),
                    'type': 'DigitalResourceCollection'
                  },
                  'referrer': whiteboardId,
                  'extensions': {
                    'queryResultsTotal': 2
                  }
                });

                AnalyticsTestsUtil.onExpectationResult(callback);

                WhiteboardsTestsUtil.assertGetChatMessages(client, course, whiteboard.id, 2, _.noop);
              });
            });
          });
        });
      });
    });

    describe('Whiteboard export', function() {

      it('tracks whiteboard export to Asset Library', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created', 'Viewed']);
        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          WhiteboardsTestsUtil.assertCreateWhiteboard(client, course, 'Monster Zero', null, function(whiteboard) {
            WhiteboardsTestsUtil.addElementsToWhiteboard(client, course, whiteboard, function() {

              var creators = [
                {
                  'id': util.format('http://%s/users/%s', course.canvas.canvas_api_domain, user.id),
                  'type': 'Person',
                  'name': user.fullName
                }
              ];

              AnalyticsTestsUtil.expectCaliperEvent(user, course, {
                'type': 'Event',
                'action': 'Shared',
                'object': {
                  'id': util.format('http://suitec.berkeley/api/%s/%s/whiteboards/%s', course.canvas.canvas_api_domain, course.id, whiteboard.id),
                  'type': 'DigitalResource',
                  'name': 'Monster Zero',
                  'creators': creators
                },
                'generated': {
                  'type': 'DigitalResource',
                  'name': 'Monster Zero',
                  'creators': creators,
                  'extensions': {
                    'assetCommentCount': 0,
                    'assetLikeCount': 0,
                    'assetPinCount': 0,
                    'assetSource': whiteboard.id,
                    'assetType': 'whiteboard',
                    'assetViewCount': 0
                  }
                }
              });

              AnalyticsTestsUtil.onExpectationResult(callback);

              WhiteboardsTestsUtil.assertExportWhiteboardToAsset(client, course, whiteboard.id, null, null, _.noop);
            });
          });
        });
      });

      it('tracks whiteboard export to image', function(callback) {
        AnalyticsTestsUtil.allowCaliperActions(['NavigatedTo', 'Created', 'Viewed']);
        TestsUtil.getAssetLibraryClient(null, null, null, function(client, course, user) {
          WhiteboardsTestsUtil.assertCreateWhiteboard(client, course, 'Monster Zero', null, function(whiteboard) {
            WhiteboardsTestsUtil.addElementsToWhiteboard(client, course, whiteboard, function() {

              AnalyticsTestsUtil.expectCaliperEvent(user, course, {
                'type': 'Event',
                'action': 'Retrieved',
                'object': {
                  'id': util.format('http://suitec.berkeley/api/%s/%s/whiteboards/%s', course.canvas.canvas_api_domain, course.id, whiteboard.id),
                  'type': 'DigitalResource',
                  'name': 'Monster Zero',
                  'creators': [
                    {
                      'id': util.format('http://%s/users/%s', course.canvas.canvas_api_domain, user.id),
                      'type': 'Person',
                      'name': user.fullName
                    }
                  ]
                }
              });

              AnalyticsTestsUtil.onExpectationResult(callback);

              WhiteboardsTestsUtil.assertExportWhiteboardToPng(client, course, whiteboard.id, _.noop);
            });
          });
        });
      });

    });
  });
});
