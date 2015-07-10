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

  angular.module('collabosphere').filter('formatDate', function() {

    /**
     * Given a date, return an appropriate user-friendly representation. This outputs one of:
     *  - `Today`
     *  - `Yesterday`
     *  - if the date fell in the last week: `Sunday`, `Monday`, `Tuesday`, ..., `Saturday`
     *  - if the date was longer than a week ago, it will be formated as `Month date, year`. For example: `Jun 30, 2015`
     *
     * @param  {String}     input     The input date to format
     * @return {String}               The formatted date
     */
    return function(input) {
      // Parse the date with moment and get rid of the time values. This allows us to do straight-
      // forward `isSame` and `isBetween` checks
      var date = moment(input).hours(0).minutes(0).seconds(0).milliseconds(0);

      if (moment().isSame(date, 'day')) {
        return 'Today';
      } else if (moment().subtract(1, 'day').isSame(date, 'day')) {
        return 'Yesterday';
      } else if (moment().isBetween(moment().subtract(7, 'days'), moment())) {
        return date.format('dddd');
      } else {
        return date.format('MMMM D, YYYY');
      }
    };
  });

}(window.angular));
