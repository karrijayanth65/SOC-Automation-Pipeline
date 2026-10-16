'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {normalizeAlert} = require('../workflows/normalize-alert');

const input = fields => ({body: {sid: 'normalization-fixture-001', search_name: 'PowerShell', result: {
  host: 'LAB-WIN01', _time: '2026-10-15T12:00:00Z', ...fields,
}}});
const normalize = fields => normalizeAlert(input(fields)).body.result;

test('PowerShell sender fields survive normalization without losing the actor or parent context', () => {
  const result = normalize({User: 'LAB\\analyst', ParentCommandLine: 'cmd.exe /c powershell.exe -NoProfile', hits: '2'});
  assert.equal(result.User, 'LAB\\analyst');
  assert.equal(result.user, 'LAB\\analyst');
  assert.equal(result.ParentCommandLine, 'cmd.exe /c powershell.exe -NoProfile');
  assert.equal(result.hits, 2);
});

test('admin sender fields preserve group/member identities and actions', () => {
  const fields = {target_account: 'LAB\\new-user', initiating_user: 'LAB\\admin', EventCode: '4732',
    EventID: 4732, TargetSid: 'S-1-5-32-544', MemberSid: 'S-1-5-21-100-200-300-1001',
    actions: ['Added to Local Administrators Group'], hits: 1};
  const result = normalize(fields);
  assert.equal(result.EventCode, 4732);
  assert.equal(result.EventID, 4732);
  for (const key of ['target_account', 'initiating_user', 'TargetSid', 'MemberSid', 'actions', 'hits']) {
    assert.deepEqual(result[key], fields[key]);
  }
});

test('equivalent trimmed aliases are accepted and canonicalized', () => {
  const result = normalize({host: ' LAB-WIN01 ', ComputerName: 'LAB-WIN01', Computer: 'LAB-WIN01 ', user: 'analyst ', User: ' analyst'});
  assert.equal(result.host, 'LAB-WIN01');
  assert.equal(result.user, 'analyst');
});

test('source host can come from either documented host alias', () => {
  for (const key of ['ComputerName', 'Computer']) {
    const alert = input({[key]: 'LAB-WIN02'});
    delete alert.body.result.host;
    assert.equal(normalizeAlert(alert).body.result.host, 'LAB-WIN02');
  }
});

test('absent optional fields are not invented', () => {
  const result = normalize({});
  for (const key of ['user', 'User', 'hits', 'actions', 'EventCode', 'EventID', 'TargetSid', 'MemberSid', 'ParentCommandLine']) {
    assert.equal(Object.hasOwn(result, key), false);
  }
});

for (const fields of [
  {user: ['alice']}, {User: ['alice', 'bob']}, {target_account: ['alice', 'bob']},
  {initiating_user: ['alice']}, {user: 'alice', User: 'bob'}, {user: false},
  {host: 'LAB-WIN01', Computer: 'LAB-WIN02'}, {host: 'LAB-WIN01', ComputerName: ['LAB-WIN01']},
  {host: 'LAB-WIN01', Computer: ''}, {host: 'LAB-WIN01', Computer: 'lab-win01'},
]) {
  test('reject ambiguous or non-scalar identity ' + JSON.stringify(fields), () => assert.throws(() => normalize(fields)));
}

test('a single action string becomes an action list without being dropped', () => {
  assert.deepEqual(normalize({actions: 'User Account Created'}).actions, ['User Account Created']);
});

test('actions and hits accept their exact supported boundaries', () => {
  assert.deepEqual(normalize({actions: Array(20).fill('x'.repeat(300)), hits: 0}).actions, Array(20).fill('x'.repeat(300)));
  assert.equal(normalize({hits: String(Number.MAX_SAFE_INTEGER)}).hits, Number.MAX_SAFE_INTEGER);
});

for (const actions of [[], Array(21).fill('action'), ['x'.repeat(301)], [''], ['   '], [1], true, [['action']]]) {
  test('reject invalid actions ' + JSON.stringify(actions).slice(0, 80), () => assert.throws(() => normalize({actions})));
}

for (const hits of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '9007199254740992', '1e2', '1.0', '-1', '01', '', ' ', true, [1], NaN, Infinity]) {
  test('reject invalid hits ' + String(hits), () => assert.throws(() => normalize({hits})));
}

test('event IDs accept integer source representations but reject contradictory aliases', () => {
  assert.equal(normalize({EventID: '1'}).EventID, 1);
  assert.throws(() => normalize({EventID: '1', EventCode: 4732}), /Conflicting event ID/);
  for (const value of [true, [1], '4720x', 1.5, -1]) {
    assert.throws(() => normalize({EventID: value}));
    assert.throws(() => normalize({EventCode: value}));
  }
});

test('Windows SIDs are scalar, bounded SID strings', () => {
  for (const key of ['TargetSid', 'MemberSid']) {
    for (const value of [['S-1-5-18'], 544, 'Administrators', 'S-1-5-18\nInjected', 'S-1-5-' + '1'.repeat(250)]) {
      assert.throws(() => normalize({[key]: value}));
    }
  }
});

test('parent command line is a string and remains subject to the existing field-size limit', () => {
  for (const ParentCommandLine of [[], ['cmd.exe'], true, 12, 'x'.repeat(12001)]) {
    assert.throws(() => normalize({ParentCommandLine}));
  }
});

test('normalization leaves the source payload unchanged and keeps unknown fields out', () => {
  const alert = input({User: ' analyst ', actions: [' User Account Created '], secret: 'excluded'});
  const original = structuredClone(alert);
  const result = normalizeAlert(alert).body.result;
  assert.deepEqual(alert, original);
  assert.deepEqual(result.actions, ['User Account Created']);
  assert.equal(result.secret, undefined);
});
