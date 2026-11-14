# GitHub releases and DSH updates

Her World uses package `her-world` in
<https://github.com/hyyino7/her-world>. Source and published runtime commits keep
their full source, tests, lockfile and provenance. Runtime archives use the
existing `package.json` file whitelist. The `market` branch contains the DSH
index, independently of source changes.

## Update from DSH

Enable DSH's experimental **Custom plugin index** bundle, open **Plugins →
Discover → Add index source**, and enter:

```text
https://raw.githubusercontent.com/hyyino7/her-world/market/index.json
```

Open **Her World → Versions**, select a compatible version, inspect the Git
repository and commit, and confirm installation. To update an installed version,
use that version list again: a card labelled **New version available** may open
the installed bundle instead of directly starting an update. Refresh/reopen
Discover if the old index remains cached. Raw GitHub access is required.

The index is validated by the published DSH `dsh-plugin-market-index` library.
Every version pins a full Git commit containing the compiled runtime; consumer
devices do not need TypeScript, development dependencies or build hooks. No npm
account/token, external index operator or GitHub Pages setup is needed. The
index is our custom source, not a claim of listing in someone else's market.

## One-time transition from dsh-Chatpet

The old installer put device-specific Core configuration in the installed bundle
itself. Replacing that bundle would lose those values. DSH's native profile
patch is the existing supported owner for overrides; this transition uses it
without changing the companion data directory or introducing a new config store.

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
3. Reopen DSH and disable the old **dsh-Chatpet** bundle. Add our index, then
   install/enable **Her World**. Never enable both packages together: they use
   the same module entry IDs. Keep the disabled old package until you have
   verified the new one; removing data is not part of this transition.
4. Confirm the same workspace, character and Memory paths in Her World settings.
   Saved module enablement overrides qualified with the old package name need
   to be selected again for the new bundle. Stop if DSH reports an identity or
   storage mismatch; do not initialize a blank replacement over existing data.

Subsequent Her World releases replace program files. Your native profile override
and bound `.chatpet` data remain outside the package. The maintainer does not
perform this owner-run transition or install an update for you.

## Publish a version

Open GitHub **Actions → Publish Her World → Run workflow**, choose `main`, and
enter a new exact version such as `0.1.0-rc.2`. No local installation is needed.
The workflow:

1. Sets the requested package version and uses the repository-local toolchain.
2. Checks types, builds and runs code tests without a DSH process or model calls.
3. Commits source and compiled runtime to `releases/vVERSION`, tags that exact
   commit as `vVERSION`, and checks the runtime archive in isolation.
4. Publishes a GitHub Release with `.tgz` and `SHA256SUMS`.
5. Validates and publishes the commit-pinned version in `market/index.json`.

Version tags are immutable. An existing version must not be reused. A failed
release/index step can be retried with **Re-run failed jobs**; existing tags are
not moved. A source push alone runs CI and does not publish a version.
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

`check:env` verifies the development runtime and SDK imports. The separate
`check:references` additionally checks the optional, ignored upstream reference
checkouts. Those reference checkouts are not build dependencies; bundled vendor
code, notices and `references/manifest.json` preserve required provenance.
The default tests include isolated Memory-provider cases, so their Python
fixture dependencies are installed from `vendor/mnemosyne/requirements-test.lock`;
native/window checks require an
explicit isolated DSH fixture. They are not installed acceptance tests.

GitHub CI uses macOS with the same pinned Node/pnpm/Python versions. The
composite action links the downloaded Node into `.tools` and creates `.venv`;
it does not replace a developer's global runtime.
