/**
 * Copyright ©2016. The Regents of the University of California (Regents). All Rights Reserved.
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

var _ = require('lodash');

/**
 * Get a numeric parameter as specified by `value`. If `value` is not a valid number,
 * `defaultValue` will be returned instead. If a minimum is specified and `value` is
 * smaller than the minimum, the minimum will be returned. If a maximum is specified
 * and `value` is larger than the maximum, the maximum will be returned
 *
 * @param  {String|Number}      value           The value to try and convert to an integer
 * @param  {Number}             defaultValue    The value to return if `value` is not a valid integer
 * @param  {Number}             [minimum]       A lower bound for `value`. If this is not provided, no bounding will be applied
 * @param  {Number}             [maximum]       An upper bound for `value`. If this is not provided, no bounding will be applied
 * @return {Number}                             `value` converted to an integer without the specified bounds. Otherwise, `defaultValue` is returned
 */
var getNumberParam = module.exports.getNumberParam = function(value, defaultValue, minimum, maximum) {
  value = parseInt(value, 10);
  value = (isNaN(value)) ? defaultValue : value;
  if ((minimum || minimum === 0) && value < minimum) {
    value = minimum;
  }
  if ((maximum || maximum === 0) && value > maximum) {
    value = maximum;
  }
  return value;
};

/**
 * Get a boolean parameter as specified by `value`. If `value` is not a valid boolean,
 * `defaultValue` will be returned instead
 *
 * @param  {String|Boolean}     value           The value to try and convert to a boolean
 * @param  {Boolean}            defaultValue    The value to return if `value` is not a valid boolean
 * @return {Boolean}                            `value` converted to a boolean. Otherwise, `defaultValue` is returned
 */
var getBooleanParam = module.exports.getBooleanParam = function(value, defaultValue) {
  if (value === true || value === 'true') {
    return true;
  } else if (value === false || value === 'false') {
    return false;
  }
  return defaultValue;
};

/**
 * Wrap a value in an array. If the value is already an array, no wrapping
 * will take place. If the value is an object, the object's values will be returned
 *
 * @param  {Object}             value           The value to wrap in an array
 * @return {Object[]}                           The provided value wrapped in an arrray
 * @see https://lodash.com/docs#toArray
 */
var toArray = module.exports.toArray = function(value) {
  if (!value) {
    return [];
  }

  // Lodash doesn't wrap primitive values
  if (_.isFinite(value) || _.isString(value) || _.isDate(value)) {
    return [value];
  }

  return _.toArray(value);
};
