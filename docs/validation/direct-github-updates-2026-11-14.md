# Direct GitHub install/update — 2026-11-14

The owner requested the normal DSH GitHub repository-address flow and no custom
index. Installation/update remains owner-run; the prepared native device binding
is preserved. The known caretaker replay P2 is outside this task.

## Owning native paths

The existing DSH `plugin-manager/install-spec` parser accepts the plain
`https://github.com/hyyino7/her-world` address as a Git source. Its existing
installer accepts another add/install request for an existing Git dependency.
The installed DSH parser was exercised directly without starting an app/plugin.
The inspected `updateRefusal` path restricts the separate version-check/update
button to registry dependencies, so the documented Git update path is submitting
the same repository address through **Add plugin** again.

## Changes

- README and the current guide use only the plain repository address.
- Release publication no longer generates, validates or pushes a custom index.
  The obsolete template and validator dependency/test are removed. The old
  `market` branch is historical and does not participate in current releases.
- A verified release fast-forwards `main` to its built commit. Concurrent source
  advances cause a normal non-fast-forward failure rather than an overwrite.
- The runtime remains committed and packaged with no consumer install/build
  hooks; source, tests, provenance, native profile overrides and data formats
  remain intact. GitHub tags and Release archives remain available.

## Verification

Before publication, a fresh isolated consumer installed the plain address with
`pnpm add --ignore-scripts https://github.com/hyyino7/her-world`, yielding
`0.1.0-rc.2`. This consumer will be used to verify replacement with the identical
address after publication, without altering the DSH profile.

Local release metadata/export checks, private-binding export regression, and
release workflow YAML/shell syntax pass. Runtime behavior is unchanged; the
cloud release workflow retains the existing environment/types/build/test/archive
gates. Final release, CI and repeat-address update evidence is recorded after
remote readback. Logs/fixtures live in `.cache/her-world-direct-*` and are not
uploaded.
