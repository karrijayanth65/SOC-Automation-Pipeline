'use strict';
// Everything is local: the embedded records are generated from evaluation-results.csv.
const records = JSON.parse(document.getElementById('evaluation-data').textContent);
const names = {A: 'Manual', B: 'AI without tools', C: 'AI with enrichment'};
const colors = {A: '#ba5259', B: '#a56d16', C: '#27866d'};
const order = ['C', 'B', 'A'];
const scenarios = [...new Set(records.map(r => r.attack_type))];
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const mean = (rows, key) => rows.length ? rows.reduce((sum, r) => sum + Number(r[key]), 0) / rows.length : null;
const fmt = (value, digits = 1) => value === null ? '—' : Number(value).toFixed(digits);
const clock = value => { const [h, m, s] = value.split(':').map(Number); return h * 3600 + m * 60 + s; };
const elapsed = r => (clock(r.end_time) - clock(r.start_time) + 86400) % 86400;
const mismatch = r => Math.abs(elapsed(r) - r.triage_time_s) > .11;
const byMode = (rows, mode) => rows.filter(r => r.pipeline === mode);
const improvement = (value, baseline) => value !== null && baseline > 0 ? (baseline - value) / baseline * 100 : null;

function table(headers, rows, caption) {
  return '<table><caption>' + esc(caption) + '</caption><thead><tr>' +
    headers.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr>' + r.map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
}

function chart(target, title, groups, max, unit) {
  const width = 780, left = 228, right = 58, barWidth = width - left - right;
  const height = Math.max(118, groups.length * 32 + 50);
  const denominator = max || 1;
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height +
    '" role="img" aria-label="' + esc(title) + '"><title>' + esc(title) + '</title>';
  for (let i = 0; i <= 4; i++) {
    const x = left + barWidth * i / 4;
    svg += '<path d="M' + x + ' 16V' + (height - 30) + '" stroke="#e2e9ed"/><text x="' + x +
      '" y="' + (height - 8) + '" font-size="12" text-anchor="middle" fill="#586d78">' + fmt(denominator * i / 4, 0) + '</text>';
  }
  groups.forEach((g, i) => {
    const y = 24 + i * 32;
    svg += '<text x="' + (left - 12) + '" y="' + (y + 12) + '" text-anchor="end" font-size="13" fill="#213946">' + esc(g.label) + '</text>';
    svg += '<rect x="' + left + '" y="' + y + '" width="' + Math.max(0, barWidth * g.value / denominator) +
      '" height="19" rx="3" fill="' + colors[g.mode] + '"><title>' + esc(g.label + ': ' + fmt(g.value) + unit) + '</title></rect>';
    svg += '<text x="' + (left + barWidth * g.value / denominator + 7) + '" y="' + (y + 14) + '" font-size="12" fill="#213946">' + fmt(g.value) + '</text>';
  });
  document.getElementById(target).innerHTML = '<h3>' + esc(title) + '</h3>' + svg + '</svg>';
}

function render() {
  const mode = document.getElementById('mode').value;
  const scenario = document.getElementById('scenario').value;
  const selected = records.filter(r => (!mode || r.pipeline === mode) && (!scenario || r.attack_type === scenario));
  const manual = mean(records.filter(r => r.pipeline === 'A' && (!scenario || r.attack_type === scenario)), 'triage_time_s');
  const integrated = mean(byMode(selected, 'C'), 'triage_time_s');
  const baseline = mean(byMode(selected, 'A'), 'triage_time_s');
  const cards = [[selected.length, 'selected records'], [fmt(integrated) + ' s', 'integrated mean time'],
    [fmt(baseline) + ' s', 'manual mean time'], [fmt(improvement(integrated, manual)) + '%', 'integrated reduction vs manual']];
  document.getElementById('metrics').innerHTML = cards.map(([v, label]) => '<div class="card"><strong>' + esc(v) + '</strong><span>' + esc(label) + '</span></div>').join('');
  document.getElementById('selection-note').textContent = selected.length + ' of ' + records.length + ' records shown. Charts and tables follow the selected filters. Baseline comparisons use matching-scenario manual records.';
  const groups = order.filter(m => byMode(selected, m).length).map(m => ({
    mode: m, rows: byMode(selected, m), label: names[m], value: mean(byMode(selected, m), 'triage_time_s')}));
  chart('time-chart', 'Mean triage time (seconds)', groups, Math.max(1, ...groups.map(g => g.value)) * 1.15, ' s');
  const quality = groups.flatMap(g => [
    {label: names[g.mode] + ' · action', mode: g.mode, value: mean(g.rows, 'action_quality_5')},
    {label: names[g.mode] + ' · context', mode: g.mode, value: mean(g.rows, 'context_quality_5')}]);
  chart('quality-chart', 'Action and context quality / 5', quality, 5, ' / 5');
  document.getElementById('overall').innerHTML = table(
    ['Mode', 'Runs', 'Time (s)', 'Action / 5', 'Context / 5', 'Steps', 'Time reduction vs manual'],
    groups.map(g => [names[g.mode], g.rows.length, fmt(g.value), fmt(mean(g.rows, 'action_quality_5'), 2),
      fmt(mean(g.rows, 'context_quality_5'), 2), fmt(mean(g.rows, 'analyst_steps')), fmt(improvement(g.value, manual)) + '%']),
    'Averages from the selected records; missing modes are omitted.');
  const scenarioGroups = scenarios.filter(s => !scenario || s === scenario).flatMap(s =>
    order.filter(m => selected.some(r => r.attack_type === s && r.pipeline === m)).map(m => {
      const rows = selected.filter(r => r.attack_type === s && r.pipeline === m);
      return {mode: m, label: s.replace('Admin Privilege Escalation', 'Admin changes') + ' · ' + m, rows,
        scenario: s, value: mean(rows, 'triage_time_s')};
    }));
  chart('scenario-chart', 'Triage time by scenario and mode (seconds)', scenarioGroups, Math.max(1, ...scenarioGroups.map(g => g.value)) * 1.15, ' s');
  document.getElementById('scenario-summary').innerHTML = table(
    ['Scenario', 'Mode', 'Runs', 'Mean seconds', 'Action / 5', 'Context / 5', 'Steps'],
    scenarioGroups.map(g => [g.scenario, names[g.mode], g.rows.length, fmt(g.value),
      fmt(mean(g.rows, 'action_quality_5'), 2), fmt(mean(g.rows, 'context_quality_5'), 2), fmt(mean(g.rows, 'analyst_steps'))]),
    'Per-scenario grouping uses only the rows present in the CSV.');
  const header = ['#', 'Scenario', 'Mode', 'Start', 'End', 'Recorded s', 'Clock s', 'Action / 5', 'Context / 5', 'Steps', 'Notes'];
  document.getElementById('records-table').innerHTML = '<table><caption>' + selected.length + ' recorded rows; times retain their original format.</caption><thead><tr>' +
    header.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
    selected.map(r => '<tr' + (mismatch(r) ? ' class="warn"' : '') + '>' +
      [r.run, r.attack_type, names[r.pipeline], r.start_time, r.end_time, r.triage_time_s, elapsed(r),
        r.action_quality_5, r.context_quality_5, r.analyst_steps, r.notes].map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  document.getElementById('findings').innerHTML = '<p>The selected records contain ' + selected.filter(mismatch).length +
    ' timing mismatches. Integrated triage time averages ' + esc(fmt(integrated)) + ' seconds where integrated rows are selected. Read action and context scores together with step counts; fewer steps can reflect omitted enrichment.</p>';
}

document.getElementById('scenario').innerHTML += scenarios.map(s => '<option value="' + esc(s) + '">' + esc(s) + '</option>').join('');
document.getElementById('mode').addEventListener('change', render);
document.getElementById('scenario').addEventListener('change', render);
document.getElementById('reset').addEventListener('click', () => {
  document.getElementById('mode').value = ''; document.getElementById('scenario').value = ''; render();
});
render();
