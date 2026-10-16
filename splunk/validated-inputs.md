# Detection Inputs

[Home](../README.md) · [Setup](../docs/lab-environment.md) · [Walkthrough](../docs/walkthrough.md)

## Alert contract

The webhook body contains `search_name`, a stable Splunk `sid` and one `result` object. Use the source event time as epoch seconds or ISO 8601 with a timezone. The normalizer prefers `Raw_Splunk_time`, then `_time`; it rejects missing or ambiguous timestamps rather than substituting the current time.

Required host identity can arrive as `host`, `ComputerName` or `Computer`. Useful fields include `user`, `target_account`, `initiating_user`, `src_ip`, `dst_ip`, `count`, `drops`, `ports`, `Image`, `CommandLine`, `ParentImage`, `flags`, `sha256`, `attack_type` and `mitre_technique`. Unknown fields are dropped. Keep one alert result per webhook request; handle multi-row saved-search output explicitly in the sending action.

The examples below use an `endpoint` index and normalized Windows/Sysmon fields. Adapt those fields to your installed add-on and actual raw records. Use narrow time windows and aggregate alerts to avoid one model call per raw event.

## Authentication failures → IP

```spl
index=endpoint earliest=-5m EventCode=4625
| eval user=coalesce(TargetUserName,Account_Name,user)
| eval src_ip=coalesce(IpAddress,Source_Network_Address,src_ip)
| stats count latest(_time) as _time by host user src_ip
| where count>=3 AND src_ip!="-"
| eval attack_type="Repeated authentication failures"
| table _time host user src_ip count attack_type
```

Three failures are a training threshold, not proof of brute force. Check lockout policy, client context and false positives before enabling an alert. A later 4624 is not automatic proof of compromise.

## Process hash → Hash

```spl
index=endpoint earliest=-5m source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" (EventCode=1 OR EventID=1)
| rex field=Hashes "SHA256=(?<sha256>[A-Fa-f0-9]{64})"
| where isnotnull(sha256)
| stats latest(_time) as _time values(Image) as Image by host sha256
| eval attack_type="Process hash review"
```

A captured process hash is an enrichment candidate, not a malicious-file verdict. Reduce volume using your own reviewed selection criteria. Reputation reports can be stale or incomplete; preserve the query time and relevant provider results.

## Firewall drops → Scan

```spl
index=endpoint earliest=-5m sourcetype=windows_firewall "DROP"
| rex field=_raw "DROP\s+\w+\s+(?<src_ip>\d{1,3}(?:\.\d{1,3}){3})\s+(?<dst_ip>\d{1,3}(?:\.\d{1,3}){3})\s+\d+\s+(?<dst_port>\d+)"
| where isnotnull(src_ip) AND isnotnull(dst_ip)
| search dst_port IN (135,139,445,3389,5985,5986)
| stats count as drops dc(dst_port) as unique_ports values(dst_port) as ports latest(_time) as _time by host src_ip dst_ip
| where unique_ports>=3 OR drops>=5
| eval attack_type="Network service probing"
```

This parser expects a Windows Firewall text-log layout. Verify `host` identifies the logging endpoint, not the collector. Repeated drops can also reflect misconfiguration or legitimate administration.

## Account changes → Admin

```spl
index=endpoint earliest=-5m (EventCode=4720 OR EventCode=4732)
| where EventCode=4720 OR (EventCode=4732 AND TargetSid="S-1-5-32-544")
| eval target_account=if(EventCode=4732,coalesce(MemberName,MemberSid),coalesce(TargetUserName,Account_Name))
| eval initiating_user=coalesce(SubjectUserName,user)
| eval attack_type=if(EventCode=4720,"Account creation","Local Administrators membership change")
| table _time host target_account initiating_user attack_type
```

The Administrators SID avoids relying on a localized group name, but confirm your field extraction. Account creation alone does not show elevated privileges or malicious intent; compare change authorization and account/group history.

## PowerShell execution → PowerShell

```spl
index=endpoint earliest=-5m source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" (EventCode=1 OR EventID=1)
| eval image_lc=lower(Image), cmd_lc=lower(CommandLine)
| where match(image_lc,"(powershell|pwsh)\.exe$")
| where match(cmd_lc,"-enc(odedcommand)?\b|invoke-expression|frombase64string|-windowstyle\s+hidden")
| eval attack_type="PowerShell command-line review"
| table _time host Image CommandLine ParentImage attack_type
```

Flags are triage signals, not standalone malicious verdicts. Review parent process, signing, command intent, user and change context. Test escaping and regex behavior on your Splunk release before saving these queries as alerts.
