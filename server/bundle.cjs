const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server.js',
  external: ['mysql2', 'bcryptjs'],
  format: 'esm',
  alias: {
    '@eai/database/db': path.resolve(__dirname, './src/database/db.ts'),
    '@eai/database': path.resolve(__dirname, './src/database/types.ts')
  },
  banner: {
    js: 'import { createRequire } from "module"; import { fileURLToPath } from "url"; import { dirname } from "path"; const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename); const require = createRequire(import.meta.url);'
  }
}).then(() => {
  console.log('Build successful!');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
