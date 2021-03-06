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
var path = require('path');
var url = require('url');
var util = require('util');

var CanvasTabs = require('./model').CanvasTabs;
var MockedRequest = require('col-tests/lib/model').MockedRequest;
var TestsUtil = require('col-tests/lib/util');

/**
 * As it is infeasible to bootstrap an actual Canvas instance during the tests, the Canvas REST API
 * will be mocked. This method allows you to declare the data that should be returned during a single polling
 * run.
 *
 * Note that the mocking framework is extremely particular and demands that the mocked requests be declared
 * in the same order that they'll be received.
 *
 * @param  {Course}                 course          The course that we'll be mocking requests for
 * @param  {CanvasUser[]}           users           The users that are registered in the course
 * @param  {CanvasAssignment[]}     assignments     The assignments that are available in the course
 * @param  {CanvasDiscussion[]}     discussions     The discussion topics that are available in the course
 * @param  {CanvasSections[]}       sections        The sections of the course
 * @param  {CanvasTabs}             tabs            The tab configuration for the course
 */
var mockPollingRequests = module.exports.mockPollingRequests = function(course, users, assignments, discussions, sections, tabs) {
  // Default some parameters
  users = users || [];
  assignments = assignments || [];
  discussions = discussions || [];
  sections = sections || [];
  tabs = tabs || new CanvasTabs(course);

  mockGetCourseTabs(course, tabs);
  mockGetCourseUsers(course, users);
  mockGetCourseSections(course, sections);

  mockGetAssignments(course, assignments);
  _.each(assignments, function(assignment) {
    if (!_.isEmpty(assignment.submissions)) {
      mockGetSubmissions(course, assignment, assignment.submissions);
    }
  });

  mockGetDiscussions(course, discussions);
  _.each(discussions, function(discussion) {
    if (!_.isEmpty(discussion.getEntries())) {
      mockGetDiscussionEntries(course, discussion);
    }
  });
};

/**
 * Mock the REST API call for getting all the tabs of a course
 *
 * @param  {Course}         course    The course that we'll be mocking requests for
 * @param  {CanvasTabs}     tabs      The tab configuration for the course
 */
var mockGetCourseTabs = module.exports.mockGetCourseTabs = function(course, tabs) {
  var url = util.format('/api/v1/courses/%d/tabs', course.canvas_course_id);
  mockPagedData(course, url, tabs);
};

/**
 * Mock the REST API call for getting all the users of a course
 *
 * @param  {Course}         course    The course that we'll be mocking requests for
 * @param  {CanvasUser[]}   users     The users that are registered in the course
 */
var mockGetCourseUsers = module.exports.mockGetCourseUsers = function(course, users) {
  var url = util.format('/api/v1/courses/%d/users', course.canvas_course_id);
  mockPagedData(course, url, users);
};

/**
 * Mock the REST API call for getting all sections of a course
 *
 * @param  {Course}                 course          The course that we'll be mocking requests for
 * @param  {CanvasSection[]}        sections        The sections of the course
 */
var mockGetCourseSections = module.exports.mockGetCourseSections = function(course, sections) {
  var url = util.format('/api/v1/courses/%d/sections', course.canvas_course_id);
  mockPagedData(course, url, sections);
};

/**
 * Mock the REST API call for getting all the assignments of a course
 *
 * @param  {Course}                 course          The course that we'll be mocking requests for
 * @param  {CanvasAssignment[]}     assignments     The assignments that are available in the course
 */
var mockGetAssignments = module.exports.mockGetAssignments = function(course, assignments) {
  var url = util.format('/api/v1/courses/%d/assignments', course.canvas_course_id);
  mockPagedData(course, url, assignments);
};

/**
 * Mock the REST API call for getting all the submissions of an assignment in a course
 *
 * @param  {Course}                 course          The course that we'll be mocking requests for
 * @param  {CanvasAssignment}       assignment      The assignment for which the submissions will be retrieved
 * @param  {CanvasSubmission[]}     submissions     The assignment submissions
 */
var mockGetSubmissions = module.exports.mockGetSubmissions = function(course, assignment, submissions) {
  // The poller won't retrieve the submissions for an assigned discussion so we don't mock those requests
  if (assignment.submission_types[0] === 'discussion_topic') {
    return;
  }

  var apiUrl = util.format('/api/v1/courses/%d/assignments/%d/submissions', course.canvas_course_id, assignment.id);
  mockPagedData(course, apiUrl, submissions);

  // Some submissions might hold file attachments which will be pulled down and uploaded again.
  // These need to be mocked as well
  _.chain(submissions)
    .filter(function(submission) {
      return (submission.submission_type === 'online_upload');
    })
    .map(function(submission) {
      return submission.attachments;
    })
    .each(function(attachmentSet) {
      _.each(attachmentSet, function(attachment) {
        if (attachment.expectProcessing) {
          // The download request
          var expectedPath = url.parse(attachment.url).pathname;
          var mockedRequest = new MockedRequest('GET', expectedPath, 200, 'The file body');
          TestsUtil.getMockedCanvasAppServer(course.canvas).expect(mockedRequest);

          // Any duplicates of this attachment should not be processed a second time
          attachment.expectProcessing = false;
        }
      });
    })
    .value();
};

/**
 * Mock the REST API call for getting all the discussion topics in a course
 *
 * @param  {Course}                   course          The course that we'll be mocking requests for
 * @param  {CanvasDiscussion[]}       discussions     The discussion topics that are available in the course
 */
var mockGetDiscussions = module.exports.mockGetDiscussions = function(course, discussions) {
  var url = util.format('/api/v1/courses/%d/discussion_topics', course.canvas_course_id);
  var discussionsData = _.map(discussions, function(discussion) {
    return discussion.json();
  });
  mockPagedData(course, url, discussionsData);
};

/**
 * Mock the REST API call for getting all the discussion entries on a dicussion topic in a course
 *
 * @param  {Course}                   course          The course that we'll be mocking requests for
 * @param  {CanvasDiscussion}         discussion      The discussion for which the entries will be retrieved
 */
var mockGetDiscussionEntries = module.exports.mockGetDiscussionEntries = function(course, discussion) {
  var id = discussion.json().id;
  var url = util.format('/api/v1/courses/%d/discussion_topics/%d/entries', course.canvas_course_id, id);
  mockPagedData(course, url, discussion.getEntries());
};

/**
 * Mock one or more Canvas API requests depending on the size of the dataset that is being requested.
 * This function assumes that at most 50 items at a time will be retrieved
 *
 * @param  {Course}     course          The course that we'll be mocking requests for
 * @param  {String}     url             The url of the request
 * @param  {Object[]}   pagedData       The full set of data that is being paged
 */
var mockPagedData = function(course, url, pagedData, currentPage) {
  currentPage = currentPage || 1;

  // Canvas returns the paging data in the `link` header
  var linkHeader = getLinkHeader(url, currentPage, pagedData);

  // Get the slice of data we should return
  var prevPage = currentPage - 1;
  var responseData = pagedData.slice(prevPage * 50, currentPage * 50);

  // Mock the request for the current slice of data
  TestsUtil.getMockedCanvasAppServer(course.canvas)
    .expect(new MockedRequest('GET', url, 200, responseData, {'link': linkHeader}));

  // Mock further pages of data, if any
  if (currentPage * 50 < pagedData.length) {
    mockPagedData(course, url, pagedData, currentPage + 1);
  }
};

/**
 * Construct a `link` header given a set of data, a URL and the current page that is being retrieved
 *
 * @param  {String}     url             The API url that is being requested
 * @param  {Number}     currentPage     The page that is being retrieved
 * @param  {Object[]}   pagedData       The full set of data that is being paged
 * @return {String}                     The full link header
 * @api private
 * @see https://canvas.instructure.com/doc/api/file.pagination.html
 */
var getLinkHeader = function(url, currentPage, pagedData) {
  var lastPage = Math.ceil(pagedData.length / 50);

  // A link to the current page is always present
  var links = [getLinkHeaderPart(url, currentPage, 'current')];

  // The previous and next page links are only shown when they exist
  if (currentPage !== 1) {
    links.push(getLinkHeaderPart(url, currentPage - 1, 'prev'));
  }
  if (currentPage < lastPage) {
    links.push(getLinkHeaderPart(url, currentPage + 1, 'next'));
  }

  // The first and last links are also always included
  links.push(getLinkHeaderPart(url, 1, 'first'));
  links.push(getLinkHeaderPart(url, lastPage, 'last'));
  return links.join(',');
};

/**
 * Construct part of a `link` header
 *
 * @param  {String}     url       The API url that is being requested
 * @param  {Number}     page      The page for the link part
 * @param  {String}     name      The name of the link. One of `current`, `prev`, `next`, `first` or `last`
 * @return {String}               A link part
 * @api private
 */
var getLinkHeaderPart = function(url, page, name) {
  return '<http://localhost:3001' + url + '%3Fpage= ' + page + '&per_page=50; rel="' + name + '"';
};
