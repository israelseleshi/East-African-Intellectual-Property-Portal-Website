import fs from 'fs';
import path from 'path';

const roots = ['src', 'public'];
const badPattern = /�|Ã|â€|â€™|â€œ|â€/;
let failures = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/i.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      if (badPattern.test(content)) {
        failures.push(full);
      }
    }
  }
};

roots.forEach((r) => {
  const target = path.join(process.cwd(), r);
  if (fs.existsSync(target)) walk(target);
});

if (failures.length > 0) {
  console.error(`Encoding check failed. Found mojibake characters in:\n${failures.join('\n')}`);
  process.exit(1);
} else {
  console.log('Encoding check passed. No mojibake detected.');
}
