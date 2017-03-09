'use strict';

const path = require('path');
// const gulp = require('gulp');
const rimraf = require('rimraf');
const Vulcanize = require('vulcanize');
// const runSequence = require('run-sequence');
const fs = require('fs');
// const crisper = require('crisper');
// const merge = require('merge-stream');

class Builder {

  constructor() {
    this.buildDir = './build';
    this.srcFile = './src/api-console-docs.html';
  }

  build() {
    return this._cleanTarget()
    // .then(() => Builder._copyFiles())
    .then(() => this._vulcanizeElements());
  }

  /**
   * Removes target directory.
   */
  _cleanTarget() {
    return new Promise((resolve, reject) => {
      rimraf(this.buildDir, (err) => {
        if (err) {
          console.error('Can\'t remove path ', this.buildDir);
          reject(err);
          return;
        }
        fs.mkdirSync(this.buildDir);
        console.log('Dir removed for target: ' + this.buildDir);
        resolve();
      });
    });
  }

  // /**
  //  * Copy files that are not copied by vulcanize process.
  //  */
  // _copyFiles() {
  //   return new Promise((resolve) => {
  //     runSequence(['copy'], () => {
  //       resolve();
  //     });
  //   });
  // }

  _vulcanizeElements() {
    return new Promise((resolve, reject) => {
      let vulcan = new Vulcanize({
        inlineScripts: true,
        inlineCss: true,
        implicitStrip: true,
        stripComments: true,
        excludes: []
      });
      console.log('Processing source file');
      vulcan.process(this.srcFile, (err, inlinedHtml) => {
        if (err) {
          return reject(err);
        }
        let jsFile = 'api-console-build.html';
        var targetHtml = path.join(this.buildDir, jsFile);

        fs.writeFileSync(targetHtml, inlinedHtml, 'utf-8');
        console.log('Saved in ', targetHtml);
        resolve();
      });
    });
  }
}

// Copy all files at the root level (app)
// gulp.task('copy', () => {
//   var dest = Builder.buildTarget;
//
//   Copy over only the bower_components we need
//   These are things which cannot be vulcanized
//   var bower = gulp.src([
//     'bower_components/{webcomponentsjs,font-roboto-local}/**/*',
//     '!bower_components/font-roboto-local/fonts/robotomono/**'
//   ]).pipe(gulp.dest(path.join(dest, 'bower_components')));
//
//   copy webworkers used in bower_components
//   var webWorkers = gulp.src([
//     'app/bower_components/socket-fetch/decompress-worker.js',
//     'app/bower_components/arc-definitions/definitions.json'
//   ]).pipe(gulp.dest(path.join(dest, 'elements')));
//
//   var bowerDeps = [
//     'chrome-platform-analytics/google-analytics-bundle.js',
//     'dexie-js/dist/dexie.min.js',
//     'har/build/har.js',
//     'lodash/lodash.js',
//     'uri.js/src/URI.js',
//     'prism/prism.js',
//     'prism/plugins/autolinker/prism-autolinker.min.js'
//   ];
//   var dependencies = gulp.src([
//     `app/bower_components/{${bowerDeps.join(',')}}`,
//   ]).pipe(gulp.dest(path.join(dest, 'bower_components')));
//
//   return merge(
//       app, bower, webWorkers, assets, scripts, styles,
//       /*, codeMirror*/
//       zlibLibrary, dependencies
//     );
// });

module.exports.Builder = Builder;
