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

  angular.module('collabosphere').service('assetLibraryService', function($state, utilService) {

    // If the LTI tools are running in an iFrame we get the parent container's URL. This allows for
    // linking to states such as an asset profile directly
    if (window.parent) {
      utilService.getParentUrl(function(url) {
        url = decodeURIComponent(url || '');

        // If no hash fragment is part of the URL, we can return early
        if (url.indexOf('#') === -1) {
          return;
        }

        // Parse the hash
        var fragments = url.split('#')[1].split('&');
        var data = {};
        _.each(fragments, function(fragment) {
          var key = fragment.split('=')[0];
          var val = fragment.split('=')[1];
          if (key && key.indexOf('col_') === 0 && val) {
            data[key.substring(4)] = val;
          }
        });

        // Check if an asset was linked directly
        if (data.asset) {
          var assetId = parseInt(data.asset, 10);
          $state.go('assetlibrarylist.item', {'assetId': assetId});

        // Check if a search was linked directly
        } else {
          var searchKeywordsMatch = url.match(/col_keywords=([A-Za-z0-9 ]+)/);
          var searchCategoryMatch = url.match(/col_category=([0-9]+)/);
          var searchUserMatch = url.match(/col_user=([0-9]+)/);
          var searchTypeMatch = url.match(/col_type=(\w+)/);
          if (data.keywords || data.category || data.user || data.type) {
            var searchOptions = {
              'keywords': (data.keywords ? data.keywords : ''),
              'category': (data.category ? data.category : ''),
              'user': (data.user ? data.user : ''),
              'type': (data.type ? data.type : '')
            };
            $state.go('assetlibrarylist', searchOptions);
          }
        }
      });
    }

  });

}(window.angular));
