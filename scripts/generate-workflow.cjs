'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const bindings = [
  {name: 'Normalize alert', source: 'normalize-alert.js', wrapper: 'return {json: normalizeAlert($json)};'},
  {name: 'Code in JavaScript', source: 'format-report.js', wrapper: 'return {json: formatReport($json, $("Normalize alert").item.json)};'}
];

function generateWorkflow(workflow, readSource, catalog) {
  const generated = structuredClone(workflow);
  for (const binding of bindings) {
    const matches = generated.nodes.filter(node => node.name === binding.name);
    if (matches.length !== 1 || matches[0].type !== 'n8n-nodes-base.code') {
      throw new Error('Expected one Code node named ' + binding.name);
    }
    const source = readSource(binding.source).replace(/\r\n/g, '\n').trimEnd();
    const injected = binding.source === 'format-report.js'
      ? '\nconst ATTACK_CATALOG = ' + JSON.stringify(catalog) + ';\n' : '\n';
    matches[0].parameters.jsCode = source + '\n' + injected + binding.wrapper;
  }
  return generated;
}

function run(check = false) {
  const target = path.join(root, 'workflows/pipeline-c.json');
  const current = JSON.parse(fs.readFileSync(target, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/attack-techniques.json'), 'utf8'));
  const generated = generateWorkflow(current, file => fs.readFileSync(path.join(root, 'workflows', file), 'utf8'), catalog);
  if (check) {
    if (JSON.stringify(current) !== JSON.stringify(generated)) throw new Error('Embedded workflow code/catalog drift. Run npm run generate:workflow.');
    console.log('Workflow code and ATT&CK catalog match their source files.');
  } else {
    fs.writeFileSync(target, JSON.stringify(generated, null, 2) + '\n');
    console.log('Generated workflows/pipeline-c.json from standalone sources and ATT&CK catalog.');
  }
}

if (require.main === module) {
  try { run(process.argv.includes('--check')); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {bindings, generateWorkflow, run};
