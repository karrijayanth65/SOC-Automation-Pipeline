'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {normalizeAlert, eventTime, publicIPv4} = require('../workflows/normalize-alert');
const {formatReport} = require('../workflows/format-report');
const example = require('./example-alert.json');
const root = path.resolve(__dirname, '..');
const workflow = JSON.parse(fs.readFileSync(path.join(root, 'workflows/pipeline-c.json'), 'utf8'));
const nodes = Object.fromEntries(workflow.nodes.map(n => [n.name, n]));
const input = () => ({body: structuredClone(example)});
const report = () => ({title: 'Review authentication failures', summary: 'Three failures require context review.',
  likelihood: 40, impact_score: 50, recommended_actions: ['Compare account, host and event time.']});
const model = data => ({output: [{content: [{text: JSON.stringify(data)}]}]});

test('valid alert preserves source time, SID and host', () => {
  const alert = normalizeAlert(input());
  assert.equal(alert.body.sid, example.sid);
  assert.equal(alert.body.result.event_time, '2026-10-15T12:00:00.000Z');
  assert.equal(alert.body.result.host, 'LAB-WIN01');
  assert.equal(alert.body.result.public_ip, null);
});
test('epoch time and timezone offset produce the same instant', () => {
  assert.equal(eventTime(0 + 1792065600), eventTime('2026-10-15T17:30:00+05:30'));
});
for (const value of ['', '2026-10-15 12:00:00', '2026-02-30T12:00:00Z', '2026-13-15T12:00:00Z', 'NaN', '-1']) {
  test('reject invalid or ambiguous timestamp ' + JSON.stringify(value), () => assert.throws(() => eventTime(value)));
}
for (const value of ['10.1.2.3', '172.31.1.1', '192.168.1.25', '127.0.0.1', '169.254.1.1', '100.64.0.1',
  '192.0.2.1', '198.51.100.1', '203.0.113.1', '198.18.0.1', '224.0.0.1', '255.255.255.255', '::1', '8.8.8.999', '008.8.8.8']) {
  test('exclude address from external lookup: ' + value, () => assert.equal(publicIPv4(value), null));
}
test('public IPv4 can be bound to lookup tools', () => assert.equal(publicIPv4('8.8.8.8'), '8.8.8.8'));
test('allowlist strips unknown fields', () => {
  const value = input(); value.body.result.secret = 'do not forward';
  assert.equal(normalizeAlert(value).body.result.secret, undefined);
});
for (const key of ['host', '_time']) {
  test('reject missing ' + key, () => {const x = input(); delete x.body.result[key]; assert.throws(() => normalizeAlert(x));});
}
test('reject missing SID', () => {const x = input(); delete x.body.sid; assert.throws(() => normalizeAlert(x));});
test('reject object SID', () => {const x = input(); x.body.sid = {}; assert.throws(() => normalizeAlert(x));});
test('reject array host', () => {const x = input(); x.body.result.host = ['LAB']; assert.throws(() => normalizeAlert(x));});
test('reject array timestamp', () => assert.throws(() => eventTime(['2026-10-15T12:00:00Z'])));
test('reject array hash', () => {const x = input(); x.body.result.sha256 = ['a'.repeat(64)]; assert.throws(() => normalizeAlert(x));});
test('reject non-string search name', () => {const x = input(); x.body.search_name = 1; assert.throws(() => normalizeAlert(x));});
test('valid hash is normalized', () => {const x = input(); x.body.result.sha256 = 'A'.repeat(64); assert.equal(normalizeAlert(x).body.result.sha256, 'a'.repeat(64));});
test('reject missing envelope', () => assert.throws(() => normalizeAlert({})));
test('reject nested field values', () => {const x = input(); x.body.result.user = {}; assert.throws(() => normalizeAlert(x));});
test('reject invalid SHA-256', () => {const x = input(); x.body.result.sha256 = '../file'; assert.throws(() => normalizeAlert(x));});
test('reject oversized command line', () => {const x = input(); x.body.result.CommandLine = 'x'.repeat(12001); assert.throws(() => normalizeAlert(x));});
test('malformed model JSON stops formatting', () => assert.throws(() => formatReport({output: [{content: [{text: '{bad'}]}]}, normalizeAlert(input()))));
test('missing model output stops formatting', () => assert.throws(() => formatReport({}, normalizeAlert(input()))));
for (const bad of [{likelihood: '90'}, {impact_score: 101}, {recommended_actions: []}, {extra: 'field'}]) {
  test('reject report violation ' + JSON.stringify(bad), () => assert.throws(() => formatReport(model({...report(), ...bad}), normalizeAlert(input()))));
}
for (const [score, severity] of [[0, 'Low'], [39, 'Low'], [40, 'Medium'], [69, 'Medium'], [70, 'High'], [89, 'High'], [90, 'Critical'], [100, 'Critical']]) {
  test('deterministic severity boundary ' + score, () => {
    const output = formatReport(model({...report(), likelihood: score, impact_score: score}), normalizeAlert(input()));
    assert.equal(output.riskLevel, severity);
    assert.equal(output.score, score);
  });
}
test('payload keeps original source and escapes Slack mentions', () => {
  const output = formatReport(model({...report(), title: '<!channel> & review'}), normalizeAlert(input()));
  assert.match(output.slackMessage, /&lt;!channel&gt; &amp; review/);
  assert.equal(output.irisAlertBody.alert_source_event_time, '2026-10-15T12:00:00.000Z');
  assert.equal(output.irisAlertBody.alert_source_ref, 'fixture-auth-001');
});
test('workflow has no exported credentials or pinned data and stays inactive', () => {
  assert.equal(workflow.active, false); assert.deepEqual(workflow.pinData, {});
  for (const node of workflow.nodes) assert.equal(node.credentials, undefined);
  assert.equal(JSON.stringify(workflow).includes('allowUnauthorizedCerts'), false);
});
test('every webhook connects to the normalizer and requires header auth', () => {
  for (const node of workflow.nodes.filter(n => n.type.endsWith('.webhook'))) {
    assert.equal(node.parameters.authentication, 'headerAuth');
    assert.equal(workflow.connections[node.name].main[0][0].node, 'Normalize alert');
  }
});
test('all connection destinations exist', () => {
  for (const [from, groups] of Object.entries(workflow.connections)) {
    assert.ok(nodes[from]);
    for (const branches of Object.values(groups)) for (const branch of branches) for (const edge of branch) assert.ok(nodes[edge.node]);
  }
});
test('embedded n8n code matches the tested sources and executes with mocked item context', () => {
  const normalizeSource = fs.readFileSync(path.join(root, 'workflows/normalize-alert.js'), 'utf8');
  const formatterSource = fs.readFileSync(path.join(root, 'workflows/format-report.js'), 'utf8');
  assert.ok(nodes['Normalize alert'].parameters.jsCode.startsWith(normalizeSource));
  assert.ok(nodes['Code in JavaScript'].parameters.jsCode.startsWith(formatterSource));
  const normalized = vm.runInNewContext('(function(){' + nodes['Normalize alert'].parameters.jsCode + '})()', {$json: input()});
  const formatted = vm.runInNewContext('(function(){' + nodes['Code in JavaScript'].parameters.jsCode + '})()',
    {$json: model(report()), $: name => {assert.equal(name, 'Normalize alert'); return {item: normalized};}});
  assert.equal(formatted.json.riskLevel, 'Medium');
});
test('lookup expressions bind original indicators and reject absent values', () => {
  const alert = normalizeAlert(input());
  const evaluate = value => vm.runInNewContext(value.slice(3, -2).trim(), {$: () => ({item: {json: alert}})});
  const abuse = nodes['AbuseIPDB-Enrichment'].parameters.queryParameters.parameters[0].value;
  assert.throws(() => evaluate(abuse), /eligible/);
  assert.throws(() => evaluate(nodes['VirusTotal-Enrichment'].parameters.url), /eligible/);
  assert.throws(() => evaluate(nodes['VirusTotal-FileHash-Enrichment'].parameters.url), /eligible/);
  alert.body.result.public_ip = '8.8.8.8';
  assert.equal(evaluate(abuse), '8.8.8.8');
  assert.match(evaluate(nodes['VirusTotal-Enrichment'].parameters.url), /\/8\.8\.8\.8$/);
});

for (const [name, id] of [['Failed Login', 15], ['Hash Detection', 7], ['Network Scanning', 11], ['Admin Account Creation', 17], ['PowerShell', 21]]) {
  test('detection-specific IRIS classification: ' + name, () => {
    const alert = input(); alert.body.search_name = name;
    const result = formatReport(model(report()), normalizeAlert(alert));
    assert.equal(result.irisAlertBody.alert_classification_id, id);
    assert.match(result.irisAlertBody.alert_tags, /det-/);
  });
}
test('source host, target and initiating account remain distinct indicators', () => {
  const alert = input(); alert.body.result.target_account = 'lab-target'; alert.body.result.initiating_user = 'lab-admin';
  const result = formatReport(model(report()), normalizeAlert(alert));
  assert.ok(result.parsedReport.iocs.some(i => i.type === 'user' && i.value === 'lab-target'));
  assert.ok(result.parsedReport.iocs.some(i => i.type === 'user' && i.value === 'lab-admin'));
  assert.match(result.irisAlertBody.alert_note, /lab-target/);
});
test('model cannot introduce an indicator absent from the source event', () => {
  const value = {...report(), iocs: [{type: 'ip', value: '9.9.9.9', verdict: 'unknown'}]};
  assert.throws(() => formatReport(model(value), normalizeAlert(input())), /source alert/);
});
test('MITRE suggestions and detection tags survive the IRIS handoff', () => {
  const value = {...report(), mitre_attack: [{tactic: 'Credential Access', technique_id: 'T1110', technique_name: 'Brute Force'}]};
  const result = formatReport(model(value), normalizeAlert(input()));
  assert.match(result.irisAlertBody.alert_tags, /mitre-T1110/);
  assert.match(result.irisEscalateBody.case_tags, /tactic-credential-access/);
  assert.match(result.slackMessage, /T1110/);
});
test('invalid MITRE suggestions stop formatting', () => {
  const value = {...report(), mitre_attack: [{tactic: 'x', technique_id: 'http://bad', technique_name: 'x'}]};
  assert.throws(() => formatReport(model(value), normalizeAlert(input())), /technique ID/);
});
