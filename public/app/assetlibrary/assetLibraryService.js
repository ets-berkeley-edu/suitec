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

  angular.module('collabosphere').service('assetLibraryService', function(analyticsService, referringTool, utilService, $state) {

    var assetViewRedirect = function(id) {
      var hashtag = id.match(/^#(.*)/);
      if (hashtag) {
        // Search by hashtag from, for example, user profile page.
        $state.go('assetlibrarylist', {'keywords': hashtag[1]});

      } else if (id.match(/^assetlibrary/)) {
        // Pattern match identifies id as a "router state name" (see app.states.js)
        $state.go(id);

      } else {
        // Track the asset deep link
        analyticsService.track('Deep link asset', {
          'asset_id': id,
          'referer': document.referrer
        });

        $state.go('assetlibrarylist.item', {'assetId': id});
      }
    };

    if (referringTool && referringTool.requestedId) {
      // Link to asset from tools other than assetlibrary (eg, user profile)
      assetViewRedirect(referringTool.requestedId);

    } else if (window.parent) {
      // Get the parent window's URL. In case any SuiteC data is present,
      // restore the state to allow for deep linking to an asset or asset library search
      utilService.getParentUrlData(function(data) {
        if (data.asset) {
          assetViewRedirect(parseInt(data.asset, 10));

        // Check if an asset library search was deep linked
        } else if (data.keywords || data.category || data.user || data.type || data.sort) {

          // Track the asset library search deep link
          analyticsService.track('Deep link Asset Library search', {
            'asset_search_keywords': data.keywords,
            'asset_search_category': data.category,
            'asset_search_user': data.user,
            'asset_search_section': data.section,
            'asset_search_types': data.type,
            'referer': document.referrer
          });

          var searchOptions = {
            'keywords': (data.keywords ? data.keywords : ''),
            'category': (data.category ? data.category : ''),
            'user': (data.user ? data.user : ''),
            'section': (data.section ? data.section : ''),
            'type': (data.type ? data.type : ''),
            'sort': (data.sort ? data.sort : '')
          };
          $state.go('assetlibrarylist', searchOptions);
        }
      });
    }

  });

}(window.angular));
