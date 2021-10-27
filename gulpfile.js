const { parallel, series } = require('gulp');
const rollupTaskFactory = require('@hugsmidjan/gulp-rollup');
const copyTaskFactory = require('@hugsmidjan/gulp-copy');
const del = require('del');

const src = 'src/';
const dist = 'dist/';
const testsFolder = 'testing/__tests/';

// ===========================================================================

const baseOpts = {
  src,
  format: 'cjs',
  minify: false,
  codeSplit: false,
  sourcemaps: false,
  inputOpts: {
    // Returns true for local module ids (treats node_modules/*  as external)
    external: (id) => /^(?:\0|\.|\/|tslib)/.test(id) === false,
  },
};

// ===========================================================================

const cleanup = () => del([dist, testsFolder]);

const [scriptsBundle, scriptsWatch] = rollupTaskFactory({
  ...baseOpts,
  name: 'build_server',
  dest: './dist',
  glob: ['server.ts', 'proxyServer.ts'],
  dist,
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
