# Setup

[Home](README.md) · [Detections](DETECTIONS.md) · [Walkthrough](WALKTHROUGH.md)

## Components and boundaries

Use an isolated lab with Windows telemetry feeding Splunk, an n8n instance and DFIR-IRIS. Slack, OpenAI, AbuseIPDB and VirusTotal require separate configured accounts. Record the exact versions you install; the export retains the source's OpenAI node v2, HTTP Request v4.3, Webhook v2.1, Code v2, If v2.2 and Slack v2.3 node definitions. Confirm these are supported by your installed n8n release before import.

Keep attack simulation traffic on the private lab network. The orchestration server needs controlled HTTPS egress for cloud APIs; a NAT network is not proof that no traffic leaves the host. Use TLS and limit inbound access to known senders. Use separate lab accounts and never place credentials in workflow exports or screenshots.

## 1. Import and configure

Import [soc-pipeline.json](workflows/soc-pipeline.json) through n8n's workflow import menu. Leave it inactive while binding credentials and reviewing settings. Export/import behavior is described in the [n8n documentation](https://docs.n8n.io/workflows/export-import/).

| Node | Required configuration |
|---|---|
| IP, Hash, Scan, PowerShell, Admin | Header Auth credential, preferably a dedicated secret per trusted sender |
| Message a model | OpenAI credential; select an available model and review data-sharing policy |
| AbuseIPDB-Enrichment | Header Auth credential: header name `Key`, value your API key |
| VirusTotal-Enrichment / VirusTotal-FileHash-Enrichment | VirusTotal credential accepted by the installed node |
| DFIR-IRIS HTTP Request / DFIR-IRIS HTTP Request1 | Bearer Auth credential; replace `https://iris.example.invalid` with your trusted IRIS URL |
| Send a message | Slack credential and actual channel ID in place of `REPLACE_WITH_CHANNEL_ID` |

The IRIS formatter uses example IDs: customer `1`, classification `36`, status `1`, severities Low `2`, Medium `4`, High `5`, Critical `6`. Verify each against your deployment. Change [format-report.js](workflows/format-report.js) and the embedded Code node together; the offline suite detects drift between them.

TLS certificate validation is enabled. Install a trusted certificate/CA instead of ignoring certificate errors. The IRIS API paths are `/alerts/add` and `/alerts/escalate/{alert_id}`; confirm request fields, permission scope and response shapes (`data.alert_id`, then `data.case_id`) against your deployed IRIS API before use.

## 2. Connect Splunk

Use the [detection field contract](DETECTIONS.md). n8n exposes these five POST paths:

```text
soc-reboot-ip
soc-reboot-hash
soc-reboot-scan
soc-reboot-powershell
soc-reboot-admin
```

Copy the actual test/production URL from each Webhook node; do not assume the reverse proxy or base path. Webhook paths are instance-wide, so check for collisions before activation.

Send the JSON body in [example-alert.json](tests/example-alert.json), replacing fixture values with your approved test alert. n8n wraps an HTTP request's JSON under `body`; do not add another `body` wrapper when sending that file. Preserve `search_name`, a stable `sid`, source host and event timestamp.

The sender must supply the configured authentication header. If your native Splunk alert action cannot set a custom header, use a reviewed custom alert action or restricted relay that can; do not disable webhook authentication to make it connect. Apply sender restrictions and TLS at the gateway. See [n8n Webhook authentication](https://docs.n8n.io/integrations/builtin/credentials/webhook/).

## 3. Review enrichment and model behavior

Only validated public IPv4 values can reach the IP lookup expressions. Private, loopback, link-local, shared, documentation, multicast and selected special-use ranges are excluded; IPv6 requires a separate reviewed policy. The policy is deliberately conservative, not a full IANA registry implementation. Hash lookups require a 64-character SHA-256. Tools cannot accept a replacement indicator proposed by the model.

Allowlisting fields does not redact everything: usernames, hosts, command lines, IPs and hashes can still leave the lab. Review the normalized payload, tool execution data, provider retention and applicable API terms before sending it. VirusTotal requests query existing hash/IP reports; this workflow does not upload files. API errors and missing intelligence are not clean verdicts.

The model is instructed to treat alert text as untrusted input. This reduces neither prompt injection nor hallucination to a solved problem. Strict output validation checks shape and scores, not truth. Analysts must compare its summary with the underlying event and tool results.

## 4. Controlled acceptance test

1. Run `node --test tests/offline.test.cjs` locally.
2. Verify one genuine Windows record is searchable in Splunk with correct host and event time.
3. Send one approved low-volume alert to an n8n test URL and inspect the normalization output.
4. Confirm a private IP causes no external IP lookup; separately inspect a permitted public-IP or hash lookup if authorized.
5. Confirm model output passes validation and that IRIS receives the expected source SID, timestamp, customer, severity and advisory.
6. Verify the created IRIS case ID and High/Critical Slack branch using reviewed test data.
7. Try malformed input, a tool timeout and an IRIS failure. Record actual behavior and ensure errors are visible before activation.

The workflow acknowledges webhook receipt separately from end-to-end processing; a sender's HTTP success does not establish IRIS or Slack delivery. Inspect n8n execution status and downstream IDs.

## Operational checks

Use least-privilege credentials, rate limits, bounded retention and reviewed execution logs. Configure a local error workflow/monitor before activation. Do not blindly retry case creation after a timeout: the source SID is carried into IRIS for traceability, but server-side duplicate suppression is not implemented here. Add a durable deduplication store and verify idempotency before unattended high-volume use.

Model scores are advisory, not calibrated probabilities. Enrichment is requested through model tools and is not guaranteed on every eligible alert; inspect tool traces. No node disables an account, isolates a host or blocks an IP. Those actions remain analyst decisions.
