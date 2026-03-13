import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const maxChunkKbArg = Number(args.find((arg) => arg.startsWith('--max-chunk-kb='))?.split('=')[1]);
const maxTotalJsKbArg = Number(args.find((arg) => arg.startsWith('--max-total-js-kb='))?.split('=')[1]);

const maxChunkKb = Number.isFinite(maxChunkKbArg) ? maxChunkKbArg : 1150;
const maxTotalJsKb = Number.isFinite(maxTotalJsKbArg) ? maxTotalJsKbArg : 4500;

const distAssetsDir = path.resolve(process.cwd(), 'dist', 'assets');
if (!fs.existsSync(distAssetsDir)) {
  console.error(`[perf-budget] dist assets directory not found: ${distAssetsDir}`);
  process.exit(1);
}

const assetFiles = fs.readdirSync(distAssetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({
    name,
    sizeBytes: fs.statSync(path.join(distAssetsDir, name)).size
  }));

if (assetFiles.length === 0) {
  console.error('[perf-budget] no JS chunk files were found in dist/assets');
  process.exit(1);
}

const toKb = (bytes) => Number((bytes / 1024).toFixed(2));
const totalJsKb = toKb(assetFiles.reduce((sum, file) => sum + file.sizeBytes, 0));

const oversizedChunks = assetFiles.filter((file) => toKb(file.sizeBytes) > maxChunkKb);
const hasTotalOverflow = totalJsKb > maxTotalJsKb;

console.log('[perf-budget] evaluated chunks:');
for (const file of assetFiles.sort((a, b) => b.sizeBytes - a.sizeBytes)) {
  console.log(` - ${file.name}: ${toKb(file.sizeBytes)} KB`);
}
console.log(`[perf-budget] total JS: ${totalJsKb} KB`);

if (oversizedChunks.length > 0 || hasTotalOverflow) {
  if (oversizedChunks.length > 0) {
    console.error(`[perf-budget] chunk budget exceeded (${maxChunkKb} KB max):`);
    for (const file of oversizedChunks) {
      console.error(` - ${file.name}: ${toKb(file.sizeBytes)} KB`);
    }
  }
  if (hasTotalOverflow) {
    console.error(`[perf-budget] total JS budget exceeded: ${totalJsKb} KB > ${maxTotalJsKb} KB`);
  }
  process.exit(1);
}

console.log(`[perf-budget] PASS (max chunk ${maxChunkKb} KB, max total JS ${maxTotalJsKb} KB)`);
