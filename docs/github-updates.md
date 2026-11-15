# Install and update

Her World is published as npm package `her-world`. Source, version tags and the
same checked runtime archives remain at <https://github.com/hyyino7/her-world>.
No custom plugin index, compiler or install hooks are required.

## DSH installation and updates

- New installation: **Plugins → Add plugin**, enter `her-world`, install
  and enable.
- Existing npm installation: open **Her World → Versions**, check versions,
  click **Update** for the desired version. Normal stable updates do not need
  the prerelease filter.
- Existing GitHub installation: switch once through DSH's native manager.
  Disable and remove the GitHub-installed Her World program package, then add
  `her-world`. Preserve the bound workspace and private Core overrides;
  do not delete companion data. Subsequent updates use the version list above.

DSH owns installed-source records, package replacement, activation and rollback.
Restart only when DSH requests it. The owner performs installation and updates.
Do not enable the old `dsh-Chatpet` and Her World bundles together.

pnpm may delay new npm packages for 24 hours. An owner-approved
`minimumReleaseAgeExclude: [her-world]` entry in the native profile's existing
`pnpm-workspace.yaml` permits immediate updates of this package only; keep any
other existing exclusions.

## Publication

In GitHub **Actions → Publish Her World → Run workflow**, select `main` and
enter a new exact version. This is the only publication entry; pushing a tag
alone does not publish. Source PRs run the same verification command, while a
release runs the complete checks itself rather than relying on a prior CI run.

For clean, committed source, dispatch the workflow directly. If the working
tree contains unrelated changes, isolate only the intended patch against the
current remote `main` before committing it. Do not publish the whole dirty tree,
reset it or discard somebody else's work to prepare a release.

The workflow sets version/source metadata, runs `pnpm run verify` (one build,
tests and one checked archive), freezes the commit/tag, and publishes that
archive to npm. Before promoting `main` or creating the GitHub Release, it
waits for npm metadata **and the ordinary installation URL** to return bytes
matching the checked archive's SHA-512. Old cached 404s, rate limits and transient
network failures retry for at most 20 minutes. Integrity/version conflicts fail
immediately. Download readiness no longer needs repeated manual queries.

npm uses GitHub trusted publishing bound to `hyyino7/her-world` and `release.yml`.
No npm token is stored in the repository or Actions secrets. Prereleases use
`next`; stable releases use `latest`. Existing tags and package versions are not
overwritten. **Re-run failed jobs** resumes the same frozen source/version after
a processing or download timeout; choose a new version for different source.
The frozen tag retains recovery history without another release branch per
version. Publication never installs the local plugin or edits companion data.

See [Development](development.md) for local tools, focused checks and the shared
complete verification command.
