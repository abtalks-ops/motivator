#!/usr/bin/env node
// PostToolUse hook: format and lint-fix the file Claude just edited.
// Never blocks; problems surface again in the Stop hook and in CI.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
const file = input?.tool_input?.file_path;
if (typeof file !== 'string' || file.includes('node_modules')) process.exit(0);

const run = (cmd, args) => {
  try {
    execFileSync(cmd, args, { stdio: 'ignore' });
  } catch {
    /* best effort */
  }
};

if (/\.(ts|tsx|js|mjs|cjs|json|css|md|html|ya?ml)$/.test(file)) {
  run('npx', ['--no-install', 'prettier', '--write', '--ignore-unknown', file]);
}
if (/\.(ts|tsx|js|mjs)$/.test(file)) {
  run('npx', ['--no-install', 'eslint', '--fix', file]);
}
