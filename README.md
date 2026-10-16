# SOC Automation Pipeline

From a Splunk alert to a structured triage advisory, an IRIS handoff and an analyst notification.

`Splunk → n8n → GPT-4.1 Mini + AbuseIPDB / VirusTotal → DFIR-IRIS → Slack`

[Setup](#setup-and-validation) · [Workflow](#workflow-and-analyst-handoff) · [Lab gallery](#lab-and-detection-gallery) · [Results](#historical-evaluation) · [Code](docs/prompts-and-code.md) · [Credits](#credits-and-lab-context)

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

Current validation is offline. The interface captures below are preserved historical lab views, not proof that the revised export has completed a live run. [Current implementation status](#current-implementation-status) · [Capture provenance](screenshots/manifest.csv).

## Workflow and analyst handoff

### n8n workflow

![Historical n8n workflow canvas](screenshots/workflow-canvas.png)

*Historical canvas: it shows `Set link`; the current export uses `Normalize alert`. [Open full-size image](screenshots/workflow-canvas.png) · [Current workflow export](workflows/pipeline-c.json).*

### Analyst notification and case

<table>
<tr>
<th align="left" width="50%">Slack notification</th>
<th align="left" width="50%">DFIR-IRIS case</th>
</tr>
<tr>
<td valign="top"><a href="screenshots/slack-notification.png"><img src="screenshots/slack-notification.png" alt="Historical Slack notification with severity, summary and analyst recommendations" width="100%"></a></td>
<td valign="top"><a href="screenshots/dfir-iris-case.png"><img src="screenshots/dfir-iris-case.png" alt="Historical DFIR-IRIS case showing source context and tags" width="100%"></a></td>
</tr>
</table>

*Historical captures; click either image for full resolution. Slack formatting and links differ from the current formatter. The IRIS identity and case record belong to the recorded historical setup.*

### Investigation queue

![Historical DFIR-IRIS case queue](screenshots/dfir-iris-cases-list.png)

*Historical queue showing case priorities and tags. [View full size](screenshots/dfir-iris-cases-list.png). Native IOC/asset creation and current delivery still require integration evidence.*

## Lab and detection gallery

The retained lab images explain the original multi-VM study. The intended current deployment is single-host; exact installed services and versions still need to be recorded.

![Retained component architecture illustration](screenshots/architecture-diagram.png)

*Retained conceptual architecture, not a deployment verification. [Setup and communication paths](docs/lab-environment.md).*

<details>
<summary><strong>View the VMware environment and network</strong></summary>

### Virtual machines

![Historical VMware lab overview](screenshots/vmware-lab-overview.png)

### Virtual network configuration

![Historical VMware network configuration](screenshots/vmware-network-config.png)

### Lab topology

![Retained lab network topology](screenshots/lab-network-topology.png)

*These images describe the retained historical setup. Capture dates and execution IDs are unknown where not recorded in the [asset manifest](screenshots/manifest.csv).*

</details>

<details>
<summary><strong>View the Splunk detections and endpoint telemetry</strong></summary>

### Saved alerts

![Historical Splunk saved alerts](screenshots/splunk-alerts.png)

### Authentication search

![Historical Splunk authentication-failure query](screenshots/splunk-brute-force-detection.png)

### Account-change search

![Historical Splunk account-change query](screenshots/splunk-admin-detection.png)

### Endpoint telemetry

![Historical Sysmon process-creation events](screenshots/sysmon-event-viewer.png)

*Historical interfaces retain their original values. Current [query examples](splunk/detection-rules.md) and [sender contracts](splunk/validated-inputs.md) use `index=jayanth-project`.*

</details>

<details>
<summary><strong>View the lifecycle illustration and alternate pipeline diagram</strong></summary>

![Retained incident-response lifecycle illustration](screenshots/incident-response-workflow.png)

*Lifecycle illustration only: investigation, additional evidence collection, containment and closure are manual activities outside the export.*

![Alternate conceptual pipeline diagram](screenshots/pipeline.svg)

*Alternate explanatory asset. The exported connections, rather than this illustration, define the implemented order. [Current graph](docs/current-workflow.md).*

</details>

## Historical evaluation

The original dataset contains **15 runs**: 5 manual, 3 model-only and 7 with enrichment.

| Historical mode | Runs | Mean triage time | Action quality / 5 | Context quality / 5 |
|---|---|---|---|---|
| Manual | 5 | 209.0 s | 3.00 | 3.60 |
| Model without tools | 3 | 130.0 s | 4.00 | 3.00 |
| Model with enrichment | 7 | 38.1 s | 4.57 | 4.29 |

The **81.8%** difference is descriptive of these inherited records. Unequal scenario coverage and timing discrepancies prevent treating it as a verified improvement for the updated workflow. The historical charts include an accuracy dimension that the CSV cannot validate.

[View the comparison graphics and methodology](results/README.md#historical-visuals) · [Explore the dashboard](results/dashboard.html) · [Download the unchanged CSV](results/evaluation-results.csv).

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

Based on Christopher Andrews's [LARA SOC Automation](https://github.com/C-Andr3ws/lara-soc-automation/tree/41866043d4581ed85d4e921d26bb5e42625af299), source commit `41866043d4581ed85d4e921d26bb5e42625af299`. Existing copyright and permission notices remain in [LICENSE](LICENSE).

The screenshots and evaluation are retained historical material. This revision includes AI-assisted code and documentation changes; historical results do not validate the revised export. Personal lab participation remains unverified without supporting tasks, dates and execution artifacts.

<details>
<summary><strong>Contribution and evidence details</strong></summary>

| Material | Attribution and scope |
|---|---|
| Evaluation CSV and historical study | Upstream inheritance reported by the supplied remediation guide |
| Workflow, Slack and IRIS captures | Historical/inherited captures identified by the guide; original identities retained |
| Other illustrations and images | Per-file origin is unknown where not evidenced; see the manifest |
| Code, tests and documentation | Inspect repository commits for actual contributions; presence alone does not prove personal lab execution |
| Remediation | AI-assisted edits and offline validation; current live results remain unverified |

The guide reports 14 byte-for-byte image/diagram matches and a matching CSV at audited commit `0f46773d53f53a3de78b937b56fb317c3977b317`. The individual 14 matches have not all been independently mapped here. Reuse is documented; the available evidence does not establish fabrication, theft or sole authorship.

</details>

**Image preservation:** every original image is retained unchanged, with SHA-256 checks in the [manifest](screenshots/manifest.csv). Add fresh captures and redacted derivatives separately. [Preservation requirement](docs/asset-preservation.md).

Documentation updated 16 October 2026.
