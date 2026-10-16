# Engineering Action Plan: Technical Fixes & Code Refactoring Blueprint

Baseline: `0f46773d53f53a3de78b937b56fb317c3977b317`. Implemented fixes are in this local remediation branch. Open items below are requirements, not claims of completed behavior. See [RESUBMISSION](RESUBMISSION.md) and [rollback](ROLLBACK.md).

## 1. Integrity & Asset Correction Matrix

| Asset or section imbalance | Exact rectification | Status |
|---|---|---|
| README removed upstream credits | Restore `Credits and lab context` heading and link it near the introduction; retain MIT notices and exact upstream commit; qualify shared lab participation | Implemented |
| Workflow capture differs from export | Preserve historical PNG; label historical; document actual current graph in docs/current-workflow.md | Implemented labeling; actual new canvas/execution capture still required |
| Slack image advertises formatting/links absent from formatter | Preserve and label historical; capture actual delivered output after integration, without editing results | Labeling implemented; new capture open |
| IRIS captures contain historical identities/cases | Preserve original identities; obtain a separate current sanitized case with execution and case IDs | Labeling implemented; current evidence open |
| Diagrams imply automated response/closure | Separate orchestration from manual analyst investigation, containment and closure in current graph | Current diagram supplied; old images preserved as historical/conceptual |
| Primary accuracy radar lacks labels/predictions | Remove primary radar embeds; link preserved historical graphics with limitation | Implemented |
| Historical evaluation durations disagree | Keep original CSV unchanged; identify runs 1, 3, 6, 7; label 81.8% descriptive only | Implemented |
| Dashboard embeds duplicate records | Regenerate from CSV and compare generated data in CI | Implemented |
| Asset provenance is incomplete | Maintain screenshots/manifest.csv with origin, source commit, capture date, status, execution ID, redactions and SHA-256; use unknown when unsupported | Implemented inventory; unknown evidence remains unknown |

Mandatory new current evidence, after services are available: `evidence/current/<run-id>/source-alert.json`, `normalized-alert.json`, `model-response.json`, `validated-report.json`, `provider-traces.json`, `delivery-results.json`, `run-metadata.json` and `redactions.md`. Metadata must include export commit, exact tested service versions, UTC start/end times, event identity, execution ID and downstream IDs. Store actual failures as failures. Do not populate these paths with simulated records labeled as execution proof.

## 2. Deep-Dive Grilled Refactoring Specifications

### Alert normalization — implemented

**Flaw:** the allowlist loses User, ParentCommandLine, actions and hits. An alert that reaches IRIS with context removed has passed validation without preserving the detection evidence.

**Before** — baseline `workflows/normalize-alert.js`:

```javascript
const value = body.result[key];
// The baseline fields array omitted User, ParentCommandLine, actions and hits.
```

**After** — implemented contracts in the same file:

```javascript
normalizeAliases(result, ['host', 'ComputerName', 'Computer'], true);
normalizeAliases(result, ['user', 'User'], false);
for (const key of ['hits', 'EventCode', 'EventID']) {
  if (result[key] !== undefined) result[key] = integerField(result[key], key);
}
```

The allowlist now retains the missing fields and TargetSid/MemberSid. Identity aliases must be nonempty scalar strings that match after trimming; conflicting host/account identities are rejected. Numeric fields accept safe nonnegative integers or canonical decimal strings emitted by Splunk; booleans, exponent strings, fractions and unsafe integers are rejected. Actions accept one string or 1–20 nonempty strings, each at most 300 trimmed characters. ParentCommandLine must be text and retains the existing field-size limit. Existing timestamp, envelope, hash and public-IP checks remain. See the full source and `tests/normalization.test.cjs` for executable contracts.

**Still required:** sender-side splitting of multivalue accounts, stable per-event identity, host-safe grouping and a reviewed required-field contract for every detection. Merely adding optional fields does not prove the sender emits them.

### Model response envelope — implemented offline

**Flaw:** assuming the first output item always contains final text fails for reasoning, refusal and incomplete tool cycles.

**Before** — `workflows/format-report.js`:

```javascript
const text = model?.output?.[0]?.content?.[0]?.text;
```

**After**:

```javascript
const text = modelText(model);
const report = JSON.parse(text);
```

`modelText` rejects failed/incomplete response statuses, explicit errors, refusal parts, unresolved tool calls, unsupported content types, empty reports, multiple text reports and reports over 24,000 characters. It accepts one final typed message and the original fixture shape, and permits preceding reasoning metadata. Existing report field/score/action limits remain.

**Still required:** capture actual sanitized n8n envelopes for the deployed model/node version and test them before activation. Fixture compatibility is not live compatibility.

### Indicator reputation — implemented source boundary, provider work open

**Flaw:** matching an indicator value does not prove a model's reputation verdict.

**Before**:

```javascript
original.verdict = requiredText(ioc.verdict, 'IOC verdict', 500);
```

**After**:

```javascript
requiredText(ioc.verdict, 'IOC verdict', 500);
// The source observation remains unchanged; model verdict is discarded.
report.iocs = sourceIocs;
```

The formatter still rejects model-introduced indicators. Output IOC verdicts now state source observation only. Summary prose is explicitly advisory and provider reputation is marked unverified.

**Still required:** create `workflows/enrich-alert.cjs` and credential-bound provider adapters; execute eligible lookups deterministically before the model; validate provider-specific status and schemas; retain indicator, provider, UTC query/completion times, status, HTTP status and response reference. Private/special IPs cause zero calls. Timeout, 404, 429, schema failure and authentication failure remain unknown, never clean. A 15-second AbortSignal must reach the actual HTTP client. Keep detailed errors privately. Do not claim this optional-tool graph already implements these requirements.

### ATT&CK mappings — implemented

**Flaw:** regex membership allows T9999 and permits a valid ID paired with an invented tactic/name.

**Before**:

```javascript
if (!/^T\d{4}(?:\.\d{3})?$/.test(mapping.technique_id)) {
  throw new Error('Invalid technique ID');
}
```

**After**:

```javascript
const mitre = validateMitre(report.mitre_attack ?? []);
report.mitre_attack = mitre;
```

`validateMitre` resolves active techniques against the pinned official derived dataset; rejects unknown, revoked, deprecated, duplicate and tactic-inconsistent mappings; and canonicalizes technique names. The generated export embeds the compact catalog. Source URL/commit, upstream/subset hashes, transformation and license live in `data/`. Dataset validity does not prove event relevance.

### Generated code, canonical data and CI — implemented locally

**Before:** Code-node copies and embedded dashboard records had no automated regeneration gate; no workflow existed under `.github/workflows/`.

**After:** `npm run check` runs regression tests, ATT&CK hash/catalog verification, embedded workflow comparison, CSV/dashboard comparison and local link/fragment checks. Generators support explicit regeneration and `--check`. `.github/workflows/offline.yml` runs on push and pull requests with read-only permissions and verified action commit SHAs. CI requires no service credentials. A remote passing run remains a resubmission requirement after publication.

### Durable delivery — open, do not disguise as a completed quick fix

**Current failure:** every execution can repeat IRIS POSTs; a response timeout can occur after IRIS accepted the request. Blind retry can duplicate alerts or cases.

**Required implementation:** `delivery/store.cjs`, `delivery/worker.cjs`, `delivery/reconcile.cjs` and `tests/delivery.test.cjs`. For the confirmed single-host scope, use durable SQLite on persistent storage with an atomic unique key over tenant, detection and stable event identity. SID alone is insufficient for multiple results. Persist each alert/case/Slack ID immediately. Track each destination independently, including ambiguous request outcomes and next reconciliation time. Use atomic state transitions so competing workers cannot both POST. A crash after remote acceptance but before checkpoint requires lookup/reconciliation before replay; do not automatically delete the claim. If the deployed API cannot reconcile safely, stop for supervised review. Prove concurrent deduplication, restart, partial success and crash-window behavior. Do not promise cross-system exactly-once semantics.

### Case policy, IRIS entities and configuration — open

**Current graph:** formatter → IRIS alert → IRIS escalation → severity branch → Slack. Low/Medium can create cases, and IRIS failure suppresses notification.

**Required implementation after owner selects policy:** decision before escalation; durable review queue for non-escalated reports; independent notification state that does not require case success. Neither automatic High/Critical escalation nor model-only authority was approved in the supplied answers, so this remediation does not silently establish that policy.

Create `config/deployment.example.json` with deployment-reviewed tenant, classification, severity and channel mappings. Validate all required IDs at startup; reject unknown tenant/severity/channel routing rather than using an arbitrary default. Obtain the deployed IRIS API schema before implementing `delivery/iris.cjs`; populate native entities using verified schema fields, retain returned IDs and verify escalation imports. Do not guess IOC/asset payload fields. Bind secrets through n8n credentials or private service configuration; env.example is not automatically loaded by n8n.

## 3. Mandatory Directory & Structural Migration Tree

Implemented additions and changed entry points:

```text
SOC-Automation-Pipeline/
├── .github/workflows/offline.yml
├── package.json
├── Engineering_Action_Plan.md
├── RESUBMISSION.md
├── ROLLBACK.md
├── data/
│   ├── README.md
│   ├── ATTACK-LICENSE.txt
│   ├── attack-provenance.json
│   ├── enterprise-attack.json
│   └── attack-techniques.json
├── scripts/
│   ├── generate-attack-catalog.cjs
│   ├── generate-workflow.cjs
│   ├── generate-dashboard-data.cjs
│   └── check-links.cjs
├── docs/current-workflow.md
├── screenshots/manifest.csv
├── workflows/
│   ├── normalize-alert.js
│   ├── format-report.js
│   └── pipeline-c.json
└── tests/
    ├── offline.test.cjs
    ├── normalization.test.cjs
    ├── formatter-security.test.cjs
    └── build.test.cjs
```

The `delivery/`, `config/` and `evidence/current/` paths specified above are planned integration work. They must not be represented as implemented modules or completed executions until their behavior is tested and traceable.
