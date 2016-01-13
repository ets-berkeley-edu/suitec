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

var Promise = require('sequelize/lib/promise');

/*!
 * If an unhandled error is thrown inside the promise, we should promote it. This is needed because
 * if an unhandled exception occurs in the `callback` during the `then` handler it is considered a
 * rejection. Since we want things like unit tests to catch these in the test domain, or express to
 * catch exceptions in the error handling middlewhere, we will promote them
 */
Promise.onPossiblyUnhandledRejection(function(err) {
  throw err;
});

/**
 * Add a style helper to the sequelize Promise that allows us to use callback-style error handling
 *
 * @param  {Function}   callback        Standard callback function
 * @param  {Object}     callback.err    An error that occurred, if any
 * @param  {Args}       callback.arg0   A variable number of callback-specific return arguments
 */
Promise.prototype.complete = function(callback) {
  var called = false;

  // Failure condition. This must be registered before the `then` condition to ensure that an
  // error in the callback does not get caught by this handler, risking that the callback be
  // invoked twice
  this.catch(function(err) {
    if (!called) {
      called = true;

      // Send the err argument to the consumer as the first and only parameter
      callback.call(null, err);
    }
  })

  // Success condition
  .then(function() {
    if (!called) {
      called = true;

      // Shift a null value as the first parameter in the callback to indicate the result is
      // a success
      var args = Array.prototype.slice.call(arguments);
      args.unshift(null);
      callback.apply(null, args);
    }
  });
};
