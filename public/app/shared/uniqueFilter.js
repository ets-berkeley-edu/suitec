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

  angular.module('collabosphere').filter('unique', function($filter) {

    /**
     * Creates a duplicate-free version of an array of objects
     *
     * @param  {Object[]}     items       The array of objects to remove the duplicate items from
     * @param  {String}       filterOn    The key whose value to use to determine whether an object is a duplicate
     * @return {Object[]}                 The duplicate-free array
     */
    return function(items, filterOn) {
      return _.uniq(items, false, filterOn);
    };
  });
})(window.angular);
