require('dotenv').config();
const pkg = require('./package.json');

const opts = process.argv.slice(2).reduce((map, arg) => {
  const [key, value] = arg.replace(/^-+/, '').split('=');
  map[key] = value == null ? true : value;
  return map;
}, {});

const srcdir = './src/';
const outdir = './dist/';

require('child_process').execSync('rm -rf ' + outdir);

require('esbuild')
  .build({
    entryPoints: ['server.ts', 'proxyServer.ts', 'RegulationPdf.css'].map(
      (file) => srcdir + file,
    ),
    entryNames: '[name]',
    define: {
      'process.env.DEV_FILE_SERVER': JSON.stringify(
        process.env.DEV_FILE_SERVER,
      ),
    },
    platform: 'node',
    target: ['node16'],
    format: 'cjs',
    outdir,

    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
    ],
    bundle: true,
    minify: false,
    watch: opts.watch,
  })

  .catch(() => process.exit(1));
