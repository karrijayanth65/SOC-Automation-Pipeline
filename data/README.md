# ATT&CK validation data

`enterprise-attack.json` is a derived semantic subset of the official MITRE ATT&CK STIX bundle, pinned to commit `c2494b29dd268c46a5d0ea0990553e4327cd2253`. It retains all attack-pattern objects, including revoked and deprecated records, but only fields used for technique identity, name and tactic validation. It is not the complete upstream bundle.

The upstream URL, full upstream SHA-256 and vendored subset SHA-256 are recorded in [attack-provenance.json](attack-provenance.json). Redistribution terms are retained in [ATTACK-LICENSE.txt](ATTACK-LICENSE.txt). The pinned commit identifies this snapshot; no unverified release number is asserted.

Run `node scripts/generate-attack-catalog.cjs` from the repository root to regenerate the active technique catalog. Add `--check` to verify hashes and generated data without writing. Then regenerate the workflow with `node scripts/generate-workflow.cjs`.

The formatter rejects unknown, revoked, deprecated or tactic-inconsistent mappings and replaces supplied names with canonical names. Valid dataset membership does not establish that an event demonstrates the technique. Mappings remain analyst-reviewed suggestions.
