# SOC Automation Pipeline

Built and evaluated by **Jayanth K** in a personal SOC lab. The project takes a Splunk alert through structured triage, an IRIS handoff and analyst notification.

`Splunk → n8n → GPT-4.1 Mini + AbuseIPDB / VirusTotal → DFIR-IRIS → Slack`

[Setup](#setup-and-validation) · [Workflow](#workflow-and-analyst-handoff) · [Lab gallery](#lab-and-detection-gallery) · [Results](#lab-evaluation) · [Code](docs/prompts-and-code.md) · [Credits](#credits-and-lab-context)

![Conceptual SOC pipeline overview](screenshots/pipeline-canva.png)

*Conceptual overview. The [current exported flow](docs/current-workflow.md) documents the actual node order; investigation, response and closure are analyst tasks.*

## What the project includes

Five detection routes cover authentication failures, process hashes, network scanning, account changes and PowerShell activity. The workflow normalizes source context, uses model-selected intelligence tools, validates the advisory and prepares IRIS and Slack payloads.

| Component | Included implementation |
|---|---|
| Intake | Five header-authenticated webhooks and a shared normalizer |
| Analysis | Model advisory with source-bound AbuseIPDB and VirusTotal tools |
| Validation | Input contracts, bounded report schema and pinned ATT&CK mappings |
| Handoff | IRIS alert/case requests and a High/Critical Slack branch |
| Checks | Offline regression tests, generated-code/data checks and CI configuration |

The captures below document the original lab experiment. Subsequent code-hardening changes have offline regression coverage; a new end-to-end run will measure the revised export. [Current implementation status](#current-implementation-status) · [Capture provenance](screenshots/manifest.csv).

## Workflow and analyst handoff

### n8n workflow

![Recorded lab n8n workflow canvas](screenshots/workflow-canvas.png)

*Original experiment canvas: it shows `Set link`; the current export uses `Normalize alert`. [Open full-size image](screenshots/workflow-canvas.png) · [Current workflow export](workflows/pipeline-c.json).*

### Analyst notification and case

<table>
<tr>
<th align="left" width="50%">Slack notification</th>
<th align="left" width="50%">DFIR-IRIS case</th>
</tr>
<tr>
<td valign="top"><a href="screenshots/slack-notification.png"><img src="screenshots/slack-notification.png" alt="Recorded lab Slack notification with severity, summary and analyst recommendations" width="100%"></a></td>
<td valign="top"><a href="screenshots/dfir-iris-case.png"><img src="screenshots/dfir-iris-case.png" alt="Recorded lab DFIR-IRIS case showing source context and tags" width="100%"></a></td>
</tr>
</table>

*Recorded lab captures; click either image for full resolution. Slack formatting and links differ from the current formatter. The IRIS account labels and case record are retained as captured during the experiment.*

### Investigation queue

![Recorded lab DFIR-IRIS case queue](screenshots/dfir-iris-cases-list.png)

*Recorded queue showing case priorities and tags. [View full size](screenshots/dfir-iris-cases-list.png). Native IOC/asset creation and current delivery still require integration evidence.*

## Lab and detection gallery

These images show the multi-VM setup used for the original lab experiment. The intended current deployment is single-host; exact installed services and versions still need to be recorded.

![Retained component architecture illustration](screenshots/architecture-diagram.png)

*Retained conceptual architecture, not a deployment verification. [Setup and communication paths](docs/lab-environment.md).*

<details>
<summary><strong>View the VMware environment and network</strong></summary>

### Virtual machines

![Recorded lab VMware lab overview](screenshots/vmware-lab-overview.png)

### Virtual network configuration

![Recorded lab VMware network configuration](screenshots/vmware-network-config.png)

### Lab topology

![Retained lab network topology](screenshots/lab-network-topology.png)

*These images describe the recorded lab setup. Capture dates and execution IDs are unknown where not recorded in the [asset manifest](screenshots/manifest.csv).*

</details>

<details>
<summary><strong>View the Splunk detections and endpoint telemetry</strong></summary>

### Saved alerts

![Recorded lab Splunk saved alerts](screenshots/splunk-alerts.png)

### Authentication search

![Recorded lab Splunk authentication-failure query](screenshots/splunk-brute-force-detection.png)

### Account-change search

![Recorded lab Splunk account-change query](screenshots/splunk-admin-detection.png)

### Endpoint telemetry

![Recorded lab Sysmon process-creation events](screenshots/sysmon-event-viewer.png)

*Recorded interfaces retain their original values. Current [query examples](splunk/detection-rules.md) and [sender contracts](splunk/validated-inputs.md) use `index=jayanth-project`.*

</details>

<details>
<summary><strong>View the lifecycle illustration and alternate pipeline diagram</strong></summary>

![Retained incident-response lifecycle illustration](screenshots/incident-response-workflow.png)

*Lifecycle illustration only: investigation, additional evidence collection, containment and closure are manual activities outside the export.*

![Alternate conceptual pipeline diagram](screenshots/pipeline.svg)

*Alternate explanatory asset. The exported connections, rather than this illustration, define the implemented order. [Current graph](docs/current-workflow.md).*

</details>

## Lab evaluation

The original dataset contains **15 runs**: 5 manual, 3 model-only and 7 with enrichment.

| Experiment mode | Runs | Mean triage time | Action quality / 5 | Context quality / 5 |
|---|---|---|---|---|
| Manual | 5 | 209.0 s | 3.00 | 3.60 |
| Model without tools | 3 | 130.0 s | 4.00 | 3.00 |
| Model with enrichment | 7 | 38.1 s | 4.57 | 4.29 |

The **81.8%** difference describes the recorded experiment. The groups have unequal scenario coverage and four timing discrepancies, detailed in the results page. Retesting after the code changes will provide a comparable measurement for the revised workflow. The chart accuracy axis is not supported by per-run labels in the CSV.

[View the comparison graphics and methodology](results/README.md#experiment-visuals) · [Explore the dashboard](results/dashboard.html) · [Download the unchanged CSV](results/evaluation-results.csv).

## Setup and validation

1. Review the [service setup](docs/lab-environment.md) and [detection inputs](splunk/validated-inputs.md).
2. Bind credentials in n8n and verify trusted URLs, tenant IDs and Slack routing. `env.example` is an inventory; n8n does not load it automatically.
3. Run the complete local checks with Node.js 24:

```bash
node scripts/check.cjs
```

4. Import the [workflow](workflows/pipeline-c.json) inactive. Resolve the case policy and capture a controlled execution packet before activation.

The checks need no npm install and use no service credentials. [Saved offline results](evidence/offline/validation.txt) · [Remediation record](RESUBMISSION.md) · [Engineering plan](Engineering_Action_Plan.md) · [Rollback](ROLLBACK.md).

## Current implementation status

<details>
<summary><strong>Technical boundaries and remaining integration work</strong></summary>

- The export creates an IRIS alert and attempts escalation **before** the severity check; High/Critical controls Slack only. The approved case/review policy remains open.
- Enrichment is model-selected. Deterministic provider lookups and retained provider evidence remain incomplete; free-form model reputation is not source evidence.
- Durable duplicate suppression, restart reconciliation, native IRIS IOC/asset mapping and deployment-specific ID/channel validation remain open.
- Tests cover offline code and fixtures. Exact service versions, live response envelopes and a current end-to-end evidence packet remain unverified.
- Current hardening preserves detection context, rejects ambiguous identities and malformed/refused model responses, validates ATT&CK mappings and checks generated-code drift.

See [RESUBMISSION.md](RESUBMISSION.md) for the full fix/evidence mapping. No node performs containment or closes an investigation.

</details>

## Credits and lab context

**Jayanth K** built this project, configured the personal lab and carried out the recorded experiment. The screenshots, dataset and original workflow document that work. Professional project attribution uses Jayanth K; see [LICENSE](LICENSE).

The later remediation includes AI-assisted code and documentation changes, with offline regression results recorded separately. The original experiment remains part of the project's evidence; performance and delivery changes in the revised export should be measured in a new run.

| Work | Project context |
|---|---|
| Lab setup and experiment | Jayanth K's own lab work |
| Workflow, Slack, IRIS and telemetry captures | Records from the original experiment; original files preserved |
| Evaluation dataset | Original 15-run experiment; timing discrepancies retained transparently |
| Subsequent hardening | Code, tests and documentation revisions with AI assistance and offline checks |

**Image preservation:** every original image is retained unchanged, with SHA-256 checks in the [manifest](screenshots/manifest.csv). Add fresh captures and redacted derivatives separately. [Preservation requirement](docs/asset-preservation.md).

Documentation updated 16 October 2026.
