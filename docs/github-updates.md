# Install and update

Her World uses npm package `her-world` and source repository
<https://github.com/hyyino7/her-world>. npm and GitHub receive the same checked
runtime archive. No compiler, install hooks or custom plugin index is required.

## Install in DSH

Open **Plugins → Add plugin**, enter `her-world@next` while releases are
prereleases, confirm installation and enable Her World. Use `her-world` after
a stable `latest` release exists. Restart only when DSH requests it.

## Update in DSH

Open **Plugins → Installed → Her World**, check versions and click **Update**
for the desired newer version. Prereleases remain marked as such; explicitly
select them when no stable update is offered. DSH owns replacement, activation,
progress and rollback. No repeated Add-plugin operation is needed after the
source switch below.

## One-time switch from GitHub to npm

DSH shows the standard installed-plugin version/update control for dependencies
saved as npm package versions. A plain `github:hyyino7/her-world` dependency is
not eligible. Changing repository metadata alone cannot enable that control.

The existing program can remain installed while its profile dependency and
lockfile record are switched to the **same installed version** from npm. First
publish that exact version to npm, verify its archive matches the corresponding
GitHub Release, and back up the profile manifest and lockfile. Change only the
`her-world` dependency record and its matching lock entries; keep module files,
bundle enablement, private Core overrides and companion data intact. Reload the
Plugins page after preparation. The owner then performs the real update in DSH.
Do not rewrite an unrelated dependency or configure a replacement assistant.

For a new device, install from npm directly. GitHub URLs and version tags remain
usable for explicit source installs, but do not provide the npm version button.

## One-time transition from dsh-Chatpet

The old installer put device-specific Core configuration in the installed bundle
itself. Replacing that bundle would lose those values. DSH's native profile
patch is the existing supported owner for overrides; this transition uses it
without changing the companion data directory or introducing a new config store.

If the existing binding has already been prepared on your device, skip steps
1–2. Do not export or append it a second time.

1. Before replacing the old package, prepare a private override from the actual
   old installation (requires the development dependencies):

   ```sh
   source ./scripts/env.sh
   node scripts/prepare-store-switch.mjs \
     --profile-dir "$HOME/.dsh/profiles/desktop" \
     --output .cache/her-world-store-switch/core-override.yml
   ```

   This exports only existing Core binding/identity/Memory configuration. It
   neither installs nor edits DSH. The output is private; do not upload it.
   It refuses to overwrite an existing export.
2. Quit DSH. Append that YAML sequence entry to the existing native
   `~/.dsh/profiles/desktop/cordis.patch.yml`. Preserve all existing entries.
   The new override targets `her-world/00-Core`; do not change its IDs or paths.
   No data directory is moved, reinitialized or deleted.
3. Reopen DSH and disable the old **dsh-Chatpet** bundle. Use **Add plugin**
   with `her-world@next`, then install/enable **Her World**. Never enable both packages together: they use
   the same module entry IDs. Keep the disabled old package until you have
   verified the new one; removing data is not part of this transition.
4. Confirm the same workspace, character and Memory paths in Her World settings.
   Saved module enablement overrides qualified with the old package name need
   to be selected again for the new bundle. Stop if DSH reports an identity or
   storage mismatch; do not initialize a blank replacement over existing data.

Subsequent Her World releases replace program files. Your native profile override
and bound `.chatpet` data remain outside the package. Installation and updates
remain owner-run. Preparing a binding does not install or enable a package.

## First npm publication and trust

An npm maintainer performs the first publication from a checked release archive,
then binds the package to the GitHub workflow once:

```sh
npm trust github her-world --repository=hyyino7/her-world --file=release.yml --allow-publish
```

This uses npm's browser/2FA authorization. No npm token belongs in the repository
or workflow secrets. [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
requires the exact repository/workflow binding and `id-token: write` in Actions.

## Publish a version

Open GitHub **Actions → Publish Her World → Run workflow**, choose `main`, and
enter a new exact version such as `0.1.0-rc.5`. No local installation is needed.
The workflow:

1. Sets the requested package version and uses the repository-local toolchain.
2. Checks types, builds and runs code tests without a DSH process or model calls.
3. Commits source and compiled runtime to `releases/vVERSION`, tags that exact
   commit as `vVERSION`, and checks the runtime archive in isolation.
4. Publishes that same archive to npm through GitHub OIDC, using `next` for
   prereleases and `latest` for stable versions. An existing npm version must
   match the archive integrity exactly; a conflicting version stops publication.
   The workflow waits for npm processing before accepting the public archive.
5. After npm verification, fast-forwards the default `main` branch to the
   built release commit so the same plain GitHub address receives that version.
   No custom index is generated or published. A concurrent newer source commit
   prevents the fast-forward rather than being overwritten.
6. Publishes a GitHub Release with `.tgz` and `SHA256SUMS`.

Version tags are immutable. An existing version must not be reused. A failed
release step can be retried with **Re-run failed jobs**; existing tags are
not moved. A source push alone runs CI and does not create a version tag/Release. Since
plain GitHub installs read `main`, keep its committed runtime current with source
changes and use the release workflow to publish a checked version.
Tag pushes are also supported for a prepared source/runtime commit whose
package version matches the tag. Tags pushed by this workflow's GitHub token
do not recursively start another release.

`docs/release/status.json` currently blocks stable releases because the known
caretaker replay P2 is unresolved. Update the evidence and status before a
stable publication. Prerelease publication is not owner acceptance.

## Develop from a fresh clone

On Apple Silicon macOS, bootstrap the pinned local runtimes with
`python3 scripts/setup-runtime.py` (requires `uv`), then:

```sh
source ./scripts/env.sh
pnpm install --frozen-lockfile --ignore-scripts
uv pip install --python .venv/bin/python -r vendor/mnemosyne/requirements-test.lock
pnpm run check:env
pnpm run check:types
pnpm test
pnpm run check:release
```

`check:env` verifies the local development runtime and SDK imports. Bundled
vendor code, license notices and `references/manifest.json` retain provenance;
external reference checkouts are not required. The default tests include
isolated Memory-provider cases and use the pinned Python requirements above.
Native/window checks under `scripts/checks/` require explicit isolated fixtures
and do not establish installed owner acceptance.

GitHub CI uses the pinned Node/pnpm/uv/Python versions, creates local tools and
virtual environments, and does not replace a developer's global runtime.
