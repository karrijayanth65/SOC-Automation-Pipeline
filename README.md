# SOC Automation Pipeline

A lab workflow connecting `Splunk → n8n → model tools → DFIR-IRIS → Slack`.

This repository contains a revised workflow export, readable JavaScript, offline regression tests and an inherited historical evaluation. **No current end-to-end execution packet has been supplied for this revision.** Installed service versions and live integration behavior remain unverified.

[Credits and lab context](#credits-and-lab-context) · [Current workflow](docs/current-workflow.md) · [Setup](docs/lab-environment.md) · [Detections](splunk/validated-inputs.md) · [Historical results](results/README.md) · [Asset manifest](screenshots/manifest.csv)

## Current implementation and limits

| Area | What the repository implements | What remains unverified or incomplete |
|---|---|---|
| Intake | Five authenticated webhook routes and shared normalization | Actual Splunk sender configuration and authenticated delivery |
| Model analysis | Structured report validation and source-bound indicator tools | Live response envelopes, model/provider versions and tool traces |
| Enrichment | AbuseIPDB and VirusTotal tools attached to the model node | Tool invocation is model-selected; deterministic enrichment and coverage are incomplete |
| Case handoff | IRIS alert creation, followed by case escalation | Deployment-specific API fields/IDs, native entities and durable delivery |
| Notification | High/Critical Slack branch after case escalation | Current delivered message and approved escalation policy |
| Validation | Offline tests for code, contracts and workflow structure | Live acceptance, failure recovery and restart evidence |

The graph currently escalates **every successfully created IRIS alert before checking severity**. The severity branch controls Slack delivery only. This is existing behavior, and the case policy still requires an explicit decision before activation. No node performs containment, investigation completion or case closure.

The current graph is documented in [current-workflow.md](docs/current-workflow.md). Older diagrams and interface captures are retained as historical or unverified-origin assets; they do not prove the current export ran successfully.

## Setup and offline checks

The intended deployment is a **single host**. The inherited multi-VM layout is background material, not a verified description of the current host. Exact Node.js, n8n, Splunk, DFIR-IRIS and model/provider versions must be recorded during acceptance.

1. Review [lab-environment.md](docs/lab-environment.md) and the [detection field contract](splunk/validated-inputs.md).
2. Bind credentials in n8n, verify trusted URLs and IRIS IDs, and import [pipeline-c.json](workflows/pipeline-c.json) inactive.
3. Run the regression suite:

```bash
node scripts/check.cjs
```

4. Resolve the case policy and retain a controlled execution packet before activation.

The check command needs Node.js 24 and no npm install or external dependencies. It runs the full suite, catalog/hash checks, generated-code/data checks and local link checks. See [remediation status](RESUBMISSION.md), [engineering plan](Engineering_Action_Plan.md) and [rollback instructions](ROLLBACK.md).

Offline tests and CI exercise fixtures and static workflow contracts. They do not contact Splunk, the model provider, threat intelligence APIs, IRIS or Slack, and cannot establish live delivery or response effectiveness. Consult the test output and CI run for the actual result and runtime; this README does not advertise a fixed test count.

## Quick remediation scope

Normalizer and formatter hardening is covered by offline regression checks. The formatter checks completed typed provider messages, rejects refusals and unresolved tool cycles, keeps model reputation text separate from source observations, and validates ATT&CK IDs/tactics against a pinned catalog. These code changes do not resolve deterministic enrichment, delivery recovery, deployment-specific IRIS entities or case-policy ordering.

## Historical evaluation

The preserved [15-row CSV](results/evaluation-results.csv) has 5 manual, 3 model-only and 7 integrated records. Its recorded mean times are 209.0, 130.0 and 38.1 seconds respectively. **81.8%** is a descriptive difference between the inherited integrated and manual means, with unequal coverage; it is not a measured improvement for this revision.

Runs 1, 3, 6 and 7 have timing discrepancies between `triage_time_s` and their start/end fields. The CSV has no per-run accuracy field. Original accuracy-bearing radar images remain linked only as [historical, unvalidated material](results/README.md#historical-visuals). No current accuracy claim is made.

[Method, calculations and limitations](results/README.md) · [Historical-data dashboard](results/dashboard.html)

## Evidence and assets

[screenshots/manifest.csv](screenshots/manifest.csv) records all retained assets, local SHA-256 hashes and known provenance gaps. Original images are preserved. Unknown capture dates, execution IDs and previous redactions remain explicitly unknown.

The [historical walkthrough](docs/walkthrough.md) explains known differences between captures and code. A current evidence packet must link the source record and SID to the n8n execution, normalized alert, provider/tool results, IRIS IDs and Slack delivery outcome. Publish a separate sanitized copy when redaction is needed and record the exact redacted fields; retain the original privately. Never edit an image to imply a different execution or result.

## Credits and lab context

This project builds on Christopher Andrews's [LARA SOC Automation](https://github.com/C-Andr3ws/lara-soc-automation), source commit [`41866043d4581ed85d4e921d26bb5e42625af299`](https://github.com/C-Andr3ws/lara-soc-automation/tree/41866043d4581ed85d4e921d26bb5e42625af299). Preserve the existing [license and copyright notices](LICENSE).

The supplied *GitHub Project Remediation and Resubmission Guide*, auditing `0f46773d53f53a3de78b937b56fb317c3977b317`, reports that the evaluation CSV and 14 screenshot/diagram files match that upstream snapshot byte for byte. That count is the guide's finding; this remediation has not independently mapped all 14 asset matches. The manifest distinguishes reported inheritance from unknown per-asset origin.

| Material or contribution | Evidence-backed attribution and limits |
|---|---|
| Evaluation CSV and historical study results | Upstream inheritance reported by the supplied guide; current executions are not established |
| Historical workflow, Slack and IRIS captures | Identified by the guide as inherited/historical; preserve original identities |
| Other retained diagrams and images | Per-file authorship is unknown unless separately evidenced; see manifest |
| Workflow/code lineage | This repository derives from the named upstream project; individual authorship must be established from commits, not assumed |
| Current normalization, formatter, tests, documentation and dashboard | Present in this repository; their presence alone does not establish a person's authorship or live lab participation |
| This remediation | AI-assisted code and documentation edits, reviewable in the remediation commit; offline validation is separate from live execution |
| Claimed shared lab participation | Unverified: exact personal tasks, dates and execution artifacts have not been supplied |

Reuse is documented. The available evidence does not establish fabrication, theft or sole authorship. Historical lab results cannot validate the revised export.

## Repository map

| Path | Purpose |
|---|---|
| `workflows/` | Inactive n8n export and readable JavaScript |
| `tests/` | Offline fixtures and regression checks |
| `splunk/` | Detection queries and input contract |
| `docs/` | Current flow, setup and historical walkthrough |
| `results/` | Preserved historical CSV and descriptive dashboard |
| `screenshots/` | Preserved originals and provenance manifest |

Documentation updated 16 October 2026.
