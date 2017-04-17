/**
 * Copyright ©2017. The Regents of the University of California (Regents). All Rights Reserved.
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

  angular.module('collabosphere').directive('aggregatedSearch', function() {
    return {
      // @see https://docs.angularjs.org/guide/directive#template-expanding-directive
      'restrict': 'E',

      // @see https://docs.angularjs.org/guide/directive#isolating-the-scope-of-a-directive
      'scope': {
        'isAdvancedSearch': '=isAdvancedSearch',
        'keywords': '=searchOptionsKeywords',
        'category': '=searchOptionsCategory',
        'user': '=searchOptionsUser',
        'type': '=searchOptionsType',
        'sort': '=searchOptionsSort'
      },
      'templateUrl': '/app/dashboard/search/searchform.html',
      'controller': function(assetLibraryCategoriesFactory, userFactory, $scope, $state) {

        // Variable that keeps track of the categories in the current course
        $scope.categories = null;

        // Variable that keeps track of the users in the current course
        $scope.users = null;

        /**
         * Emit an event indicating that we want to search through users and assets
         *
         * @return {void}
         */
        var search = $scope.search = function() {
          if ($state.current.name !== 'aggregatedsearch') {
            $state.go('aggregatedsearch', {'keywords': $scope.keywords});

          } else if ($scope.isAdvancedSearch) {
            var categoryObject = null;
            var userObject = null;
            if ($scope.category) {
              categoryObject = _.find($scope.categories, {'id': $scope.category});
            }
            if ($scope.user) {
              userObject = _.find($scope.users, {'id': $scope.user});
            }
            var searchOptions = {
              'keywords': $scope.keywords,
              'category': $scope.category,
              'user': $scope.user,
              'type': $scope.type,
              'sort': $scope.sort,
              'categoryObject': categoryObject,
              'userObject': userObject
            };
            $scope.$emit('aggregatedSearch', searchOptions);
          } else {
            $scope.$emit('aggregatedSearch', {'keywords': $scope.keywords});
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
