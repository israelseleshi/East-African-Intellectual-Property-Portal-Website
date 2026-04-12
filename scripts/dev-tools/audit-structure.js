#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '../../');
const errors = [];

const requiredDirectories = ['client', 'server', 'scripts', 'docs', 'forms', 'reports'];
const allowedTopLevelDirectories = new Set([
  ...requiredDirectories,
  '.git',
  '.github',
  '.windsurf',
  'archive',
  'backups',
  'forms-upload',
  'node_modules',
  'cypress',
  '@test_logs',
  'test_logs',
]);

function existsAtRoot(name) {
  return fs.existsSync(path.join(repoRoot, name));
}

function listTopLevelDirectories() {
  return fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function getTrackedFiles() {
  try {
    const output = execSync('git ls-files', {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    return output.split(/\r?\n/).filter(Boolean);
  } catch {
    errors.push('Unable to run `git ls-files`; make sure this is executed inside a git repository.');
    return [];
  }
}

function shouldSkipTrackedPath(filePath) {
  return (
    filePath.startsWith('archive/') ||
    filePath.startsWith('backups/') ||
    filePath.startsWith('node_modules/') ||
    filePath.includes('/node_modules/')
  );
}

for (const dir of requiredDirectories) {
  if (!existsAtRoot(dir)) {
    errors.push(`Missing required directory: ${dir}`);
  }
}

const topLevelDirs = listTopLevelDirectories();
const unexpectedTopLevelDirs = topLevelDirs.filter((dir) => !allowedTopLevelDirectories.has(dir));
if (unexpectedTopLevelDirs.length > 0) {
  errors.push(`Unexpected top-level directories: ${unexpectedTopLevelDirs.join(', ')}`);
}

const forbiddenTopLevelPaths = ['deploy_tmp', 'delete-this', 'forms/forms/node_modules', 'pnpm-lock.yaml', 'database_data.sql', 'database_dump.sql'];
for (const target of forbiddenTopLevelPaths) {
  if (existsAtRoot(target)) {
    errors.push(`Forbidden path exists at repository root policy boundary: ${target}`);
  }
}

if (!existsAtRoot('database_schema.sql')) {
  errors.push('Missing required schema file: database_schema.sql');
}

const trackedFiles = getTrackedFiles();
const forbiddenTrackedChecks = [
  {
    label: 'temporary file (*.temp)',
    test: (file) => /\.temp$/i.test(file),
  },
  {
    label: 'tmp artifact (*_tmp*)',
    test: (file) => /(^|\/)[^/]*_tmp[^/]*(\/|$)/i.test(file),
  },
  {
    label: 'legacy one-time folder (deploy_tmp)',
    test: (file) => /(^|\/)deploy_tmp(\/|$)/.test(file),
  },
  {
    label: 'legacy one-time folder (delete-this)',
    test: (file) => /(^|\/)delete-this(\/|$)/.test(file),
  },
  {
    label: 'nested dependency folder (forms/forms/node_modules)',
    test: (file) => /(^|\/)forms\/forms\/node_modules(\/|$)/.test(file),
  },
  {
    label: 'alternate lockfile policy breach (pnpm-lock.yaml)',
    test: (file) => /(^|\/)pnpm-lock\.yaml$/.test(file),
  },
  {
    label: 'root database dump policy breach (database_dump.sql)',
    test: (file) => /^database_dump\.sql$/.test(file),
  },
  {
    label: 'root database data policy breach (database_data.sql)',
    test: (file) => /^database_data\.sql$/.test(file),
  },
];

for (const check of forbiddenTrackedChecks) {
  const matches = trackedFiles.filter((file) => {
    if (shouldSkipTrackedPath(file)) {
      return false;
    }
    if (!fs.existsSync(path.join(repoRoot, file))) {
      return false;
    }
    return check.test(file);
  });
  if (matches.length > 0) {
    const sample = matches.slice(0, 5).join(', ');
    const more = matches.length > 5 ? ` (+${matches.length - 5} more)` : '';
    errors.push(`Tracked file policy breach [${check.label}]: ${sample}${more}`);
  }
}

if (errors.length > 0) {
  console.error('Structure audit failed with the following issues:');
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log('Structure audit passed.');
