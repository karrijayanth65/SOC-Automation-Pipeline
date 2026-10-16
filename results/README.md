# Evaluation Results

[Home](../README.md) · [Raw CSV](evaluation-results.csv) · [Interactive dashboard](dashboard.html) · [Scenarios](../docs/attack-scenarios.md)

This directory preserves the 15 recorded lab runs and provides a reproducible view of their timings, quality scores and analyst steps. Download the repository and open `results/dashboard.html` in a browser for the interactive tables and charts.

## Method

The evaluation compares manual triage (A), model analysis without intelligence tools (B), and integrated orchestration with intelligence tools (C). It covers five scenarios; B has only authentication, file-hash and scanning records.

The recorded `triage_time_s` value represents the reported end-to-end timing. The start/end columns are also retained, but do not consistently reconstruct that duration. No timestamp or measured duration has been rewritten.

Action and context quality use a five-point rubric:

| Score | Action quality | Context quality |
|---|---|---|
| 1 | Irrelevant or incorrect | Missing or incorrect context |
| 2 | Partially useful | Major contextual gaps |
| 3 | Correct but generic | Basic interpretation |
| 4 | Useful and specific | Good contextual explanation |
| 5 | Specific and well-supported | Rich explanation with relevant validation |

One evaluator assigned the recorded qualitative scores. Analyst steps count discrete actions in the triage workflow.

## Overall results

These values are computed from the unchanged CSV, using each mode's available rows.

| Mode | Runs | Mean triage time | Action / 5 | Context / 5 | Analyst steps |
|---|---|---|---|---|---|
| A: Manual | 5 | 209.0 s | 3.00 | 3.60 | 6.6 |
| B: AI without tools | 3 | 130.0 s | 4.00 | 3.00 | 3.0 |
| C: AI with enrichment | 7 | 38.1 s | 4.57 | 4.29 | 3.9 |

Relative to the manual average, the recorded model-only time is 37.8% lower and the integrated time is 81.8% lower. These are descriptive comparisons across differently sized groups, not causal or production estimates.

![Recorded evaluation radar comparing the three configurations](../screenshots/pipeline-comparison-radar.png)

[Open full-size radar](../screenshots/pipeline-comparison-radar.png). This preserved graph uses the original evaluation's scales and includes its reported accuracy dimension; the CSV does not contain a per-run accuracy field. The interactive dashboard uses directly computable CSV metrics.

## Results by scenario

| Scenario | Integrated | Model only | Manual |
|---|---|---|---|
| Brute Force | 43.0 s | 160.0 s | 210.0 s |
| File Hash | 40.5 s | 120.0 s | 220.0 s |
| Network Scanning | 35.2 s | 110.0 s | 260.0 s |
| PowerShell | 34.0 s | — | 185.0 s |
| Admin Privilege Escalation | 30.6 s | — | 170.0 s |

## Reconciliation notes

- The integrated group contains 27 analyst steps across seven runs: `27 / 7 = 3.857…`, displayed as 3.9. The earlier published prose reports 3.6; the raw rows are preserved and the dashboard computes 3.9.
- Runs 1, 3, 6 and 7 have durations that differ from end minus start. The dashboard displays both values and flags those rows rather than substituting a guessed time.
- The historical statement of 100% classification accuracy is reported in the original write-up, but has no accuracy column in the CSV. It is not recomputed here.
- Counts and quality scores describe a small controlled dataset with unequal scenario coverage, single-evaluator scoring and manually recorded times.

## Reading the comparison

Enrichment can supply indicator context that a model cannot obtain from an alert alone. Fewer analyst steps in mode B also reflect omitted lookups, so step count alone is not a complete measure of investigation quality.

Retain the full raw records when interpreting a graph. For a new experiment, record execution IDs, event times, tool traces and downstream case/notification IDs using the [acceptance sequence](../docs/lab-environment.md#4-controlled-acceptance-test).
