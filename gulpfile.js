const { parallel, series, src, dest } = require('gulp');
const rollupTaskFactory = require('@hugsmidjan/gulp-rollup');
const del = require('del');
const writeFile = require('fs').writeFileSync;

const distFolder = 'dist/';
const testsFolder = 'testing/__tests/';

// ===========================================================================

const baseOpts = {
  src: 'src/',
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

const cleanup = () => del([distFolder, testsFolder]);

const [scriptsBundle, scriptsWatch] = rollupTaskFactory({
  ...baseOpts,
  name: 'build_server',
  dest: './dist',
  glob: ['server.ts'],
  dist: distFolder,
});

const bundle = series(cleanup, parallel(scriptsBundle));
const watch = parallel(scriptsWatch);

exports.dev = series(bundle, watch);
exports.watch = series(watch);
exports.build = series(bundle);
exports.default = exports.build;
