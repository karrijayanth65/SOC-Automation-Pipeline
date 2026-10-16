'use strict';

function eventTime(value) {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Invalid timestamp type');
  const text = String(value ?? '').trim();
  if (!text) throw new Error('Missing event timestamp');
  let date;
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    date = new Date(Number(text) * 1000);
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) {
    const [year, month, day] = text.slice(0, 10).split('-').map(Number);
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > days) throw new Error('Invalid calendar date');
    date = new Date(text);
  } else throw new Error('Use epoch seconds or ISO time with timezone');
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2100) {
    throw new Error('Invalid event timestamp');
  }
  return date.toISOString();
}

function publicIPv4(value) {
  if (typeof value !== 'string' || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return null;
  const octets = value.split('.').map(Number);
  if (octets.some(n => n > 255) || octets.map(String).join('.') !== value) return null;
  const [a, b, c] = octets;
  // Conservative external-lookup policy: IPv6 and special-use ranges require manual review.
  if (a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113)) return null;
  return value;
}

function identityText(value, key) {
  if (typeof value !== 'string') throw new Error('Invalid scalar identity: ' + key);
  const text = value.trim();
  if (!text || text.length > 255 || /[\r\n\0]/.test(text)) throw new Error('Invalid identity: ' + key);
  return text;
}

function integerField(value, key) {
  // Splunk webhook numeric fields may be decimal strings. Do not coerce booleans,
  // arrays, fractions, exponent notation or numbers outside JavaScript's exact range.
  const number = typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value) ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 0) {
    throw new Error('Invalid nonnegative safe integer: ' + key);
  }
  return number;
}

function normalizeAliases(result, keys, required) {
  const present = keys.filter(key => result[key] !== undefined);
  if (!present.length) {
    if (required) throw new Error('Missing source host');
    return;
  }
  for (const key of present) result[key] = identityText(result[key], key);
  const value = result[present[0]];
  // Do not infer equivalence between short names, FQDNs or qualified accounts.
  // Senders must select one source identity before aggregating events.
  if (present.some(key => result[key] !== value)) throw new Error('Conflicting identity aliases: ' + keys.join(', '));
  result[keys[0]] = value;
}

function normalizeAlert(input) {
  const body = input?.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !body.result || typeof body.result !== 'object' || Array.isArray(body.result)) {
    throw new Error('Expected a Splunk webhook body.result object');
  }
  const fields = ['host', 'ComputerName', 'Computer', 'user', 'User', 'target_account', 'initiating_user',
    'src_ip', 'dst_ip', 'count', 'drops', 'ports', 'attack_type', 'mitre_technique',
    'Image', 'CommandLine', 'ParentImage', 'ParentCommandLine', 'flags', 'sha256', '_time', 'Raw_Splunk_time',
    'actions', 'hits', 'EventCode', 'EventID', 'TargetSid', 'MemberSid'];
  const result = {};
  for (const key of fields) {
    const value = body.result[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && (!Array.isArray(value) || value.some(v => typeof v === 'object'))) {
      throw new Error('Unsupported field value: ' + key);
    }
    if (!['string', 'number', 'boolean', 'object'].includes(typeof value) ||
        (typeof value === 'number' && !Number.isFinite(value))) throw new Error('Invalid field: ' + key);
    if (JSON.stringify(value).length > 12000) throw new Error('Oversized field: ' + key);
    result[key] = value;
  }
  normalizeAliases(result, ['host', 'ComputerName', 'Computer'], true);
  normalizeAliases(result, ['user', 'User'], false);
  for (const key of ['target_account', 'initiating_user', 'TargetSid', 'MemberSid']) {
    if (result[key] !== undefined) result[key] = identityText(result[key], key);
  }
  for (const key of ['TargetSid', 'MemberSid']) {
    if (result[key] !== undefined && !/^S-\d+(?:-\d+)+$/.test(result[key])) throw new Error('Invalid Windows SID: ' + key);
  }
  for (const key of ['hits', 'EventCode', 'EventID']) {
    if (result[key] !== undefined) result[key] = integerField(result[key], key);
  }
  if (result.EventCode !== undefined && result.EventID !== undefined && result.EventCode !== result.EventID) {
    throw new Error('Conflicting event ID aliases');
  }
  if (result.ParentCommandLine !== undefined && typeof result.ParentCommandLine !== 'string') {
    throw new Error('Invalid ParentCommandLine type');
  }
  if (result.actions !== undefined) {
    const actions = Array.isArray(result.actions) ? result.actions : [result.actions];
    if (actions.length < 1 || actions.length > 20) throw new Error('Invalid actions count');
    result.actions = actions.map(value => {
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 300) throw new Error('Invalid action');
      return value.trim();
    });
  }
  result.event_time = eventTime(result.Raw_Splunk_time ?? result._time);
  result.public_ip = publicIPv4(result.src_ip);
  if (result.sha256 !== undefined && (typeof result.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(result.sha256))) {
    throw new Error('Invalid SHA-256');
  }
  if (result.sha256) result.sha256 = String(result.sha256).toLowerCase();
  if (typeof body.sid !== 'string') throw new Error('Invalid SID type');
  const sid = body.sid.trim();
  if (!sid || sid.length > 255 || /[\r\n]/.test(sid)) throw new Error('Missing or invalid Splunk SID');
  if (typeof body.search_name !== 'string') throw new Error('Invalid search_name type');
  const searchName = body.search_name.trim();
  if (!searchName || searchName.length > 255) throw new Error('Missing search_name');
  return {body: {sid, search_name: searchName, result}};
}

if (typeof module !== 'undefined') module.exports = {eventTime, publicIPv4, normalizeAlert};
