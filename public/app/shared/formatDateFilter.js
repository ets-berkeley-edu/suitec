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
