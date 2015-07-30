/**
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

  angular.module('collabosphere').filter('hashtags', function() {

    /**
     * Replace each hashtag with a link to the asset library that will search through the asset library
     * for that keyword
     *
     * @param  {String}     input     The input text to replace the hashtags in
     * @return {String}               The text in which the hashtags have been replaced with links
     */
    return function(input) {
      var pattern = /(^|\s)#(\w*[a-zA-Z_]+\w*)/gim;
      return input.replace(pattern, '$1<a href="/assetlibrary?keywords=$2">#$2</a>');
    };
  });

}(window.angular));
