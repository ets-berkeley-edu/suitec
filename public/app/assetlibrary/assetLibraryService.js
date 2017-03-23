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

  angular.module('collabosphere').service('assetLibraryService', function($state, analyticsService, utilService) {

    // Get the parent window's URL. In case any Collabosphere data is present,
    // restore the state to allow for deep linking to an asset or asset library search
    if (window.parent) {
      utilService.getParentUrlData(function(data) {
        if (data.asset) {
          var assetId = parseInt(data.asset, 10);

          // Track the asset deep link
          analyticsService.track('Deep link asset', {
            'asset_id': assetId,
            'referer': document.referrer
          });

          $state.go('assetlibrarylist.item', {'assetId': assetId});

        // Check if an asset library search was deep linked
        } else if (data.keywords || data.category || data.user || data.type || data.sort) {

          // Track the asset library search deep link
          analyticsService.track('Deep link Asset Library search', {
            'asset_search_keywords': data.keywords,
            'asset_search_category': data.category,
            'asset_search_user': data.user,
            'asset_search_types': data.type,
            'referer': document.referrer
          });

          var searchOptions = {
            'keywords': (data.keywords ? data.keywords : ''),
            'category': (data.category ? data.category : ''),
            'user': (data.user ? data.user : ''),
            'type': (data.type ? data.type : ''),
            'sort': (data.sort ? data.sort : '')
          };
          $state.go('assetlibrarylist', searchOptions);
        }
      });
    }

  });

}(window.angular));
