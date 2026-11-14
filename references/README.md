# Upstream Source Library

Sources are stored at `sources/<owner>/<repository>/`. `manifest.json` records
all repository URLs, exact commits, source paths, license files and download status.
The current library uses both independent shallow Git checkouts and official
GitHub commit-pinned source archives. Archive roots contain a repository-owned
`.reference-source.json` marker; the original archive SHA-256 is in the manifest.

Run from the repository root:

```sh
source ./scripts/env.sh
python scripts/fetch-references.py
pnpm run check:env
```

The seven deeply inspected references retain their studied commit pins. Others
retain the commit resolved on first download. Re-running restores missing sources
at those exact commits; it does not update upstream versions. Ready folders are
left unchanged. Download failures remain explicit. Earlier clone failures and
partial downloads are retained under `.cache` for traceability.

Downloaded sources and archives are ignored by the parent Git repository. The
tracked manifest and restoration script reconstruct them. Git LFS payloads and
submodule dependencies are not downloaded; their source pointers remain. No
upstream dependency install, build hook, plugin activation or account login runs.

Before reusing code or artwork, inspect its original license and third-party
notices. A downloaded source is a design reference, not a selected dependency.

The Bilibili cognitive-architecture whitepaper is an article reference, not a
source repository. Its URL and evidence limits are retained in
`../docs/planning/reference-study.md`.
