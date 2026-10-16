'use strict';
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const checks = [
  ['--test'],
  ['scripts/generate-attack-catalog.cjs', '--check'],
  ['scripts/generate-workflow.cjs', '--check'],
  ['scripts/generate-dashboard-data.cjs', '--check'],
  ['scripts/check-links.cjs']
];
for (const args of checks) {
  const result = spawnSync(process.execPath, args, {cwd: root, stdio: 'inherit', shell: false});
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}
