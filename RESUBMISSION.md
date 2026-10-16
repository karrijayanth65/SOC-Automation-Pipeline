# Project Delivery Record

**Project owner:** Jayanth K

**Lab project and execution status:** Completed

**Screenshot capture and documentation review date:** 16 October 2026

Jayanth K completed the project, laboratory executions and documentation in a personal SOC lab. The capture/review date is confirmed by the project owner. Original event times, case dates and identifiers visible in the screenshots are preserved as recorded.

## Completed project work

| Area | Delivered work | Reference |
|---|---|---|
| Lab setup and execution | Personal lab with endpoint telemetry, SIEM, orchestration, case management and analyst notification | [Lab environment](docs/lab-environment.md) |
| Detection scenarios | Authentication failures, process hashes, scanning, account changes and PowerShell | [Scenario guide](docs/attack-scenarios.md) |
| Execution walkthrough | Recorded workflow, Slack message, IRIS case and investigation queue | [Lab captures](docs/walkthrough.md) |
| Evaluation | Original 15-run dataset, tables and interactive dashboard | [Experiment results](results/README.md) |
| Code hardening | Context preservation, strict report parsing, source-bound indicators and ATT&CK mapping checks | [Code reference](docs/prompts-and-code.md) |
| Reproducibility | Generated workflow code, CSV/dashboard equality, local links and automated checks | [Engineering reference](Engineering_Action_Plan.md) |
| Asset preservation | All 18 original assets retained with SHA-256 checks and capture/review metadata | [Manifest](screenshots/manifest.csv) |
| Recovery | Original snapshot, local history and documented revert procedures | [Rollback guide](ROLLBACK.md) |

## Included code and software checks

The linked code references describe the files present in this repository. The n8n JSON is an inactive, credential-free reference export; its graph and example parameters are described in [current-workflow.md](docs/current-workflow.md).

Run the reproducible source checks using Node.js 24:

```bash
node scripts/check.cjs
```

The local suite passes **135 tests**, followed by ATT&CK hash/catalog checks, generated-workflow comparison, dashboard/CSV equality and local file/fragment checks. The [test transcript](evidence/offline/validation.txt) records software checks; the lab screenshots document the experiment.

## Measurements retained

The original dataset remains unchanged: 5 manual, 3 model-only and 7 integrated runs. Mean recorded times are 209.0, 130.0 and 38.1 seconds respectively. The reported 81.8% difference is calculated from those original records. The results page preserves group sizes, scoring context and timing reconciliation.

The documentation does not introduce replacement performance figures, execution IDs or altered screenshot contents.
