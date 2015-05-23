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

  angular.module('collabosphere').config(function($routeProvider, $locationProvider) {

    // Use the HTML5 location provider to ensure that the $location service getters
    // and setters interact with the browser URL address through the HTML5 history API
    $locationProvider.html5Mode({
      'enabled': true,
      'requireBase': false
    }).hashPrefix('!');

    // Configure the Collabosphere routes
    $routeProvider.
    // Asset Library routes
    when('/assetlibrary', {
      templateUrl: '/app/assetlibrary/list/list.html'
    }).
    when('/assetlibrary/upload', {
      templateUrl: '/app/assetlibrary/upload/upload.html'
    }).
    when('/assetlibrary/addlink', {
      templateUrl: '/app/assetlibrary/addlink/addlink.html'
    }).
    when('/assetlibrary/addthought', {
      templateUrl: '/app/assetlibrary/addthought/addthought.html'
    }).
    when('/assetlibrary/categories', {
      templateUrl: '/app/assetlibrary/categories/categories.html'
    }).
    when('/assetlibrary/addbookmarklet', {
      templateUrl: '/app/assetlibrary/addbookmarklet/addbookmarklet.html'
    }).
    when('/assetlibrary/:assetId', {
      templateUrl: '/app/assetlibrary/item/item.html'
    }).

    // Engagement Index routes
    when('/engagementindex', {
      templateUrl: 'app/engagementindex/leaderboard/leaderboard.html'
    }).
    when('/engagementindex/points', {
      templateUrl: 'app/engagementindex/points/points.html'
    }).

    // Unrecognized route
    otherwise({
      templateUrl: '404.html'
    });

  });

})(window.angular);
