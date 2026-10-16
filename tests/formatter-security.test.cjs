'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {modelText, validateMitre, formatReport} = require('../workflows/format-report');
const {normalizeAlert} = require('../workflows/normalize-alert');
const {catalogFrom} = require('../scripts/generate-attack-catalog.cjs');
const fixture = require('./example-alert.json');
const report = {title:'Review',summary:'Advisory summary',likelihood:50,impact_score:50,recommended_actions:['Review source evidence']};
const envelope = data => ({status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(data)}]}]});
test('completed typed response is supported', () => {
  assert.deepEqual(JSON.parse(modelText(envelope(report))), report);
});
for (const status of ['incomplete','failed','cancelled','in_progress']) {
  test('reject model response status ' + status, () => assert.throws(() => modelText({...envelope(report),status}), /incomplete/));
}
test('reasoning preceding final message does not hide final report', () => {
  const model=envelope(report); model.output.unshift({type:'reasoning'});
  assert.equal(JSON.parse(modelText(model)).title,'Review');
});
test('refusal stops report even when text also exists', () => {
  const model=envelope(report); model.output[0].content.push({type:'refusal',refusal:'Declined'});
  assert.throws(() => modelText(model),/refusal/);
});
test('unfinished tool cycle is rejected', () => {
  const model=envelope(report); model.output.unshift({type:'function_call',name:'lookup'});
  assert.throws(() => modelText(model),/tool cycle/);
});
test('multiple report text blocks are rejected', () => {
  const model=envelope(report); model.output[0].content.push({type:'output_text',text:'{}'});
  assert.throws(() => modelText(model),/exactly one/);
});
test('empty output is rejected', () => assert.throws(() => modelText({output:[]}), /exactly one/));
test('invented ATT&CK ID is rejected', () => {
  assert.throws(() => validateMitre([{technique_id:'T9999',tactic:'Credential Access',technique_name:'Invented'}]),/Unknown technique/);
});
test('valid ID with invented tactic is rejected', () => {
  assert.throws(() => validateMitre([{technique_id:'T1110',tactic:'Invented',technique_name:'Brute Force'}]),/tactic mismatch/);
});
test('valid technique name is canonicalized from vendored catalog', () => {
  assert.deepEqual(validateMitre([{technique_id:'T1110',tactic:'Credential Access',technique_name:'Invented name'}]),
    [{technique_id:'T1110',tactic:'credential-access',technique_name:'Brute Force'}]);
});
test('revoked and deprecated entries cannot enter the catalog', () => {
  const pattern = flag => ({type:'attack-pattern',name:'Excluded',...flag,external_references:[{source_name:'mitre-attack',external_id:'T9999'}]});
  assert.deepEqual(catalogFrom({objects:[pattern({revoked:true}),pattern({x_mitre_deprecated:true})]}),{});
});
test('published catalog equals semantic source subset', () => {
  const root=path.resolve(__dirname,'..');
  assert.deepEqual(catalogFrom(JSON.parse(fs.readFileSync(path.join(root,'data/enterprise-attack.json')))),require('../data/attack-techniques.json'));
});
test('model verdict cannot overwrite source observation or enter source content as evidence', () => {
  const model=envelope({...report,iocs:[{type:'host',value:fixture.result.host,verdict:'Verified clean by VirusTotal'}]});
  const result=formatReport(model,normalizeAlert({body:structuredClone(fixture)}));
  assert.equal(result.parsedReport.iocs[0].verdict,'Observed in source alert');
  assert.equal(JSON.stringify(result).includes('Verified clean by VirusTotal'),false);
  assert.match(result.irisAlertBody.alert_note,/provider reputation is unverified/);
});
