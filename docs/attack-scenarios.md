# Attack Scenarios

[Home](../README.md) · [Detection rules](../splunk/detection-rules.md) · [Results](../results/README.md)

These five scenarios test different kinds of analyst reasoning: identify the account behind failed logons, understand an executable, interpret network activity, review privilege changes and explain a command line. Each section connects the event evidence to the context an analyst needs next.

The recorded environment uses a Windows endpoint and a Kali test machine on a private VMware network. The coverage table at the end shows exactly which configurations were recorded for each scenario.

## 1. Authentication failures

Repeated failed logons appear as Windows Security event 4625. The saved search groups events by machine, account and source IP and uses a threshold of at least three failures. Review the destination, user and surrounding successful logons before deciding whether a failure cluster indicates compromise.

The evaluation contains two integrated runs, one model-only run and one manual run for this scenario. Public indicator values substituted for enrichment testing are test inputs; they do not show that those remote systems generated the lab traffic.

## 2. Process hash review

Sysmon process-creation event 1 carries the image, command line and SHA-256. The recorded evaluation covers a legitimate `splunk-admon.exe` hash and a DarkComet hash; the row notes record the historical reputation result. Reputation counts can change over time.

The integrated mode uses the file-hash lookup tool; model-only and manual comparisons are also present. A hash report alone does not establish what a process did on the endpoint.

## 3. Network service discovery

Windows Firewall DROP records show activity directed at service ports such as 135, 139 and 445. The saved search considers the number of distinct ports and repeated drops.

This behavior corresponds to network service discovery, T1046. A public IP was substituted in an enrichment payload because the actual test machines use private addresses. Preserve the real source event separately from an enrichment-test payload.

## 4. Account creation and group membership

Security events 4720 and 4732 describe account creation and addition to a local security group. The screenshot and saved SPL use those events; this document follows them rather than treating event 4672 as proof of group membership.

Keep the target account distinct from the initiating account. The source metadata includes T1136 and T1078; a mapping or a newly created account is a triage lead, not proof of exploitation. This scenario has manual and integrated records.

## 5. PowerShell command-line review

Sysmon process events expose PowerShell image paths, command lines and parent processes. The saved search checks encoded commands, Invoke-Expression, download-related strings, hidden windows, execution-policy switches and Base64 decoding.

Evaluate those flags against administrative intent, parent process and user context. The records contain manual and integrated runs. No additional attack execution is required to inspect the provided records.

## Recorded evaluation coverage

| Scenario | A: manual | B: model only | C: integrated |
|---|---|---|---|
| Authentication failures | 1 run | 1 run | 2 runs |
| File hash | 1 run | 1 run | 2 runs |
| Network scanning | 1 run | 1 run | 1 run |
| Account changes | 1 run | — | 1 run |
| PowerShell | 1 run | — | 1 run |
| Total | 5 | 3 | 7 |

The comparisons have different scenario coverage and repetition counts. Use the [per-scenario results](../results/README.md#results-by-scenario) alongside the overall averages.
