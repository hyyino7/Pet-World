# Install and update

Her World is published as npm package `her-world`. Source, version tags and the
same checked runtime archives remain at <https://github.com/hyyino7/her-world>.
No custom plugin index, compiler or install hooks are required.

## DSH installation and updates

- New installation: **Plugins → Add plugin**, enter `her-world@next`, install
  and enable. `next` currently selects the prerelease channel.
- Existing npm installation: open **Her World → Versions**, check versions,
  expand the list, enable **Show prereleases**, then click **Update** for the
  desired version. Stable releases appear without the prerelease filter.
- Existing GitHub installation: switch once through DSH's native manager.
  Disable and remove the GitHub-installed Her World program package, then add
  `her-world@next`. Preserve the bound workspace and private Core overrides;
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
enter a new exact version, for example `0.1.0-rc.6`. The workflow builds and tests,
freezes an installable commit/tag, checks its archive, publishes it to npm, then
promotes the checked commit to `main` and creates the GitHub Release.

npm uses GitHub trusted publishing bound to `hyyino7/her-world` and `release.yml`.
No npm token is stored in the repository or Actions secrets. Prereleases use
`next`; stable releases use `latest`. An existing version must match the checked
archive's integrity; tags and package versions must never be overwritten.
The workflow waits for npm's asynchronous processing. Once processing finishes,
**Re-run failed jobs** can finish a publication stopped by a processing timeout.

`docs/release/status.json` keeps stable publication blocked by the known
caretaker pause/resume replay P2. CI and isolated package checks do not establish
installed visual behavior or owner acceptance.

See [Development](development.md) for the pinned local toolchain and checks.
