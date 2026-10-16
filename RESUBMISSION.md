# Remediation record

Baseline: `0f46773d53f53a3de78b937b56fb317c3977b317`. Local remediation date: 16 October 2026. Deployment scope supplied by the owner: single host. This record distinguishes completed offline work from remaining integration requirements.

| Guide finding | Change or disposition | Evidence and limitation |
|---|---|---|
| Missing attribution and README anchor | Restored credits, upstream source and contribution boundaries | README Credits and lab context; shared lab participation remains unverified |
| Unsupported visual evidence | Historical/unknown assets labeled; primary accuracy radar displays removed; current flow documented | screenshots/manifest.csv and docs/current-workflow.md; no new execution screenshots fabricated |
| No current execution packet | Still open | Requires authorized lab run and sanitized source, model, provider, IRIS and Slack traces |
| Historical evaluation inconsistencies | Historical status and timing limitations made explicit | Original CSV retained; dashboard data checked against canonical CSV; no new accuracy claim |
| Lost detection fields | Fixed optional field preservation, identity ambiguity and type contracts | workflows/normalize-alert.js and tests/normalization.test.cjs; per-detection required fields still need agreement |
| Unsupported enrichment claims | Source IOC verdicts cannot be overwritten by model prose | tests/formatter-security.test.cjs; deterministic provider execution and provenance remain open; summary prose remains advisory |
| Regex-only ATT&CK checking | Added pinned official derived STIX subset, license, hashes and semantic validator | data/README.md; unknown/revoked/deprecated/tactic-inconsistent mappings excluded; event relevance still requires review |
| Fragile model output envelope | Added explicit completed-message parsing and rejection paths | Refusal, incomplete response, tool cycle and empty/multiple text tests; no live n8n envelope validated |
| Embedded code drift | Added deterministic workflow generator and check | scripts/generate-workflow.cjs; catalog embedded so Code node needs no filesystem access |
| Missing CI | Added push/PR workflow with pinned action SHAs and no service credentials | .github/workflows/offline.yml; remote Actions execution not claimed |
| Duplicate handling and restart recovery | Still open | Requires durable transactional state, saved downstream IDs, reconciliation and crash/concurrent delivery tests |
| Case policy and notification dependence | Still open | Existing escalation-before-severity behavior preserved; policy answer absent; export remains inactive |
| Empty native IRIS entity arrays | Still open | Requires deployed API contract, tenant/type IDs and recorded import verification |
| Manual service/sender configuration | Still open | Service versions and authenticated relay remain unverified; env.example is a credential-binding inventory |
| Rollback | Added original ZIP, full Git bundle, local tag and instructions | ROLLBACK.md; original main preserved; no history rewrite |

## Validation and delivery

Run `node scripts/check.cjs` using Node.js 24 (`npm run check` is an equivalent convenience command). Tests run offline and do not call external services. Local validation passed 134 tests on Node.js v24.19.0, followed by ATT&CK hash/catalog, workflow drift, historical dashboard equality and local file/fragment checks. The test transcript is stored under `evidence/offline/validation.txt`; it is fixture validation, not a current lab execution. See [Engineering Action Plan](Engineering_Action_Plan.md) for code changes and remaining implementation contracts. The final delivery note records the resulting commit.

No current clean-machine deployment, provider integration, IRIS integration, Slack delivery or new performance experiment is asserted. The original source document and historical images/data remain intact.
