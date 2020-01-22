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

(function(angular) {

  'use strict';

  angular.module('collabosphere').directive('search', function() {
    return {
      // Restrict the directive to only match element names
      // @see https://docs.angularjs.org/guide/directive#template-expanding-directive
      'restrict': 'E',

      // Define how the directive's scope is separated from the caller's scope
      // @see https://docs.angularjs.org/guide/directive#isolating-the-scope-of-a-directive
      'scope': {
        'isAdvancedSearch': '=isAdvancedSearch',
        'keywords': '=searchOptionsKeywords',
        'category': '=searchOptionsCategory',
        'user': '=searchOptionsUser',
        'section': '=searchOptionsSection',
        'type': '=searchOptionsType',
        'sort': '=searchOptionsSort'
      },
      'templateUrl': '/app/assetlibrary/search/search.html',
      'controller': function($scope, assetLibraryCategoriesFactory, me, userFactory) {

        // Make the me object available to the scope
        $scope.me = me;

        // Categories of the current course
        $scope.categories = null;

        // Users of the current course
        $scope.users = null;

        // Sections of the current course
        $scope.sections = null;

        /**
         * Emit an event indicating that we want to search through the assets
         *
         * @return {void}
         */
        var search = $scope.search = function() {
          if ($scope.isAdvancedSearch) {
            var categoryObject = $scope.category ? _.find($scope.categories, {'id': $scope.category}) : null;
            var userObject = $scope.user ? _.find($scope.users, {'id': $scope.user}) : null;

            var searchOptions = {
              'keywords': $scope.keywords,
              'category': $scope.category,
              'user': $scope.user,
              'section': $scope.section,
              'type': $scope.type,
              'sort': $scope.sort,
              'categoryObject': categoryObject,
              'userObject': userObject
            };
            $scope.$emit('assetLibrarySearchSearch', searchOptions);

          } else {
            $scope.$emit('assetLibrarySearchSearch', {'keywords': $scope.keywords});
          }
        };

        /**
         * Show the simple search view
         *
         * @return {void}
         */
        var showSimpleView = $scope.showSimpleView = function() {
          $scope.isAdvancedSearch = false;

          // Trigger a search so other components can re-initialize the list
          search();
        };

        /**
         * Show the advanced search view
         *
         * @return {void}
         */
        var showAdvancedView = $scope.showAdvancedView = function() {
          $scope.isAdvancedSearch = true;
          getAdvancedViewData();
        };

        /**
         * Get all users and categories in the current course
         *
         * @return {void}
         */
        var getAdvancedViewData = function() {
          if (!$scope.users) {
            userFactory.getAllUsers().success(function(users) {
              $scope.users = users;

              // User can have zero or more sections
              var sections = _(users)
                .map('canvas_course_sections')
                .flatten()
                .uniq()
                .compact()
                .sort()
                .value();

              // Section filter requires two or more sections
              $scope.sections = sections.length > 1 ? sections : null;
            });
          }

          if (!$scope.categories) {
            assetLibraryCategoriesFactory.getCategories().success(function(categories) {
              $scope.categories = categories;
            });
          }
        };

        if ($scope.isAdvancedSearch) {
          getAdvancedViewData();
        }
      }
    };
  });

}(window.angular));
