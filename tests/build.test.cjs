'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {generateWorkflow, bindings} = require('../scripts/generate-workflow.cjs');
const {parseCSV, recordsFromCSV, dataBlock, generateDashboard} = require('../scripts/generate-dashboard-data.cjs');
const {anchors, checkLinks} = require('../scripts/check-links.cjs');
const root = path.resolve(__dirname, '..');
const csv = fs.readFileSync(path.join(root, 'results/evaluation-results.csv'), 'utf8');

test('workflow generation replaces stale embedded sources and embeds the exact catalog', () => {
  const workflow = {active: false, nodes: bindings.map(binding => ({name: binding.name, type: 'n8n-nodes-base.code', parameters: {jsCode: 'stale', mode: 'runOnceForEachItem'}}))};
  const source = name => "'use strict';\n// " + name + '\n';
  const catalog = {T1059: {name: 'Command and Scripting Interpreter', tactics: ['execution']}};
  const generated = generateWorkflow(workflow, source, catalog);
  assert.equal(workflow.nodes[0].parameters.jsCode, 'stale');
  assert.equal(generated.active, false);
  for (const [index, binding] of bindings.entries()) {
    assert.ok(generated.nodes[index].parameters.jsCode.startsWith(source(binding.source)));
    assert.ok(generated.nodes[index].parameters.jsCode.endsWith(binding.wrapper));
    assert.equal(generated.nodes[index].parameters.mode, 'runOnceForEachItem');
  }
  assert.ok(generated.nodes[1].parameters.jsCode.includes('const ATTACK_CATALOG = ' + JSON.stringify(catalog) + ';'));
  assert.deepEqual(generateWorkflow(generated, source, catalog), generated);
  assert.throws(() => generateWorkflow({nodes: []}, source, catalog), /Expected one Code node/);
});

test('workflow export has no source or catalog drift', () => {
  const workflow = JSON.parse(fs.readFileSync(path.join(root, 'workflows/pipeline-c.json'), 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/attack-techniques.json'), 'utf8'));
  assert.deepEqual(workflow, generateWorkflow(workflow, file => fs.readFileSync(path.join(root, 'workflows', file), 'utf8'), catalog), 'Run npm run generate:workflow');
});

test('CSV parsing preserves quoted commas, escaped quotes, CRLF, and multiline evidence notes', () => {
  assert.deepEqual(parseCSV('\uFEFFa,b\r\n"one,two","said ""yes""\r\nnext"\r\n'), [['a', 'b'], ['one,two', 'said "yes"\r\nnext']]);
  assert.deepEqual(parseCSV('a,b\n1,'), [['a', 'b'], ['1', '']]);
  for (const invalid of ['a\n"unterminated', 'a\n"done"junk', 'a\nnot"quoted']) assert.throws(() => parseCSV(invalid), /quot/);
});

test('evaluation parser rejects column shifts and invalid numerical data', () => {
  assert.throws(() => recordsFromCSV(csv.replace('run,attack_type', 'attack_type,run')), /columns/);
  assert.throws(() => recordsFromCSV(csv.replace(',39,4,4,4,', ',NaN,4,4,4,')), /numeric/);
  assert.throws(() => recordsFromCSV(csv.replace(',39,4,4,4,', ',39,9,4,4,')), /action_quality/);
  assert.throws(() => recordsFromCSV(csv.replace('01:08:03', '25:08:03')), /start_time/);
});

test('dashboard records exactly match the historical CSV without changing timing disagreements', () => {
  const records = recordsFromCSV(csv);
  const html = fs.readFileSync(path.join(root, 'results/dashboard.html'), 'utf8');
  assert.deepEqual(JSON.parse(dataBlock(html)[1]), records);
  assert.equal(records.length, 15);
  assert.equal(records[0].triage_time_s, 39);
  assert.equal(records[0].start_time, '01:08:03');
  assert.equal(records[0].end_time, '01:08:18');
});

test('dashboard generation safely embeds HTML-like CSV notes and is deterministic', () => {
  const html = '<p>Keep this</p><script id="evaluation-data" type="application/json">[]</script><footer>Keep footer</footer>';
  const records = [{notes: '</script><img src=x onerror=alert(1)>& $& $`'}];
  const generated = generateDashboard(html, records);
  assert.deepEqual(JSON.parse(dataBlock(generated)[1]), records);
  assert.equal((generated.match(/<\/script>/g) || []).length, 1);
  assert.ok(generated.startsWith('<p>Keep this</p>'));
  assert.ok(generated.endsWith('<footer>Keep footer</footer>'));
  assert.equal(generateDashboard(generated, records), generated);
  assert.deepEqual(JSON.parse(dataBlock(generateDashboard('<script id="evaluation-data"></script>', records))[1]), records);
  assert.throws(() => generateDashboard('<p>No data block</p>', []), /exactly one/);
});

test('heading anchors support GitHub punctuation, repeated headings, and explicit HTML IDs', () => {
  const found = anchors('# Hello, **World**!\n# Hello, World!\n## 4. Controlled acceptance test\n<a id="explicit"></a>\n```md\n# Hidden\n```\nUnderlined\n---', true);
  for (const value of ['hello-world', 'hello-world-1', '4-controlled-acceptance-test', 'explicit', 'underlined']) assert.ok(found.has(value), value);
  assert.ok(!found.has('hidden'));
});

test('local link validation detects broken files, fragments, and case-sensitive path mismatches', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'soc-links-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  fs.writeFileSync(path.join(directory, 'Target.md'), '# Valid heading\n');
  fs.writeFileSync(path.join(directory, 'index.html'), '<main id="ready"></main>');
  fs.writeFileSync(path.join(directory, 'README.md'), '[Good](Target.md#valid-heading)\n[HTML](index.html#ready)\n[Remote](https://example.invalid/no-network)\n[Bad](Target.md#absent)\n[Missing](missing.md)\n[Case](target.md)\n[Escape](../outside.md)');
  const result = checkLinks(directory);
  assert.equal(result.errors.length, 4, result.errors.join('\n'));
  assert.ok(result.errors.some(error => error.includes('missing fragment')));
  assert.ok(result.errors.some(error => error.includes('escapes repository')));
});
