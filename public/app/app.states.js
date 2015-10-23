/**
 * Copyright ©2015. The Regents of the University of California (Regents). All Rights Reserved.
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

(function(angular) {

  'use strict';

  angular.module('collabosphere').config(function($locationProvider, $stateProvider) {

    // Use the HTML5 location provider to ensure that the $location service getters
    // and setters interact with the browser URL address through the HTML5 history API
    $locationProvider.html5Mode({
      'enabled': true,
      'requireBase': false
    }).hashPrefix('!');

    // Configure the Collabosphere routes
    $stateProvider
      // Asset Library routes
      .state('assetlibraryupload', {
        'url': '/assetlibrary/upload',
        'templateUrl': '/app/assetlibrary/uploadcontainer/uploadcontainer.html',
        'controller': 'AssetLibraryUploadContainerController'
      })
      .state('assetlibraryaddlink', {
        'url': '/assetlibrary/addlink',
        'templateUrl': '/app/assetlibrary/addlinkcontainer/addlinkcontainer.html',
        'controller': 'AssetLibraryAddLinkContainerController'
      })
      .state('assetlibrarycategories', {
        'url': '/assetlibrary/categories',
        'templateUrl': '/app/assetlibrary/categories/categories.html',
        'controller': 'AssetLibraryCategoriesController'
      })
      .state('assetlibraryaddbookmarklet', {
        'url': '/assetlibrary/addbookmarklet',
        'templateUrl': '/app/assetlibrary/addbookmarklet/addbookmarklet.html',
        'controller': 'AssetLibraryAddBookmarkletController'
      })
      .state('assetlibrarylist', {
        'url': '/assetlibrary?category&user&keywords&type',
        'templateUrl': '/app/assetlibrary/list/list.html',
        'controller': 'AssetLibraryListController'
      })
      .state('assetlibrarylist.item', {
        'url': '/:assetId?whiteboard_referral&course_id&api_domain&tool_url',
        'controller': 'AssetLibraryItemController',
        'templateUrl': '/app/assetlibrary/item/item.html'
      })
      .state('assetlibrarylist.item.edit', {
        'url': '/edit',
        'controller': 'AssetLibraryEditController',
        'templateUrl': '/app/assetlibrary/edit/edit.html'
      })

      // Engagement Index routes
      .state('engagementindex', {
        'url': '/engagementindex',
        'templateUrl': '/app/engagementindex/leaderboard/leaderboard.html',
        'controller': 'LeaderboardController'
      })
      .state('pointsconfiguration', {
        'url': '/engagementindex/pointsconfiguration',
        'templateUrl': '/app/engagementindex/points/points.html',
        'controller': 'PointsController'
      })

      // Whiteboard routes
      .state('whiteboards', {
        'url': '/whiteboards',
        'templateUrl': '/app/whiteboards/list/list.html',
        'controller': 'WhiteboardsListController'
      })
      .state('whiteboardscreate', {
        'url': '/whiteboards/create',
        'templateUrl': '/app/whiteboards/create/create.html',
        'controller': 'WhiteboardsCreateController'
      })
      .state('whiteboard', {
        'url': '/whiteboards/:whiteboardId',
        'templateUrl': '/app/whiteboards/boardcontainer/boardcontainer.html',
        'controller': 'WhiteboardsBoardContainerController'
      });

  });

})(window.angular);
