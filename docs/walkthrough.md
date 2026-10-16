# Recorded Lab Walkthrough

[Home](../README.md) · [Current flow](current-workflow.md) · [Setup](lab-environment.md) · [Asset manifest](../screenshots/manifest.csv)

These captures document Jayanth K's original experiment in a personal SOC lab. They show the workflow version used at that time. The lab executions and documentation are complete. Screenshot capture and documentation review date: **16 October 2026**, confirmed by Jayanth K. Original images and embedded event/case timestamps are preserved.

## Original workflow canvas

![Recorded lab n8n workflow canvas; not the current export](../screenshots/workflow-canvas.png)

The capture shows `Set link`; the current export uses `Normalize alert`. Use the [current graph](current-workflow.md) and [export](../workflows/pipeline-c.json) to inspect implemented behavior. The image preserves the canvas used in the recorded experiment.

## Recorded case handoff

![Recorded lab DFIR-IRIS case; not a current execution](../screenshots/dfir-iris-case.png)

The recorded account and customer labels are preserved as they appeared in the lab. Professional project attribution uses Jayanth K. The linked formatter shows how the included source prepares source identity, event time and IRIS payload fields.

## Recorded analyst notification

![Recorded lab Slack message; formatting is not a current behavior contract](../screenshots/slack-notification.png)

The captured message contains formatted sections and clickable Splunk/IRIS links absent from the current formatter. Preserve it as evidence of the original experiment. The current graph checks severity only after IRIS case escalation; High/Critical controls the Slack branch, while lower scores have already reached escalation. This describes the node order of the linked export.

## Execution and source references

Run the local checks using `node scripts/check.cjs`. These use fixtures and establish offline behavior only.

The completed lab follows the source event through normalization, model analysis, IRIS handoff and Slack notification. The [export reference](../workflows/pipeline-c.json), [input guide](../splunk/validated-inputs.md) and [formatter source](../workflows/format-report.js) describe the included files. Execution identifiers and application timestamps remain source values; they are not replaced with the documentation date.

Store fresh captures separately. If a sensitive value must be hidden, retain the private original, record the redacted field and publish a sanitized derivative with its own hash. Do not change identities, timestamps or status results to imply an execution occurred.
