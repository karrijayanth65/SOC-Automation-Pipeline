# Image preservation requirement

The repository owner requires every existing repository image to be retained. Do not delete or overwrite original screenshots, diagrams or result graphics while fixing code or documentation.

Correct misleading claims in surrounding text. Label historical captures as historical. If a new diagram, current capture or redacted copy is necessary, add it under a new filename, document its origin and redactions in the manifest, and retain the original. Do not change an image to imply an execution or outcome that did not occur.

`tests/asset-integrity.test.cjs` verifies that all assets recorded in [the manifest](../screenshots/manifest.csv) still exist and match their recorded SHA-256 hashes. Run `node scripts/check.cjs` before committing. Do not change an original checksum to hide an overwrite.
