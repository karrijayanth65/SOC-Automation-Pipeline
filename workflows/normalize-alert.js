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

function normalizeAlert(input) {
  const body = input?.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !body.result || typeof body.result !== 'object' || Array.isArray(body.result)) {
    throw new Error('Expected a Splunk webhook body.result object');
  }
  const fields = ['host', 'ComputerName', 'Computer', 'user', 'target_account', 'initiating_user',
    'src_ip', 'dst_ip', 'count', 'drops', 'ports', 'attack_type', 'mitre_technique',
    'Image', 'CommandLine', 'ParentImage', 'flags', 'sha256', '_time', 'Raw_Splunk_time'];
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
  const hostValue = result.host || result.ComputerName || result.Computer;
  if (typeof hostValue !== 'string') throw new Error('Invalid source host type');
  const host = hostValue.trim();
  if (!host || host.length > 255 || /[\r\n]/.test(host)) throw new Error('Missing or invalid source host');
  result.host = host;
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
