/*!
 * Copyright 2015 UC Berkeley (UCB) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
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
        'url': '/assetlibrary?category&user&keywords&type&course_id&api_domain&tool_url',
        'templateUrl': '/app/assetlibrary/list/list.html',
        'controller': 'AssetLibraryListController'
      })
      .state('assetlibrarylist.item', {
        'views': {
          'item': {
            'controller': 'AssetLibraryItemController',
            'templateUrl': '/app/assetlibrary/item/item.html'
          }
        },
        'url': '/:assetId?whiteboard_referral'
      })
      .state('assetlibrarylist.item.edit', {
        'views': {
          'edit': {
            'controller': 'AssetLibraryEditController',
            'templateUrl': '/app/assetlibrary/edit/edit.html'
          }
        },
        'url': '/edit'
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
