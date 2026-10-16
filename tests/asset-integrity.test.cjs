'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {parseCSV} = require('../scripts/generate-dashboard-data.cjs');
const root = path.resolve(__dirname, '..');

test('every recorded original image remains present with its original bytes', () => {
  const [headers, ...rows] = parseCSV(fs.readFileSync(path.join(root, 'screenshots/manifest.csv'), 'utf8'));
  const assetColumn = headers.indexOf('asset_path');
  const hashColumn = headers.indexOf('sha256');
  assert.ok(assetColumn >= 0 && hashColumn >= 0, 'Manifest must retain asset path and checksum');
  assert.ok(rows.length >= 18, 'All 18 original assets must remain documented');
  const seen = new Set();
  for (const row of rows) {
    const asset = row[assetColumn];
    assert.equal(seen.has(asset), false, 'Duplicate manifest path: ' + asset);
    seen.add(asset);
    assert.match(asset, /^screenshots\/[A-Za-z0-9._-]+\.(?:png|svg|jpe?g|gif|webp)$/i);
    assert.match(row[hashColumn], /^[a-f0-9]{64}$/);
    const bytes = fs.readFileSync(path.join(root, asset));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row[hashColumn],
      'Preserve original image; create a separately named derivative instead: ' + asset);
  }
});
