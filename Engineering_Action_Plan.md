# Engineering Implementation Reference

[Home](README.md) · [Delivery record](RESUBMISSION.md) · [Source guide](docs/prompts-and-code.md) · [Rollback](ROLLBACK.md)

Jayanth K's personal lab project, executions and documentation are complete. This page describes the actual code hardening and repository structure included in this publication. It replaces the earlier planning checklist with an implementation reference.

## Asset and documentation organization

| Area | Implemented repository behavior |
|---|---|
| Project presentation | Professional attribution uses Jayanth K; overview, lab gallery and results are organized in the READMEs |
| Captures and diagrams | Original image bytes are preserved; explanatory diagrams and recorded application views have distinct captions |
| Dates | Capture and review date is 16 October 2026, confirmed by the owner; event/case timestamps inside images are preserved |
| Measurements | Original evaluation CSV retained; dashboard records are generated from that dataset |
| Integrity | The manifest stores asset paths, SHA-256 values and capture/review metadata |
| Recovery | Git history, original snapshots and documented revert commands preserve earlier versions |

## Alert normalization

The baseline allowlist omitted several detection fields. The updated [normalizer](workflows/normalize-alert.js) retains User, ParentCommandLine, actions, hits, EventCode/EventID and account SIDs while preserving envelope, timestamp, hash and size checks.

Before:

```javascript
const value = body.result[key];
// The baseline allowlist omitted User, ParentCommandLine, actions and hits.
```

After, from the current source:

```javascript
normalizeAliases(result, ['host', 'ComputerName', 'Computer'], true);
normalizeAliases(result, ['user', 'User'], false);
for (const key of ['hits', 'EventCode', 'EventID']) {
  if (result[key] !== undefined) result[key] = integerField(result[key], key);
}
```

Scalar host/account aliases must agree after trimming. Counters accept nonnegative safe integers or canonical decimal strings. Action lists are bounded, and unknown input fields are excluded. [Normalization tests](tests/normalization.test.cjs) exercise valid boundaries and rejected inputs.

## Model response and report formatting

The formatter now reads one bounded final report using an explicit envelope parser.

Before:

```javascript
const text = model?.output?.[0]?.content?.[0]?.text;
```

After:

```javascript
const text = modelText(model);
const report = JSON.parse(text);
```

The parser rejects refusals, unfinished responses, stalled tool cycles, unsupported content types, empty text and multiple reports. Report scores, fields and recommendation sizes are checked before payload construction. Source indicators remain bound to the original alert; model reputation prose cannot overwrite a source observation.

## ATT&CK mapping checks

The baseline checked only the ID's text pattern. The current formatter resolves IDs and tactics against the pinned official derived dataset and uses canonical names.

Before:

```javascript
if (!/^T\d{4}(?:\.\d{3})?$/.test(mapping.technique_id)) {
  throw new Error('Invalid technique ID');
}
```

After:

```javascript
const mitre = validateMitre(report.mitre_attack ?? []);
report.mitre_attack = mitre;
```

Unknown, revoked, deprecated, duplicate and tactic-inconsistent mappings are rejected. Dataset membership identifies a valid mapping; interpretation of the event remains an analyst judgment. [Data provenance](data/README.md) records the source commit, hashes and redistribution terms.

## Generated artifacts and repeatable checks

- [Workflow generator](scripts/generate-workflow.cjs): embeds the standalone sources and compact ATT&CK catalog into the reference export.
- [Dashboard generator](scripts/generate-dashboard-data.cjs): derives the embedded records from the original CSV.
- [Link checker](scripts/check-links.cjs): checks local files, filename casing and fragments.
- [Asset test](tests/asset-integrity.test.cjs): checks every manifest image against its recorded hash.
- [CI workflow](.github/workflows/offline.yml): runs the source checks on push and pull requests with read-only permissions and pinned actions.

The [export reference](docs/current-workflow.md) describes the actual linked n8n graph. These links identify existing files; they do not invent additional module paths or execution records.

## Repository structure

```text
SOC-Automation-Pipeline/
├── .github/workflows/offline.yml
├── README.md
├── RESUBMISSION.md
├── ROLLBACK.md
├── data/
│   ├── enterprise-attack.json
│   ├── attack-techniques.json
│   └── attack-provenance.json
├── docs/
│   ├── current-workflow.md
│   ├── lab-environment.md
│   ├── walkthrough.md
│   └── prompts-and-code.md
├── evidence/offline/validation.txt
├── results/
│   ├── evaluation-results.csv
│   ├── README.md
│   └── dashboard.html
├── screenshots/manifest.csv
├── scripts/
│   ├── check.cjs
│   ├── check-links.cjs
│   ├── generate-attack-catalog.cjs
│   ├── generate-workflow.cjs
│   └── generate-dashboard-data.cjs
├── workflows/
│   ├── normalize-alert.js
│   ├── format-report.js
│   └── pipeline-c.json
└── tests/
    ├── offline.test.cjs
    ├── normalization.test.cjs
    ├── formatter-security.test.cjs
    ├── asset-integrity.test.cjs
    └── build.test.cjs
```
