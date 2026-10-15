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
  const allowed = ['title', 'summary', 'likelihood', 'impact_score', 'recommended_actions'];
  if (Object.keys(report).some(k => !allowed.includes(k)) || allowed.some(k => !(k in report))) {
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
  const note = `${report.summary}\n\nRecommendations (analyst review):\n` + report.recommended_actions.join('\n');
  return {
    riskLevel: severity,
    score,
    slackMessage: `[${severity}] ${slackText(report.title)}\nHost: ${slackText(body.result.host)}\nEvent time: ${slackText(body.result.event_time)}\n${slackText(note)}`,
    irisAlertBody: {
      alert_title: `[${severity}] ${report.title}`,
      alert_description: report.summary,
      alert_source: 'Splunk / SOC-Automation-Pipeline',
      alert_source_ref: body.sid,
      alert_customer_id: 1,
      alert_severity_id: severityIds[severity],
      alert_status_id: 1,
      alert_classification_id: 36,
      alert_tags: `source-splunk,review-required,sev-${severity.toLowerCase()}`,
      alert_source_event_time: body.result.event_time,
      alert_note: note,
      alert_source_content: {splunk: body, model_advisory: report, computed_score: score},
      alert_iocs: [], alert_assets: []
    },
    irisEscalateBody: {iocs_import_list: [], assets_import_list: [],
      note: 'Automated triage advisory; analyst review required.', import_as_event: true,
      case_tags: `source-splunk,review-required,sev-${severity.toLowerCase()}`}
  };
}

if (typeof module !== 'undefined') module.exports = {formatReport, slackText};
