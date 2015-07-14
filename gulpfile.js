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

var addsrc = require('gulp-add-src');
var csslint = require('gulp-csslint');
var cssmin = require('gulp-cssmin');
var gulp = require('gulp');
var jscs = require('gulp-jscs');
var minifyHtml = require('gulp-minify-html');
var mocha = require('gulp-mocha');
var ngAnnotate = require('gulp-ng-annotate');
var rev = require('gulp-rev');
var rimraf = require('rimraf');
var runSequence = require('run-sequence');
var templateCache = require('gulp-angular-templatecache');
var uglify = require('gulp-uglify');
var usemin = require('gulp-usemin');

/**
 * Delete the build directory
 */
gulp.task('clean', function(cb) {
  rimraf('./dist', cb);
});

/**
 * Copy the fonts to the build directory
 */
gulp.task('copyFonts', function() {
  return gulp.src('public/lib/fontawesome/fonts/*')
    .pipe(gulp.dest('./dist/fonts/'));
});

/**
 * Copy all the bookmarklet assets to the build directory
 */
gulp.task('copyBookmarkletAssets', function() {
  return gulp.src([
      'public/**/*.js',
      'public/**/*.css',
      'public/**/*.jpg',
      'public/bookmarklet.html'
    ])
    .pipe(gulp.dest('./dist/'));
});

/**
 * Minify the HTML, CSS and JS assets
 */
gulp.task('minify', function() {
  var pipelines = {
    'css': [cssmin({'keepSpecialComments': 0}), rev()],
    'html': [minifyHtml({'empty': true})],

    // We need to register 2 pipelines with usemin as it's not able to re-use a pipeline
    // for multiple result files
    'vendor': [ngAnnotate(), uglify(), rev()],
    'app': [ngAnnotate(), uglify(), rev()],

    // Unfortunately, usemin has no way to determine the HTML partials from the index.html file.
    // We have to explicitly specify a matching glob here. All HTML partials matching the glob
    // will be returned and written to the templateCache.js
    'templateCache': [
        addsrc('public/app/**/*.html'),
        templateCache('/static/templateCache.js', {
          'module': 'collabosphere.templates',
          'root': '/app',
          'standalone': true
        }),
        rev()
    ]
  };

  return gulp.src('./public/index.html')
    .pipe(usemin(pipelines))
    .pipe(gulp.dest('dist/'));
});

/**
 * Create a build
 */
gulp.task('build', function() {
  return runSequence('clean', ['copyBookmarkletAssets', 'copyFonts', 'minify']);
});

/**
 * Run the JSCS code style linter
 */
gulp.task('jscs', function() {
  return gulp
    .src(['app.js', 'gulpfile.js', 'apache/**/*.js', 'node_modules/col-*/**/*.js', 'public/**/*.js', '!public/lib/**/*.js'])
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
      'grep': process.env.MOCHA_GREP,
      'timeout': 10000
    }))
    .once('end', function() {
      process.exit();
    });
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

