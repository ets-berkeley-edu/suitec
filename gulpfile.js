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

var addsrc = require('gulp-add-src');
var csslint = require('gulp-csslint');
var cssmin = require('gulp-cssmin');
var del = require('del');
var es = require('event-stream');
var filter = require('gulp-filter');
var fs = require('fs');
var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var jscs = require('gulp-jscs');
var minifyHtml = require('gulp-minify-html');
var mocha = require('gulp-mocha');
var ngAnnotate = require('gulp-ng-annotate');
var rev = require('gulp-rev');
var revReplace = require('gulp-rev-replace');
var runSequence = require('run-sequence');
var templateCache = require('gulp-angular-templatecache');
var uglify = require('gulp-uglify');
var usemin = require('gulp-usemin');

/**
 * Delete the build directory
 */
gulp.task('clean', function(cb) {
  del(['target/*']).then(function() {
    return cb();
  });
});

/**
 * Copy the fonts to the build directory
 */
gulp.task('copyFonts', function() {
  return gulp.src('public/lib/fontawesome/fonts/*')
    .pipe(gulp.dest('target/fonts/'));
});

/**
 * Copy the bookmarklet files. Note that these files cannot be versioned as they are part of the
 * javascript logic that gets copied in the bookmarks bar
 */
gulp.task('copyBookmarkletFiles', function() {
  return es.merge(
    gulp.src('public/assets/js/bookmarklet-init.js', {'base': 'public'})
      .pipe(uglify())
      .pipe(gulp.dest('target')),

    gulp.src('public/bookmarklet.html', {'base': 'public'})
      .pipe(minifyHtml({'empty': true}))
      .pipe(gulp.dest('target'))
  );
});

/**
 * Copy the bookmarklet dependencies to the build directory
 */
gulp.task('minifyBookmarkletFiles', ['copyBookmarkletFiles'], function() {
  // Parse the dependencies out of the bookmarklet init script
  var contents = fs.readFileSync('./public/assets/js/bookmarklet-init.js').toString('utf8');
  var re = new RegExp('baseUrl \\+ \'(.+?)"', 'g');
  var matches = contents.match(re);

  // Map the matched dependencies to their path on disk
  matches = matches.map(function(match) {
    return 'public/' + match.substring(12, match.length - 1);
  });

  var jsFilter = filter('**/*.js', {'restore': true});
  var cssFilter = filter('**/*.css', {'restore': true});

  // Hash and version the dependencies
  return gulp.src(matches, {'base': 'public'})
    // Hash the JS files
    .pipe(jsFilter)
    .pipe(uglify())
    .pipe(rev())
    .pipe(gulp.dest('target/static'))
    .pipe(jsFilter.restore)

    // Hash the CSS files
    .pipe(cssFilter)
    .pipe(cssmin({'keepSpecialComments': 0}))
    .pipe(rev())
    .pipe(gulp.dest('target/static/'))
    .pipe(cssFilter.restore)

    // Write out a file that maps the original filename to its hashed counterpart
    .pipe(rev.manifest('bookmarklet-rev-manifest.json'))
    .pipe(gulp.dest('target'));
});

/**
 * Replace the dependencies in the bookmarklet init file with their optimized versions
 */
gulp.task('replaceBookmarkletDependencies', ['minifyBookmarkletFiles'], function() {
  var manifest = gulp.src('./target/bookmarklet-rev-manifest.json');

  return gulp.src('target/assets/js/*')
    .pipe(revReplace({
      'manifest': manifest,
      'prefix': '/static'
    }))
    .pipe(gulp.dest('target/assets/js'));
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
    .pipe(gulp.dest('target'));
});

/**
 * Minify the viewer's HTML, CSS and JS assets
 */
gulp.task('minifyViewer', function() {
  var pipelines = {
    'css': [cssmin({'keepSpecialComments': 0}), rev()],
    'html': [minifyHtml({'empty': true})],
    'js': [uglify(), rev()]
  };

  return gulp.src('./public/viewer/*.html')
    .pipe(usemin(pipelines))
    .pipe(gulp.dest('target/viewer'));
});

/**
 * Copy the viewer's static assets to the build directory
 */
gulp.task('copyViewerAssets', function() {
  var dirs = [
    'public/viewer/cmaps/**/*',
    'public/viewer/images/**/*',
    'public/viewer/locale/**/*',
    'public/viewer/pdf.worker.js'
  ];
  return gulp.src(dirs, {'base': 'public/viewer'})
    .pipe(gulp.dest('target/viewer'));
});

/**
 * Optimize the images
 */
gulp.task('optimizeImages', function() {
  return gulp.src('public/assets/img/*', {'base': 'public'})

    // Optimize the images
    .pipe(imagemin({
      'progressive': true
    }))

    // Hash each image and append a version string at the end of the file
    .pipe(rev())
    .pipe(gulp.dest('target/static/'))

    // Write out a manifest file so we can replace the image URLs in the CSS / html files
    .pipe(rev.manifest('images-rev-manifest.json'))
    .pipe(gulp.dest('target'));
});

/**
 * Replace the images with their optimized versions
 */
gulp.task('replaceImages', ['optimizeImages'], function() {
  var manifest = gulp.src('./target/images-rev-manifest.json');

  return gulp.src('target/static/*')
    .pipe(revReplace({
      'manifest': manifest,
      'prefix': '/static'
    }))
    .pipe(gulp.dest('target/static'));
});

/**
 * Create a build
 */
gulp.task('build', function() {
  return runSequence('clean', ['replaceBookmarkletDependencies', 'copyFonts', 'minify'], 'replaceImages', 'minifyViewer', 'copyViewerAssets');
});

/**
 * Run the JSCS code style linter
 */
gulp.task('jscs', function() {
  return gulp
    .src(['app.js', 'gulpfile.js', 'apache/**/*.js', 'node_modules/col-*/**/*.js', 'public/**/*.js', '!public/lib/**/*.js', '!public/viewer/**/*.js'])
    .pipe(jscs());
});

/**
 * Run the CSS code style linter
 */
gulp.task('csslint', function() {
  return gulp
    .src(['public/**/*.css', '!public/lib/**/*.css', '!public/viewer/**/*.css'])
    .pipe(csslint({
      'adjoining-classes': false,
      'box-model': false,
      'ids': false,
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

