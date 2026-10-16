'use strict';

function requiredText(value, field, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid ' + field);
  return value.trim();
}

function slackText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatReport(model, alert) {
  const text = model?.output?.[0]?.content?.[0]?.text;
  if (typeof text !== 'string' || text.length > 24000) throw new Error('Missing or oversized model output');
  const report = JSON.parse(text);
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw new Error('Expected report object');
  const required = ['title', 'summary', 'likelihood', 'impact_score', 'recommended_actions'];
  const allowed = [...required, 'alert_type', 'iocs', 'mitre_attack'];
  if (Object.keys(report).some(k => !allowed.includes(k)) || required.some(k => !(k in report))) {
    throw new Error('Unexpected report fields');
  }
  report.title = requiredText(report.title, 'title', 180);
  report.summary = requiredText(report.summary, 'summary', 2500);
  for (const key of ['likelihood', 'impact_score']) {
    if (!Number.isInteger(report[key]) || report[key] < 0 || report[key] > 100) throw new Error('Invalid ' + key);
  }
  if (!Array.isArray(report.recommended_actions) || report.recommended_actions.length < 1 ||
      report.recommended_actions.length > 8) throw new Error('Invalid recommended_actions');
  report.recommended_actions = report.recommended_actions.map(v => requiredText(v, 'action', 300));
  const body = alert.body;
  const score = Math.round((report.likelihood + report.impact_score) / 2);
  const severity = score >= 90 ? 'Critical' : score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  const severityIds = {Low: 2, Medium: 4, High: 5, Critical: 6};
  const source = body.result;
  const sourceIocs = [];
  const addSource = (type, value) => {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === 'string' && item.trim() && !sourceIocs.some(i => i.type === type && i.value === item.trim())) {
        sourceIocs.push({type, value: requiredText(item, 'source indicator', 512), verdict: 'Observed in source alert'});
      }
    }
  };
  addSource('host', source.host);
  addSource('user', source.target_account);
  addSource('user', source.initiating_user);
  addSource('user', source.user);
  addSource('ip', source.src_ip);
  addSource('ip', source.dst_ip);
  addSource('hash', source.sha256);
  if (sourceIocs.length > 20) throw new Error('Too many source indicators');
  if (report.alert_type !== undefined) report.alert_type = requiredText(report.alert_type, 'alert_type', 120);
  if (report.iocs !== undefined) {
    if (!Array.isArray(report.iocs) || report.iocs.length > 12) throw new Error('Invalid iocs');
    for (const ioc of report.iocs) {
      if (!ioc || typeof ioc !== 'object' || Array.isArray(ioc) ||
          Object.keys(ioc).some(k => !['type', 'value', 'verdict'].includes(k))) throw new Error('Invalid IOC fields');
      const type = requiredText(ioc.type, 'IOC type', 20);
      const value = requiredText(ioc.value, 'IOC value', 512);
      const original = sourceIocs.find(i => i.type === type && i.value === value);
      if (!original) throw new Error('Model IOC is not in the source alert');
      original.verdict = requiredText(ioc.verdict, 'IOC verdict', 500);
    }
  }
  const mitre = report.mitre_attack ?? [];
  if (!Array.isArray(mitre) || mitre.length > 2) throw new Error('Invalid MITRE mappings');
  for (const mapping of mitre) {
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping) ||
        Object.keys(mapping).some(k => !['tactic', 'technique_id', 'technique_name'].includes(k))) throw new Error('Invalid MITRE fields');
    mapping.tactic = requiredText(mapping.tactic, 'tactic', 80);
    mapping.technique_name = requiredText(mapping.technique_name, 'technique_name', 120);
    if (typeof mapping.technique_id !== 'string' || !/^T\d{4}(?:\.\d{3})?$/.test(mapping.technique_id)) throw new Error('Invalid technique ID');
  }
  const detection = (body.search_name + ' ' + (source.attack_type || '')).toLowerCase();
  let detTag = 'det-other', classificationId = 36;
  if (/powershell/.test(detection)) {detTag = 'det-suspicious-powershell'; classificationId = 21;}
  else if (/admin|account creation|group change/.test(detection)) {detTag = 'det-admin-account-creation'; classificationId = 17;}
  else if (/scan|probing/.test(detection)) {detTag = 'det-port-scan'; classificationId = 11;}
  else if (/hash|malware/.test(detection)) {detTag = 'det-file-hash'; classificationId = 7;}
  else if (/auth|brute|failed|login/.test(detection)) {detTag = 'det-rdp-bruteforce'; classificationId = 15;}
  const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const tags = [...new Set(['source-splunk', 'review-required', 'automation-ai', 'pipeline-n8n',
    'sev-' + severity.toLowerCase(), detTag, ...sourceIocs.map(i => 'ioc-' + i.type),
    ...mitre.flatMap(m => ['mitre-' + m.technique_id, 'tactic-' + slug(m.tactic)])])].join(',');
  const indicators = sourceIocs.map(i => i.type + ': ' + i.value + ' — ' + i.verdict).join('\n');
  const mappings = mitre.map(m => m.technique_id + ' ' + m.technique_name + ' (' + m.tactic + ')').join('\n');
  const note = `${report.summary}\n\nIndicators (model verdicts require review):\n` + indicators +
    (mappings ? '\n\nSuggested MITRE mappings:\n' + mappings : '') +
    '\n\nRecommendations (analyst review):\n' + report.recommended_actions.join('\n');
  return {
    riskLevel: severity,
    score,
    parsedReport: {...report, iocs: sourceIocs, mitre_attack: mitre, severity, risk_score: score, raw_time: source.event_time},
    summaryMessage: '[' + severity + '] ' + slackText(report.title),
    detailsChannel: {Low: '#soc-low', Medium: '#soc-med', High: '#soc-high', Critical: '#soc-critical'}[severity],
    slackMessage: `[${severity}] ${slackText(report.title)}\nHost: ${slackText(body.result.host)}\nEvent time: ${slackText(body.result.event_time)}\n${slackText(note)}`,
    irisAlertBody: {
      alert_title: `[${severity}] ${report.title}`,
      alert_description: report.summary,
      alert_source: 'Splunk / SOC-Automation-Pipeline',
      alert_source_ref: body.sid,
      alert_customer_id: 1,
      alert_severity_id: severityIds[severity],
      alert_status_id: 1,
      alert_classification_id: classificationId,
      alert_tags: tags,
      alert_source_event_time: body.result.event_time,
      alert_note: note,
      alert_source_content: {splunk: body, model_advisory: report, computed_score: score},
      alert_iocs: [], alert_assets: []
    },
    irisEscalateBody: {iocs_import_list: [], assets_import_list: [],
      note: 'Automated triage advisory; analyst review required.', import_as_event: true,
      case_tags: tags}
  };
}

if (typeof module !== 'undefined') module.exports = {formatReport, slackText};
