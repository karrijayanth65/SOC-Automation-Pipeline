# SOC Automation Pipeline

**Jayanth K · Personal SOC lab project**

Automating alert intake, enrichment-assisted triage and the handoff to an analyst through Splunk, n8n, DFIR-IRIS and Slack.

[Lab results](#lab-evaluation-and-manual-effort) · [Skills](#skills-demonstrated) · [Workflow](#workflow-and-analyst-handoff) · [Lab setup](#lab-environment) · [Source and setup](#source-and-reproduction)

![SOC automation pipeline overview](screenshots/pipeline-canva.png)

## Lab evaluation and manual effort

Across the recorded lab groups, integrated triage averaged **38.1 seconds versus 209.0 seconds manually**—**81.8% lower recorded triage time**. The average recorded analyst-step count fell from **6.6 to 3.9**, a **41.6% reduction** using the unrounded means.

![Recorded triage time and analyst-step comparison](screenshots/lab-outcomes.png)

| Lab configuration | Runs | Mean triage time | Mean analyst steps | Context quality / 5 |
|---|---|---|---|---|
| Manual | 5 | 209.0 s | 6.6 | 3.60 |
| Model without tools | 3 | 130.0 s | 3.0 | 3.00 |
| Model with enrichment | 7 | 38.1 s | 3.9 | 4.29 |

The workflow brings source context, indicator lookups, a structured advisory and case handoff into one path. This reduces repeated manual searching, copying and report preparation. Analyst steps measure recorded actions, not active analyst time; the time and effort percentages describe the available lab records.

Model-only runs use fewer steps because they omit enrichment. The integrated mode combines the shortest recorded mean time with more investigation context. Group sizes and scenario coverage differ, and four rows have timing discrepancies; the [full evaluation](results/README.md) retains the calculation and timing notes.

[Explore the interactive dashboard](results/dashboard.html) · [View all recorded comparison graphics](results/README.md#experiment-visuals) · [Inspect the original CSV](results/evaluation-results.csv)

## Skills demonstrated

| Skill | Applied project work |
|---|---|
| Detection engineering | SPL searches for authentication failures, process hashes, scanning, account changes and PowerShell |
| Endpoint investigation | Windows Security and Sysmon context, users, parent processes, command lines and SHA-256 indicators |
| Workflow automation | Authenticated n8n webhooks, normalization, model/tool orchestration and downstream API requests |
| Threat-intelligence triage | Source-bound AbuseIPDB and VirusTotal lookups with analyst interpretation |
| Secure JavaScript | Input contracts, identity checks, bounded model responses, Slack escaping and pinned ATT&CK mapping validation |
| Case communication | Structured IRIS advisory payloads, case tags and analyst-facing Slack notifications |
| Engineering quality | Regression tests, source-generated workflow code, canonical chart data and CI checks |

## Workflow and analyst handoff

### n8n orchestration

![Recorded n8n workflow canvas](screenshots/workflow-canvas.png)

*Recorded experiment canvas. The included [reference export](workflows/pipeline-c.json) uses `Normalize alert` in place of `Set link`. [Full-size canvas](screenshots/workflow-canvas.png).*

### Analyst notification and case

<table>
<tr><th align="left" width="50%">Slack notification</th><th align="left" width="50%">DFIR-IRIS case</th></tr>
<tr>
<td valign="top"><a href="screenshots/slack-notification.png"><img src="screenshots/slack-notification.png" alt="Recorded Slack triage notification" width="100%"></a></td>
<td valign="top"><a href="screenshots/dfir-iris-case.png"><img src="screenshots/dfir-iris-case.png" alt="Recorded DFIR-IRIS case with source context and tags" width="100%"></a></td>
</tr>
</table>

*Recorded application views; click either image for full resolution. The captured Slack formatting belongs to that experiment version; [formatter source](workflows/format-report.js) describes the included code.*

### Investigation queue

![Recorded DFIR-IRIS investigation queue](screenshots/dfir-iris-cases-list.png)

*Case priorities, source tags and investigation context. [Full-size queue](screenshots/dfir-iris-cases-list.png).*

## Lab environment

The experiment uses Windows telemetry and dedicated SIEM, orchestration, case-management and test roles within the personal lab.

### Component architecture

![Component architecture illustration](screenshots/architecture-diagram.png)

*Conceptual architecture. The [export reference](docs/current-workflow.md) documents the actual included node order.*

### Virtual machines

![VMware lab environment](screenshots/vmware-lab-overview.png)

### Virtual network configuration

![VMware network configuration](screenshots/vmware-network-config.png)

### Network topology

![Lab network topology](screenshots/lab-network-topology.png)

[Machine roles, communication paths and setup procedure](docs/lab-environment.md)

## Detection and endpoint evidence

### Saved Splunk alerts

![Recorded Splunk saved alerts](screenshots/splunk-alerts.png)

### Authentication failures

![Splunk authentication-failure search](screenshots/splunk-brute-force-detection.png)

### Account changes

![Splunk account-change search](screenshots/splunk-admin-detection.png)

### Sysmon telemetry

![Sysmon process-creation events](screenshots/sysmon-event-viewer.png)

The [SPL examples](splunk/detection-rules.md) use `index=jayanth-project`. The [input contract](splunk/validated-inputs.md) documents the fields supplied to each route. Captured interfaces retain their original values.

## Investigation lifecycle

![Incident-response lifecycle illustration](screenshots/incident-response-workflow.png)

*The wider investigation includes analyst review, evidence collection, response choices and closure. These analyst activities are separate from the exported automation nodes.*

### Alternate pipeline view

![Alternate conceptual pipeline diagram](screenshots/pipeline.svg)

## Source and reproduction

| Reference | Contents |
|---|---|
| [n8n export](workflows/pipeline-c.json) | Inactive, credential-free workflow reference |
| [Normalizer](workflows/normalize-alert.js) | Event context, identity, timestamp and indicator checks |
| [Formatter](workflows/format-report.js) | Report parsing, ATT&CK checks and downstream payload construction |
| [Prompt and code guide](docs/prompts-and-code.md) | Model contract and included source behavior |
| [Lab setup](docs/lab-environment.md) | Service configuration and execution procedure |
| [Tests](tests/offline.test.cjs) | Reproducible software checks; CI runs on push and pull requests |

Use Node.js 24 to run the complete checks:

```bash
node scripts/check.cjs
```

Import the reference export inactive and bind credentials, URLs, tenant mappings and Slack routing in the target lab. `env.example` lists the configuration; importing the workflow does not automatically load it. In the included graph, IRIS escalation precedes the severity branch and High/Critical controls Slack. Model scores are advisory.

<a id="credits-and-lab-context"></a>

## Author and lab context

**Jayanth K** built the project, configured the personal lab and completed the recorded experiment. Later source hardening includes AI-assisted code and documentation revisions. The original dataset and image files are preserved; capture and documentation review date: **16 October 2026**, as confirmed by Jayanth K. Application event/case timestamps remain unchanged.

[MIT license](LICENSE) · [Image inventory and checksums](screenshots/manifest.csv) · [Lab walkthrough](docs/walkthrough.md)
