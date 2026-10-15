# SOC Automation Pipeline

Turn a Splunk alert into structured triage, an IRIS case and an analyst notification—without treating an AI recommendation as a response action.

**Reboot maintained by Jayanth K** · Updated 15 October 2026 · [MIT license](LICENSE)

![SOC alert-to-case pipeline](images/pipeline.svg)

## Start here

| I want to… | Open |
|---|---|
| Configure the lab and import the workflow | [Setup](SETUP.md) |
| Understand the detections and alert fields | [Detections](DETECTIONS.md) |
| See the workflow and case handoff | [Walkthrough](WALKTHROUGH.md) |
| Inspect the n8n export | [soc-pipeline.json](workflows/soc-pipeline.json) |

## What changed in this reboot

- Connected all five alert entry points to one normalization step.
- Added timestamp, host, SID, hash and field-size checks before model analysis.
- Bound lookup tools to validated indicators from the original alert, rather than model-selected values.
- Replaced silent JSON fallbacks with explicit failures and deterministic severity calculation.
- Removed instance-specific credential references, enabled webhook header authentication and retained TLS certificate validation.
- Kept the handoff small: three supporting guides, one workflow and a dependency-free test suite.

## Run the local checks

With Node.js installed, run from the repository root:

```bash
node --test tests/offline.test.cjs
```

The suite checks normalization, report formatting, severity boundaries, graph connections and embedded n8n code using local fixtures. It makes no network calls and needs no API keys.

## Repository

```text
SOC-Automation-Pipeline/
├── README.md / SETUP.md / DETECTIONS.md / WALKTHROUGH.md
├── LICENSE
├── workflows/       n8n export and readable JavaScript node sources
├── tests/           Offline checks and a synthetic example alert
└── images/          Pipeline diagram and three source screenshots
```

## Credits and verification status

This reboot adapts [LARA SOC Automation by Christopher Andrews](https://github.com/C-Andr3ws/lara-soc-automation/tree/41866043d4581ed85d4e921d26bb5e42625af299) under the MIT license. The n8n workflow is adapted from that project; its copyright notice is retained in [LICENSE](LICENSE). Jayanth K's contributions are the rewritten guides, normalization/report-validation code, local test suite and pipeline illustration.

The walkthrough screenshots are unchanged reference captures from the source project, not evidence that Jayanth K executed those runs. They show the original identities, IPs, dates and older workflow. The diagram and synthetic test alert explain this version; they are not captured investigation evidence. Source dissertation results are not claimed as measurements of this reboot.

Documentation and offline validation are complete. The workflow has not been imported or run in a live n8n/Splunk/IRIS environment during this update; service compatibility, API behavior and model output still need a controlled integration test. Import it inactive, configure credentials and customer/classification IDs, and review data-sharing rules before activation. No autonomous containment is included.
