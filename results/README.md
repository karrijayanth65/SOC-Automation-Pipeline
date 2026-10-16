# Lab Evaluation & Outcomes

[Home](../README.md) · [Raw CSV](evaluation-results.csv) · [Interactive dashboard](dashboard.html) · [Scenarios](../docs/attack-scenarios.md)

**The integrated pipeline reduced recorded mean triage time by 81.8% and mean analyst steps by 41.6% compared with manual triage in this lab evaluation.** Jayanth K completed the experiment in a personal SOC lab; the 15 recorded runs cover manual triage, model-only analysis and integrated analysis with intelligence tools.

![Lab outcomes: recorded mean triage time and analyst steps for manual, model-only and integrated triage](../screenshots/lab-outcomes.png)

The pipeline brings alert normalization, indicator enrichment, structured analysis and case handoff into one workflow. This reduces separate analyst lookups and copying between tools. The measured effort comparison counts analyst actions; it does not assign a duration to each action.

## Overall results

| Mode | Runs | Mean triage time | Action quality / 5 | Context quality / 5 | Mean analyst steps |
|---|---|---|---|---|---|
| A: Manual | 5 | 209.0 s | 3.00 | 3.60 | 6.6 |
| B: AI without tools | 3 | 130.0 s | 4.00 | 3.00 | 3.0 |
| C: AI with enrichment | 7 | 38.1 s | 4.57 | 4.29 | 3.9 |

- **Time saved:** integrated triage averaged 170.9 seconds less per recorded run than manual triage, an 81.8% reduction. Model-only analysis averaged 37.8% less time than manual triage.
- **Manual effort reduced:** integrated triage averaged `27 / 7 = 3.857…` analyst steps versus 6.6 for manual triage, a 41.6% reduction calculated before rounding.
- **Context improved:** integrated triage received a mean context score of 4.29/5, compared with 3.60/5 for manual triage and 3.00/5 for model-only analysis.

These are descriptive results from a small controlled lab dataset with unequal group sizes and scenario coverage. The recorded measurements are preserved in the CSV and used consistently by the tables and dashboard.

## Results by scenario

| Scenario | Integrated | Model only | Manual |
|---|---|---|---|
| Brute Force | 43.0 s | 160.0 s | 210.0 s |
| File Hash | 40.5 s | 120.0 s | 220.0 s |
| Network Scanning | 35.2 s | 110.0 s | 260.0 s |
| PowerShell | 34.0 s | — | 185.0 s |
| Admin Privilege Escalation | 30.6 s | — | 170.0 s |

Enrichment supplies indicator context alongside the alert. Mode B's lower analyst-step count also reflects omitted intelligence lookups, so step count should be read alongside context quality and scenario coverage.

## Experiment visuals

All three original comparison graphics are displayed below and retained unchanged. Their reported accuracy axis has no corresponding per-run labels or predictions in the CSV; the outcome graph above, numerical tables and [dashboard](dashboard.html) use the directly computable time, effort and quality fields.

### Triage comparison — light

![Original triage comparison graphic, light version](../screenshots/triage-comparison.png)

### Triage comparison — dark

![Original triage comparison graphic, dark version](../screenshots/triage-comparison-dark.png)

### Pipeline comparison radar

![Original pipeline comparison radar](../screenshots/pipeline-comparison-radar.png)

Speed and step-economy indices represent different quantities; polygon area does not measure investigation quality. See the [image manifest](../screenshots/manifest.csv) for capture details and original-image checksums.

## Method

The evaluation compares manual triage (A), model analysis without intelligence tools (B), and integrated orchestration with intelligence tools (C). It covers five scenarios; B includes authentication, file-hash and scanning records. Analyst steps count discrete actions in the triage workflow. The [lab execution sequence](../docs/lab-environment.md#4-controlled-acceptance-test) describes the source-to-handoff process.

Action and context quality use a five-point rubric, assigned by one evaluator:

| Score | Action quality | Context quality |
|---|---|---|
| 1 | Irrelevant or incorrect | Missing or incorrect context |
| 2 | Partially useful | Major contextual gaps |
| 3 | Correct but generic | Basic interpretation |
| 4 | Useful and specific | Good contextual explanation |
| 5 | Specific and well-supported | Rich explanation with relevant validation |

Lab executions and documentation are complete. Screenshot capture and documentation review date: **16 October 2026**, confirmed by Jayanth K. The published measurements are retained without alteration.

### Measurement notes

- Integrated analyst effort is 27 steps across seven runs, displayed as 3.9 steps per run. The earlier 3.6-step prose figure is superseded by the calculation from the preserved rows.
- The CSV records reported end-to-end timing in `triage_time_s`. Four rows differ from their recorded end-minus-start times, as listed below; all comparisons use `triage_time_s` consistently.
- The original graphics' reported classification accuracy is not independently calculable from this CSV. This evaluation makes no new accuracy claim.

| Run | Recorded triage seconds | End minus start seconds | Difference |
|---|---|---|---|
| 1 | 39 | 15 | +24 |
| 3 | 41 | 15 | +26 |
| 6 | 35.2 | 10 | +25.2 |
| 7 | 30.6 | 7 | +23.6 |

Both duration and timestamp fields remain available in the raw records and dashboard. No guessed timing values have been substituted.
