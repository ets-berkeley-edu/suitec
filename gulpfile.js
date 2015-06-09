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

var csslint = require('gulp-csslint');
var gulp = require('gulp');
var jscs = require('gulp-jscs');
var mocha = require('gulp-mocha');
var runSequence = require('run-sequence');

/**
 * Run the JSCS code style linter
 */
gulp.task('jscs', function() {
  return gulp
    .src(['app.js', 'apache/**/*.js', 'node_modules/col-*/**/*.js', 'public/**/*.js', '!public/lib/**/*.js'])
    .pipe(jscs());
});

/**
 * Run the CSS code style linter
 */
gulp.task('csslint', function() {
  return gulp
    .src(['public/**/*.css', '!public/lib/**/*.css'])
    .pipe(csslint({
      'adjoining-classes': false,
      'box-model': false,
      'overqualified-elements': false,
      'qualified-headings': false
    }))
    .pipe(csslint.reporter());
});

/**
 * Run the Mocha test suite
 */
gulp.task('mocha', function() {
  return gulp
    .src(['node_modules/col-tests/lib/beforeTests.js', 'node_modules/col-*/tests/**/*.js'])
    .pipe(mocha({
      'fullStackTrace': true,
      'grep': process.env.MOCHA_GREP
    }));
});

/**
 * Run the full Collabosphere test suite
 */
gulp.task('test', function() {
  // Set the environment to `test`
  process.env.NODE_ENV = 'test';

  runSequence('jscs', 'csslint', 'mocha');
});

/**
 * Run the full Collabosphere TravisCI test suite (including code coverage)
 */
gulp.task('test-travis', function() {
  // Set the environment to `travis`
  process.env.NODE_ENV = 'travis';

  runSequence('jscs', 'csslint', 'mocha');
});

