# Rollback and recovery

The unchanged starting commit is `0f46773d53f53a3de78b937b56fb317c3977b317`. The local tag `rollback/pre-remediation-2026-10-16` identifies it. Remediation lives on branch `codex/remediation-2026-10-16`; the local `main` branch remains at the original commit.

## View the original safely

With a clean working tree, run this in the repository:

```bash
git switch --detach rollback/pre-remediation-2026-10-16
```

Return to the updated version:

```bash
git switch codex/remediation-2026-10-16
```

Git will stop if switching would overwrite uncommitted work. Preserve that work before switching. Do not use a hard reset or force push for rollback.

## Undo a published remediation commit

This delivery is tagged `remediation/jayanth-k-2026-10-16`; the preserved original is tagged `rollback/pre-remediation-2026-10-16`. To undo the whole delivery on a clean branch that contains it, use a new revert commit:

```bash
git fetch origin --tags
git revert --no-commit rollback/pre-remediation-2026-10-16..remediation/jayanth-k-2026-10-16
git commit -m "Revert remediation delivery"
```

Review the resulting changes before pushing. If later work conflicts with this reversal, resolve it deliberately; do not force a reset. The image-preservation test is part of the delivered fix and does not modify any image.

The delivered RESUBMISSION record identifies the changes. If you later publish the remediation, use a new revert commit on the target branch:

```bash
git log --oneline -5
git revert REMEDIATION_COMMIT_SHA
```

Replace the placeholder with the actual remediation commit. Review the revert and run checks before publishing it. This preserves history.

## Recover independently of the checkout

The delivery folder beside this checkout contains:

- `SOC-Automation-Pipeline-original.zip`: exact original tracked-file snapshot.
- `SOC-Automation-Pipeline-before.bundle`: original Git history and rollback tag.
- `SOC-Automation-Pipeline-updated.zip`: updated tracked-file snapshot, without Git metadata.

Restore the original history into a new directory:

```bash
git clone SOC-Automation-Pipeline-before.bundle recovered-original
```

A ZIP has no Git history; extract it to a separate directory to compare files safely. These instructions restore repository files only. No live services, credentials, cases or Slack deliveries were changed during this local remediation.
