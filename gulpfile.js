require('dotenv').config();
const { parallel, series } = require('gulp');
const rollupTaskFactory = require('@hugsmidjan/gulp-rollup');
const copyTaskFactory = require('@hugsmidjan/gulp-copy');
const del = require('del');

const src = 'src/';
const dist = 'dist/';
const testsFolder = 'testing/__tests/';

// ===========================================================================

const cleanup = () => del([dist, testsFolder]);

const [scriptsBundle, scriptsWatch] = rollupTaskFactory({
  name: 'build_server',
  src,
  glob: ['server.ts', 'proxyServer.ts'],
  dist,
  format: 'cjs',
  minify: false,
  codeSplit: false,
  sourcemaps: false,
  replaceOpts: {
    'process.env.DEV_FILE_SERVER': JSON.stringify(
      process.env.DEV_FILE_SERVER || '',
    ),
  },
  inputOpts: {
    // Returns true for local module ids (treats node_modules/*  as external)
    external: (id) => /^(?:\0|\.|\/|tslib)/.test(id) === false,
  },
});

const [copyStatic, copyStaticWatch] = copyTaskFactory({
  src,
  glob: ['*.css'],
  dist,
});
const bundle = series(cleanup, parallel(scriptsBundle, copyStatic));
const watch = parallel(scriptsWatch, copyStaticWatch);

exports.dev = series(bundle, watch);
exports.watch = watch;
exports.build = bundle;
exports.default = exports.build;
