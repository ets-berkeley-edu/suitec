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

  angular.module('collabosphere').service('assetLibraryService', function($state, analyticsService, utilService) {

    // Get the parent container's hash. In case a hash a present, restore the state to allow
    // for deep linking to an asset or asset library search
    if (window.parent) {
      utilService.getParentUrl(function(url) {
        // If no hash fragment is part of the URL, return early
        if (url.indexOf('#') === -1 || url.indexOf('col_') === -1) {
          return;
        }

        // Parse the hash
        var fragments = url.split('#')[1].split('&');
        var data = {};
        _.each(fragments, function(fragment) {
          var key = fragment.split('=')[0];
          var val = decodeURIComponent(fragment.split('=')[1]);
          if (key && key.indexOf('col_') === 0 && val) {
            data[key.substring(4)] = val;
          }
        });

        // Check if an asset was deep linked
        if (data.asset) {
          var assetId = parseInt(data.asset, 10);

          // Track the asset deep link
          analyticsService.track('Deep link asset', {
            'asset_id': assetId,
            'referer': document.referrer
          });

          $state.go('assetlibrarylist.item', {'assetId': assetId});

        // Check if an asset library search was deep linked
        } else if (data.keywords || data.category || data.user || data.type) {

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
            'type': (data.type ? data.type : '')
          };
          $state.go('assetlibrarylist', searchOptions);
        }
      });
    }

  });

}(window.angular));
