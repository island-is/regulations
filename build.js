require('dotenv').config();
const pkg = require('./package.json');

const opts = process.argv.slice(2).reduce((map, arg) => {
  const [key, value] = arg.replace(/^-+/, '').split('=');
  map[key] = value == null ? true : value;
  return map;
}, {});

require('esbuild')
  .build({
    entryPoints: [
      'server.ts',
      'worker.ts',
      'proxyServer.ts',
      'scripts/upload-documents-to-s3.ts',
      'RegulationPdf.css',
    ].map((file) => './src/' + file),
    entryNames: '[name]',
    define: {
      'process.env.DEV_FILE_SERVER': JSON.stringify(
        process.env.DEV_FILE_SERVER,
      ),
    },
    platform: 'node',
    target: ['node14'],
    format: 'cjs',
    outdir: 'dist',

    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
    ],
    bundle: true,
    minify: false,
    watch: opts.watch,
  })

  .catch(() => process.exit(1));
