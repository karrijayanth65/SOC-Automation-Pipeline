'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {isDeepStrictEqual} = require('node:util');
const root = path.resolve(__dirname, '..');
const columns = ['run', 'attack_type', 'pipeline', 'pipeline_label', 'start_time', 'end_time',
  'triage_time_s', 'action_quality_5', 'context_quality_5', 'analyst_steps', 'notes'];
const numeric = new Set(['run', 'triage_time_s', 'action_quality_5', 'context_quality_5', 'analyst_steps']);

// RFC 4180-style parser: quoted commas, escaped quotes, CRLF and embedded newlines.
function parseCSV(input) {
  const text = input.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], value = '', quoted = false, closed = false;
  const field = () => { row.push(value); value = ''; closed = false; };
  const record = () => { field(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else value += ch;
    } else if (ch === ',') field();
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      record();
    } else if (ch === '"' && !value && !closed) quoted = true;
    else {
      if (ch === '"' || closed) throw new Error('Malformed CSV quoting at offset ' + i);
      value += ch;
    }
  }
  if (quoted) throw new Error('Unterminated quoted CSV field');
  if (row.length || value || closed) record();
  return rows;
}

function recordsFromCSV(text) {
  const [header, ...rows] = parseCSV(text);
  if (!header || !isDeepStrictEqual(header, columns)) throw new Error('Unexpected evaluation CSV columns');
  const seen = new Set();
  return rows.map((values, index) => {
    if (values.length !== columns.length) throw new Error('Wrong column count at CSV row ' + (index + 2));
    const record = Object.fromEntries(columns.map((key, i) => {
      if (!numeric.has(key)) return [key, values[i]];
      if (!/^(?:\d+)(?:\.\d+)?$/.test(values[i]) || !Number.isFinite(Number(values[i]))) {
        throw new Error('Invalid numeric value for ' + key + ' at CSV row ' + (index + 2));
      }
      return [key, Number(values[i])];
    }));
    if (!Number.isSafeInteger(record.run) || record.run < 1 || seen.has(record.run)) throw new Error('Invalid or duplicate run ID');
    seen.add(record.run);
    if (!['A', 'B', 'C'].includes(record.pipeline)) throw new Error('Unknown pipeline');
    for (const field of ['start_time', 'end_time']) {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(record[field])) throw new Error('Invalid ' + field);
    }
    for (const field of ['action_quality_5', 'context_quality_5']) {
      if (!Number.isInteger(record[field]) || record[field] < 1 || record[field] > 5) throw new Error('Invalid ' + field);
    }
    if (!Number.isSafeInteger(record.analyst_steps)) throw new Error('Invalid analyst_steps');
    return record;
  });
}

function dataBlock(html) {
  const matches = [...html.matchAll(/<script\b(?=[^>]*\bid\s*=\s*["']evaluation-data["'])[^>]*>([\s\S]*?)<\/script\s*>/gi)];
  if (matches.length !== 1) throw new Error('Expected exactly one evaluation-data script');
  return matches[0];
}

function generateDashboard(html, records) {
  const match = dataBlock(html);
  // Escape HTML-sensitive characters so CSV notes cannot close the script element.
  const json = JSON.stringify(records).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  const openingEnd = match[0].indexOf('>') + 1;
  const replacement = match[0].slice(0, openingEnd) + json + match[0].slice(openingEnd + match[1].length);
  return html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length);
}

function run(check = false) {
  const target = path.join(root, 'results/dashboard.html');
  const html = fs.readFileSync(target, 'utf8');
  const records = recordsFromCSV(fs.readFileSync(path.join(root, 'results/evaluation-results.csv'), 'utf8'));
  if (check) {
    if (!isDeepStrictEqual(JSON.parse(dataBlock(html)[1]), records)) throw new Error('Dashboard data drift. Run npm run generate:dashboard.');
    console.log('Dashboard data matches all ' + records.length + ' historical CSV records.');
  } else {
    fs.writeFileSync(target, generateDashboard(html, records));
    console.log('Generated dashboard JSON from ' + records.length + ' historical CSV records; source values preserved.');
  }
}
if (require.main === module) {
  try { run(process.argv.includes('--check')); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {parseCSV, recordsFromCSV, dataBlock, generateDashboard, run};
