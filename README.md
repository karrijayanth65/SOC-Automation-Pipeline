# SOC Automation Pipeline

Evaluating how AI and threat intelligence change the speed and usefulness of SOC triage.

`Splunk → n8n → GPT-4.1 Mini + AbuseIPDB / VirusTotal → DFIR-IRIS → Slack`

An analyst investigating an alert has to connect log evidence, indicator reputation, severity and recommended next steps. Repeating those lookups and copying context between tools takes time.

This lab brings that work into one pipeline and compares three ways to perform it: manual investigation, model-assisted analysis, and model analysis with threat intelligence enrichment. Five scenarios and 15 recorded runs show the trade-offs in triage time, context quality and analyst effort.

[Setup](docs/lab-environment.md) · [Detection rules](splunk/detection-rules.md) · [Scenarios](docs/attack-scenarios.md) · [Results](results/README.md) · [Dashboard](results/dashboard.html) · [Prompts and code](docs/prompts-and-code.md)

## What makes this project useful

The project connects an operational workflow to a measurable comparison. Readers can inspect both the handoff between tools and the records behind the results.

| Added value | What you can inspect |
|---|---|
| A comparison that separates model assistance from enrichment | Manual, model-only and integrated results, with raw rows and scoring definitions |
| Context carried into the investigation | Source events, indicator lookups, structured summaries, case tags and analyst notifications |
| Checks around automated handoffs | Authenticated webhooks, source-bound indicators, schema validation and 67 offline tests |
| A path from explanation to reproduction | Architecture, five SPL detections, configuration notes, readable code and an interactive results dashboard |

## Results at a glance

In the recorded lab data, integrated triage averaged **38.1 seconds versus 209 seconds manually**, a reduction of approximately **82%**. Its mean context score was **4.29/5**, compared with **3.60/5** manually and **3.00/5** for model-only analysis.

That combination matters: a useful handoff needs investigation context as well as a short turnaround. The groups have different scenario coverage and run counts, which are retained below and explained in the [evaluation method](results/README.md#method).

| Metric | A: Manual | B: AI without tools | C: AI with enrichment |
|---|---|---|---|
| Runs | 5 | 3 | 7 |
| Average triage time | 209.0 s | 130.0 s | 38.1 s |
| Time reduction vs manual | — | 37.8% | 81.8% |
| Action quality / 5 | 3.00 | 4.00 | 4.57 |
| Context quality / 5 | 3.60 | 3.00 | 4.29 |
| Average analyst steps | 6.6 | 3.0 | 3.9 |

![Recorded radar comparing speed, action quality, context quality, efficiency and reported accuracy](screenshots/pipeline-comparison-radar.png)

[Explore the records and calculations](results/README.md) · [Use the interactive dashboard](results/dashboard.html).

The radar retains the recorded evaluation's scales. The CSV supports the time, quality and step calculations; accuracy has no per-run column. Reconciliation notes explain four timing mismatches and the integrated step mean of 3.9.

## How the pipeline works

![Six-stage alert-to-case architecture](screenshots/pipeline.svg)

Authenticated intake, source normalization and output validation keep the original alert traceable through model analysis and the case handoff.

### What each stage contributes

| Capability | Implementation |
|---|---|
| Five alert inputs | Authentication, hash, scanning, account change and PowerShell webhooks |
| Intelligence enrichment | AbuseIPDB IP reputation; VirusTotal IP and SHA-256 lookups |
| Structured triage | Validated summary, scores, recommendations, source-bound indicators and MITRE suggestions |
| Case management | IRIS alert creation followed by case escalation |
| Investigation context | Original SID/time, indicator detail, detection tags and classification defaults |
| Analyst notification | Formatted Slack output for the High/Critical branch |
| Evaluation | Raw 15-run CSV, methodology, radar, interactive charts and comparison tables |
| Reproducibility | Configuration inventory, readable node code and offline tests |

## Follow an alert from detection to handoff

These views connect the architecture to the information an analyst receives: one workflow, one notification, a case record and a queue for prioritizing investigations.

### n8n workflow

![n8n workflow canvas](screenshots/workflow-canvas.png)

Five input routes converge on model analysis, tool enrichment and downstream handoff. The current export also includes the shared normalization node.

### Slack notification

![Slack notification with severity, summary and investigation detail](screenshots/slack-notification.png)

The analyst receives a concise summary and investigation context. The export sends this branch after IRIS escalation for High/Critical scores.

### DFIR-IRIS case

![DFIR-IRIS case showing severity, tags and description](screenshots/dfir-iris-case.png)

The alert payload preserves the original source SID, event time, report and indicator context.

### DFIR-IRIS queue

![DFIR-IRIS open-case queue](screenshots/dfir-iris-cases-list.png)

The queue groups investigations with severity, source and indicator tags.

## Lab environment

Five virtual machines separate the endpoint, detection, orchestration, case management and test roles. This makes the path from a Windows event to an analyst-facing case easier to follow and troubleshoot.

| Machine | Recorded OS | Role | Address |
|---|---|---|---|
| Windows client | Windows 10 Pro | Endpoint telemetry and test target | 192.168.106.128 |
| Splunk | Ubuntu 24.04 | Search and alerts | 192.168.106.129 |
| n8n | Ubuntu 24.04 | Orchestration and model tools | 192.168.106.130 |
| DFIR-IRIS | Ubuntu 24.04 | Case management | 192.168.106.131 |
| Kali Linux | Rolling release | Authorized scenario traffic | 192.168.106.133 |

![VMware lab overview](screenshots/vmware-lab-overview.png)

![VMware host-only and NAT network configuration](screenshots/vmware-network-config.png)

![Lab network topology](screenshots/lab-network-topology.png)

The private lab segment contains scenario traffic. Model, intelligence and messaging APIs require controlled egress. [Lab setup and communication paths](docs/lab-environment.md).

### Investigation lifecycle

![Investigation lifecycle from alert to case closure](screenshots/incident-response-workflow.png)

The handoff supports a wider investigation: the analyst reviews evidence, chooses response actions and records closure.

### Component architecture

![Component architecture showing telemetry, SIEM, orchestration, model tools, IRIS and Slack](screenshots/architecture-diagram.png)

## Three pipeline configurations

**A — Manual:** review Splunk, look up indicators, assess the alert and document the investigation manually.

**B — AI without tools:** use model analysis without the three enrichment tools. Prepare a separate workflow copy, disconnect the tool connections and adjust the prompt. Inspect traces to confirm no tool calls occurred.

**C — Integrated:** use the supplied [pipeline-c.json](workflows/pipeline-c.json), bind credentials and review the field contract before activation.

The recorded model-only group covers three scenarios; manual and integrated groups cover all five. The [evaluation coverage table](docs/attack-scenarios.md#recorded-evaluation-coverage) gives the actual run counts.

## Attack scenarios

The scenarios exercise different investigation needs: account context, executable reputation, network activity, privilege changes and command-line intent. Together they show where external intelligence can add context and where local event evidence remains central.

| Scenario | Detection telemetry | Input route |
|---|---|---|
| Authentication failures | Windows Security 4625 | IP |
| Process hash review | Sysmon process creation with SHA-256 | Hash |
| Network service discovery | Windows Firewall drops and ports | Scan |
| Account creation / group change | Windows Security 4720 / 4732 | Admin |
| PowerShell command-line review | Sysmon image, command and parent process | PowerShell |

[Scenario details](docs/attack-scenarios.md) · [Recorded SPL queries](splunk/detection-rules.md) · [Validated deployment examples](splunk/validated-inputs.md).

### Splunk saved alerts

![Five saved Splunk alerts](screenshots/splunk-alerts.png)

### Authentication search

![Splunk authentication-failure query and grouped result](screenshots/splunk-brute-force-detection.png)

### Account-change search

![Splunk account creation and membership query](screenshots/splunk-admin-detection.png)

### Endpoint telemetry

![Sysmon process-creation events in Windows Event Viewer](screenshots/sysmon-event-viewer.png)

## What the comparison tells an analyst

Model-only analysis reduced the recorded mean triage time from 209 to 130 seconds, but its mean context score was lower than manual review. The integrated records combine the shortest mean time with the highest context score. This supports examining the entire handoff: the data available to the analyst, the lookups performed and the quality of the resulting case.

Fewer steps also need interpretation. Model-only runs omit intelligence lookups, so a smaller step count can reflect work that was skipped. Speed, context and effort should be read together.

The experiment has unequal scenario coverage, few repetitions, manual timing and single-evaluator quality scores. Treat its averages as a description of those records. [Methodology, scoring and limitations](results/README.md).

## Setup and validation

1. Prepare the lab services and telemetry sources using [lab-environment.md](docs/lab-environment.md).
2. Copy [env.example](env.example) to a private configuration file and bind credentials in n8n.
3. Run the local suite, import the workflow inactive and configure trusted URLs, IDs and the Slack channel.
4. Follow the controlled acceptance sequence and trace one alert across the services.

```bash
node --test tests/offline.test.cjs
```

The offline suite covers parsing, indicators, score boundaries, payloads, workflow connections and embedded-code consistency. Read [prompts-and-code.md](docs/prompts-and-code.md) for the exact current prompt and readable node sources.

For the interactive charts, download the complete repository and open `results/dashboard.html`. The dashboard has no external scripts, keys or network dependencies. [docs/overview.html](docs/overview.html) provides a separate static architecture and deployment overview.

## Alternative deployments

| Layer | Alternatives discussed in the original study | Adaptation needed |
|---|---|---|
| SIEM | Wazuh, Elastic, Security Onion, Sentinel | Field mapping, detection language and alert delivery |
| Model | Ollama with a local model, other hosted providers | Model-node adapter, tool use and schema validation |
| Orchestration | Shuffle, StackStorm, other SOAR platforms | Rebuild workflow, credential binding and API handoff |

These are porting options; the included export targets n8n and the documented services.

## Repository structure

The folders follow the investigation journey: understand the setup in `docs/`, inspect detections in `splunk/`, follow execution in `workflows/`, and review outcomes in `results/`. Screenshots show the recorded interface views; tests cover the deployment code.

```text
SOC-Automation-Pipeline/
├── .gitattributes
├── .gitignore
├── .markdownlint.json
├── README.md
├── LICENSE
├── env.example
├── docs/
│   ├── attack-scenarios.md
│   ├── lab-environment.md
│   ├── prompts-and-code.md
│   ├── walkthrough.md
│   └── overview.html
├── results/
│   ├── README.md
│   ├── evaluation-results.csv
│   ├── dashboard.html
│   └── dashboard.js
├── screenshots/
│   ├── pipeline.svg
│   ├── architecture-diagram.png
│   ├── incident-response-workflow.png
│   ├── pipeline-comparison-radar.png
│   ├── workflow-canvas.png
│   ├── slack-notification.png
│   ├── dfir-iris-case.png
│   ├── dfir-iris-cases-list.png
│   ├── splunk-alerts.png
│   ├── splunk-brute-force-detection.png
│   ├── splunk-admin-detection.png
│   ├── sysmon-event-viewer.png
│   ├── lab-network-topology.png
│   ├── vmware-lab-overview.png
│   └── vmware-network-config.png
├── splunk/
│   ├── detection-rules.md
│   └── validated-inputs.md
├── workflows/
│   ├── pipeline-c.json
│   ├── normalize-alert.js
│   └── format-report.js
└── tests/
    ├── example-alert.json
    └── offline.test.cjs
```

## Technology stack

`Splunk` · `n8n` · `OpenAI` · `AbuseIPDB` · `VirusTotal` · `DFIR-IRIS` · `Slack` · `VMware` · `Windows` · `Sysmon` · `JavaScript` · `HTML/CSS`

## Credits and lab context

Jayanth K describes this as shared lab work completed alongside Christopher Andrews on the same machine. The original [LARA SOC Automation publication](https://github.com/C-Andr3ws/lara-soc-automation/tree/41866043d4581ed85d4e921d26bb5e42625af299), recorded captures and evaluation dataset are credited to Christopher Andrews. Reuse follows the MIT license; the required copyright and permission notices remain in [LICENSE](LICENSE).

The screenshots, diagrams and raw CSV retain the recorded identities, IP addresses, timestamps and technical values. They document the historical setup and can differ from the hardened deployment export. Jayanth K's publication includes revised documentation, input/output validation, offline tests, the icon-based architecture and the local interactive dashboard.

The recorded lab evaluation and this publication update are separate activities. This update checked files, links, data calculations and offline code behavior; it did not repeat a live Splunk/n8n/IRIS integration run. The CSV remains unchanged, and reconciliation notes identify differences from the earlier published aggregates. The illustrative SVG and synthetic test fixture explain the deployment version.

Documentation updated 16 October 2026.
