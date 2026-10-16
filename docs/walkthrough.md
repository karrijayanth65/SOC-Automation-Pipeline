# From Alert to Analyst Handoff

[Home](../README.md) · [Setup](lab-environment.md) · [Detections](../splunk/validated-inputs.md)

Follow the alert from orchestration to the case and analyst notification. The purpose of the handoff is to deliver the source event, relevant context and next review steps together, so the analyst can continue the investigation without reconstructing the alert from several tools.

## Workflow canvas

![n8n workflow canvas](../screenshots/workflow-canvas.png)

Five alert types converge on a shared analysis path. The current export adds normalization ahead of model analysis and validates the report before downstream requests.

## Case handoff

![DFIR-IRIS case view](../screenshots/dfir-iris-case.png)

The case keeps the alert and its interpretation in one investigation record. The formatter carries the original source SID and event timestamp into the payload, making it possible to check the summary against the source event and track the handoff.

## Analyst notification

![Slack alert detail](../screenshots/slack-notification.png)

The High/Critical branch brings higher-priority cases to the analyst after escalation. Lower scores still reach IRIS but do not take that Slack branch. The message supplies context and recommended review steps; the analyst chooses the response.

## A reproducible local check

The [example alert](../tests/example-alert.json) exercises normalization with a private client IP, a dedicated lab identity and a timezone-qualified event time. The tests supply a fixed model response to make the formatter deterministic, then verify the resulting severity and IRIS fields. Read the code in [normalize-alert.js](../workflows/normalize-alert.js) and [format-report.js](../workflows/format-report.js) alongside their embedded n8n nodes.

```bash
node --test tests/offline.test.cjs
```

To review a real integration, retain the Splunk SID, n8n execution ID, tool results, IRIS alert/case IDs and downstream delivery status. Those identifiers let you trace one alert across the entire handoff without inferring success from a screenshot alone.
