# Historical Capture Walkthrough

[Home](../README.md) · [Current flow](current-workflow.md) · [Setup](lab-environment.md) · [Asset manifest](../screenshots/manifest.csv)

These preserved captures are historical observations identified by the supplied remediation guide. They are not evidence that the revised workflow executed. Capture dates, producing execution IDs and previous redactions are unknown. Original images and identities are retained.

## Historical workflow canvas

![Historical n8n workflow canvas; not the current export](../screenshots/workflow-canvas.png)

The capture shows `Set link`; the current export uses `Normalize alert`. Use the [current graph](current-workflow.md) and [export](../workflows/pipeline-c.json) to inspect implemented behavior. A replacement capture requires the actual current inactive/configured canvas, plus a separately recorded execution when available.

## Historical case handoff

![Historical DFIR-IRIS case; not a current execution](../screenshots/dfir-iris-case.png)

The guide identifies historical account and customer identities. They must not be relabeled as a new run. The current formatter prepares a source SID and timestamp, but a payload fixture cannot establish that IRIS accepted it or created native assets/IOCs.

## Historical analyst notification

![Historical Slack message; formatting is not a current behavior contract](../screenshots/slack-notification.png)

The guide identifies formatted sections and clickable Splunk/IRIS links absent from the current formatter. This image is preserved as history. The current graph checks severity only after IRIS case escalation; High/Critical controls the Slack branch, while lower scores have already reached escalation. An approved case policy remains outstanding.

## Current evidence required

Run the local checks using `node --test tests/offline.test.cjs`. These use fixtures and establish offline behavior only.

A current execution packet must include the source event and SID, normalized alert, workflow revision and n8n execution ID, sanitized provider/tool response, IRIS alert/case IDs, Slack delivery outcome, exact component versions and timestamps. Include an error/failure trace as well as a successful path. No such packet has been supplied for this revision.

Store fresh captures separately. If a sensitive value must be hidden, retain the private original, record the redacted field and publish a sanitized derivative with its own hash. Do not change identities, timestamps or status results to imply an execution occurred.
