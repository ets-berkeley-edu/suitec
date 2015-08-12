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

  angular.module('collabosphere').filter('linebreaks', function() {

    /**
     * Replace each line break with a proper html line break element
     *
     * @param  {String}     input     The input text to replace the line breaks in
     * @return {String}               The text in which the line breaks have been replaced with line break element
     */
    return function(input) {
      // Angular's linky filter will replace `\r\n` with `&#10;&#13;`. Unfortunately this filter can't
      // run before the linky filter as the
      return input.replace(/(\r\n|\n\r|\r|\n|&#10;&#13;|&#13;&#10;|&#10;|&#13;)/gm, '<br>');
    };
  });

}(window.angular));
