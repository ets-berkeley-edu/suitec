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

  angular.module('collabosphere').controller('AggregatedSearchController', function(assetLibraryFactory, me, utilService, $scope, $state) {

    $scope.me = me;

    // Search type can be 'simple' or 'advanced'. If type is null then no search is active.
    $scope.search = {
      type: null,
      offerAdvancedOptions: true,
      options: {
        keywords: $state.params.keywords || '',
        category: parseInt($state.params.category, 10) || '',
        user: parseInt($state.params.user, 10) || '',
        type: $state.params.type || '',
        sort: $state.params.sort || ''
      },
      assets: {
        blockOtherSearches: false,
        results: [],
        page: 0,
        message: ''
      },
      users: {
        results: [],
        message: ''
      }
    };

    /**
     * Users of current course
     *
     * @return {void}
     */
    var findUsers = $scope.findUsers = function() {
      // TODO
      return [];
    };

    /**
     * Assets of current course with infinite scroll
     *
     * @return {void}
     */
    var findAssets = $scope.findAssets = function() {
      // TODO: Is this how we want to support deep-linking?
      utilService.setParentHash($scope.search.options);

      // No further REST API requests until the following is set to false.
      $scope.search.assets.blockOtherSearches = true;

      var isFirstResultSet = ($scope.search.assets.page === 0);

      assetLibraryFactory.getAssets($scope.search.assets.page, $scope.search.options).success(function(assets) {
        $scope.search.assets.results = $scope.search.assets.results.concat(assets.results);

        if (assets.results.length === 10) {
          // We will request another page of results
          $scope.search.assets.blockOtherSearches = false;
        }
        if (isFirstResultSet) {
          // Put up appropriate message after the initial search
          var isEmpty = $scope.search.assets.results.length === 0;
          $scope.search.assets.message = isEmpty ? utilService.buildSearchResultsMessage('Found no assets', $scope.search.options) : utilService.buildSearchResultsMessage('Displaying assets', $scope.search.options);
        }
      });

      $scope.search.assets.results.page++;
    };

    /**
     * @return {void}
     */
    var init = function() {
      var opts = $scope.search.options;
      if (opts) {
        if (opts.category || opts.user || opts.type || opts.sort) {
          $scope.search.type = 'advanced';
        } else if (opts.keywords) {
          $scope.search.type = 'simple';
        }
      }
    };

    init();

    /**
     * Listen for events indicating aggregated search
     */
    $scope.$on('aggregatedSearch', function(ev, searchOptions) {
      $scope.search.options = searchOptions;

      init();

      // Users per search options
      findUsers();

      // Assets per search options
      findAssets();
    });

  });

}(window.angular));
