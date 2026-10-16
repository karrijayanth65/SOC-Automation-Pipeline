'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const bundlePath = path.join(root, 'data/enterprise-attack.json');
const outputPath = path.join(root, 'data/attack-techniques.json');
function catalogFrom(bundle) {
  const catalog = {};
  for (const obj of bundle.objects) {
    if (obj.type !== 'attack-pattern' || obj.revoked || obj.x_mitre_deprecated) continue;
    const id = obj.external_references?.find(r => r.source_name === 'mitre-attack')?.external_id;
    if (!/^T\d{4}(?:\.\d{3})?$/.test(id || '')) continue;
    if (Object.hasOwn(catalog, id)) throw new Error('Duplicate technique ID: ' + id);
    catalog[id] = {name: obj.name, tactics: (obj.kill_chain_phases || [])
      .filter(p => p.kill_chain_name === 'mitre-attack').map(p => p.phase_name).sort()};
  }
  return Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b)));
}
if (require.main === module) {
  const bytes = fs.readFileSync(bundlePath);
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'data/attack-provenance.json')));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), provenance.vendored_sha256,
    'Vendored ATT&CK data does not match recorded hash');
  const generated = JSON.stringify(catalogFrom(JSON.parse(bytes)), null, 2) + '\n';
  if (process.argv.includes('--check')) assert.equal(fs.readFileSync(outputPath, 'utf8'), generated, 'ATT&CK catalog drift');
  else fs.writeFileSync(outputPath, generated);
}
module.exports = {catalogFrom};
