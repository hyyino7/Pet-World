# Install and update from GitHub

Her World uses package `her-world` in
<https://github.com/hyyino7/her-world>. The default branch includes the complete
source and compiled runtime. Installing consumers need no TypeScript compiler
or build hooks, custom plugin index, npm account, or GitHub Pages setup.

## Install in DSH

1. Open **Plugins → Add plugin** (or **Install third-party plugin**).
2. Paste this repository address into the package/repository field:

   ```text
   https://github.com/hyyino7/her-world
   ```

3. Confirm installation and select **Enable now** when it completes. Restart
   DSH only if the native installer requests it.

When switching from `dsh-Chatpet`, preserve its binding as described below and
first disable the old bundle. Never enable both packages together.

## Update in DSH

Open **Plugins → Add plugin** again, enter the **same repository address**, and
confirm installation over the existing Her World package. The native package
manager resolves the current default branch and replaces the program files.
Existing profile overrides and bound companion data stay outside that package.

This flow uses the native installer again rather than relying on a registry
version list or a configured index. A GitHub tag such as
`https://github.com/hyyino7/her-world#v0.1.0-rc.2` deliberately stays at that
version. Use the plain address above when you want the current default branch.
No custom index is required. GitHub itself must be reachable; changing an npm mirror
only changes where dependencies are fetched, not the repository download.

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
   with the plain GitHub address above, then install/enable **Her World**. Never enable both packages together: they use
   the same module entry IDs. Keep the disabled old package until you have
   verified the new one; removing data is not part of this transition.
4. Confirm the same workspace, character and Memory paths in Her World settings.
   Saved module enablement overrides qualified with the old package name need
   to be selected again for the new bundle. Stop if DSH reports an identity or
   storage mismatch; do not initialize a blank replacement over existing data.

Subsequent Her World releases replace program files. Your native profile override
and bound `.chatpet` data remain outside the package. Installation and updates
remain owner-run. Preparing a binding does not install or enable a package.

## Publish a version

Open GitHub **Actions → Publish Her World → Run workflow**, choose `main`, and
enter a new exact version such as `0.1.0-rc.3`. No local installation is needed.
The workflow:

1. Sets the requested package version and uses the repository-local toolchain.
2. Checks types, builds and runs code tests without a DSH process or model calls.
3. Commits source and compiled runtime to `releases/vVERSION`, tags that exact
   commit as `vVERSION`, and checks the runtime archive in isolation.
4. After archive verification, fast-forwards the default `main` branch to the
   built release commit so the same plain GitHub address receives that version.
   No custom index is generated or published. A concurrent newer source commit
   prevents the fast-forward rather than being overwritten.
5. Publishes a GitHub Release with `.tgz` and `SHA256SUMS`.

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
