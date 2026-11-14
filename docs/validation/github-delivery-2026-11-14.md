# Her World GitHub delivery — 2026-11-14

## Authorized scope

The owner requested complete source upload, version publication and DSH market
updates, with no agent-run installation. The owner selected `Her World`, package
`her-world`, and remote <https://github.com/hyyino7/her-world>.
Business-logic repairs and the incomplete caretaker RCA remain paused.

## Source and release design

An isolated delivery checkout merges the online import history (head
`3f390e2130d8cac08ea1ad191b5bd27f0a6e6a80`) with the complete local history
(`2962d0f4441e4d79d67371e7d144cc9215d9dec7`) and preserves the pre-existing
handoff-only edits. No remote history is replaced. Full TypeScript sources,
tests, scripts, configuration, lockfile, vendor source inputs, asset sources and
provenance are restored. `.cache`, development environments, private companion
data and reference checkouts are excluded. Compiled `dist/src` is committed
without source maps so native Git installs need no consumer-side build hook.

The package rename updates self-imports, bundle names, release metadata and
product branding. Module entry IDs and data schemas stay unchanged. Native
profile overrides retain device configuration outside updateable package files;
the owner performs the [one-time switch](../github-updates.md).

GitHub Actions verifies source changes. The release workflow checks/builds/tests
a selected version, creates an immutable Git tag, publishes an archive plus
SHA256SUMS, then publishes a commit-pinned `market/index.json`. It uses the
published DSH index validator, not a new runtime or updater. The upstream
reference generator was inspected: it is private/unpublished, while its official
validator is available as `@deepseek-ai/dsh-plugin-market-index@0.2.1-alpha.4`.
This single-package index uses the documented JSON format and official validator.

## Local evidence

- Project environment, SDK imports and TypeScript checks pass.
- `pnpm test`: 359 pass, zero failures/skips. The previously failing World
  provenance test compared all files only with original upstream hashes;
  existing `origin.json` already records the `hostContract.d.ts` adaptation.
  The test now follows the same original/adapted hash selection as the existing
  runtime-package check. No upstream bytes or recorded hashes were changed.
- Two release tests pass: private binding export preserves original files and
  identity, strips only the verified old package-local default shim, and refuses
  overwrite; the official DSH validator accepts `her-world` and produces the
  exact commit-pinned install spec while rejecting the old uppercase package.
- The extended `test:life-integration` command passes both sequential suites;
  its final suite has 911 passing cases. These overlap other suite counts and
  must not be added together as independent coverage.
- All workflow/composite YAML parses and embedded shell scripts pass `bash -n`.
- An independent delivery checkout installs the frozen lockfile offline from
  the existing package cache; environment/types/release tests pass without
  `references/sources`. Local Node and Python links are verification scaffolding,
  excluded from the published tree.
- The installed DSH application's actual `composeEntries` library retained
  synthetic Core identity, storage and Memory configuration across portable
  bundle replacement. This was a library fixture under Electron's Node mode;
  the DSH application/profile was not started or changed.
- Isolated archive verification passes: 911 members, 256 build files, 42 helpers,
  236 vendor hashes, 39 source-only origin entries, 554 local runtime references,
  12 Markdown references and 43 declared external imports. Relocated Core,
  native edit scopes, Memory, Body/plan and wallet effect-once probes pass.
  Local archive SHA256:
  `0221dabf617a409845031aff8cde90eedcef5c83120f38b96401e2cf097b0846`.
  A CI-built release has its own published checksum.

Local logs/probes: `.cache/her-world-*`. Raw caches are not part of a clone.
The source import includes three unchanged historical end-of-file whitespace
warnings in tests/vendor documentation; new edits pass scoped whitespace checks.

## Publication and acceptance

The full source/history merge was uploaded as `e894a4e`. The initial `rc.1`
tag's cloud run stopped at Python setup: `actions/setup-python` has no macOS
ARM Python 3.12.14 distribution. No Release or market version was published.
The workflow now reuses the existing project bootstrap's `uv` managed-Python
path, with uv 0.12.5 pinned. The `rc.1` tag is retained unchanged.

Cloud verification also caught a local `.venv` verification symlink accidentally
staged because the old `.venv/` rule did not match a symlink. Commit `c1f5357`
removes it and fixes the ignore rules; no environment contents were uploaded.
The next clean run reached the tests and exposed missing Python fixture
dependencies. CI and fresh-clone instructions now install the existing exact
`vendor/mnemosyne/requirements-test.lock` before default tests. These failures
occurred before an `rc.2` tag, Release or market version was created.

Published replacement version: **0.1.0-rc.2**, marked prerelease.

- [Source/runtime CI](https://github.com/hyyino7/her-world/actions/runs/43574393296):
  success, including clean environment setup, tests and archive verification.
- [Manual release workflow](https://github.com/hyyino7/her-world/actions/runs/43574430772):
  success. This exercises the same **Run workflow** entry the owner can use later.
- [Release and assets](https://github.com/hyyino7/her-world/releases/tag/v0.1.0-rc.2):
  archive `her-world-0.1.0-rc.2.tgz`, 114,958,072 bytes, plus `SHA256SUMS`.
  Published archive SHA256:
  `50067198735af1725f542ebd84aa1f4fe5cc8dedb7cca446c0c37901739b24ea`.
- Tag and index both pin
  `3b380a6f7cc1d0e312c70e2d05e31a09121b45fb`, on `releases/v0.1.0-rc.2`.
  The commit contains 1,435 files, no source maps or development environments,
  and `release.json` records source commit `3844125`.
- The [raw DSH index](https://raw.githubusercontent.com/hyyino7/her-world/market/index.json)
  was fetched and read back after publication. It contains only the successful
  `her-world` release, the exact full commit and the declared DSH compatibility.
- Main readback contains 115 TypeScript implementation files and 107 test files;
  no `.venv`, `.tools`, `.cache`, `node_modules` or reference checkout is tracked.
- A fresh isolated pnpm consumer installed the exact indexed Git spec with
  `--ignore-scripts`. Every concrete package export exists; Core and console
  imports succeed with the renamed package/version. Tests are excluded from
  the installed runtime. No DSH process, data store or model call was started.
  Evidence: `.cache/her-world-git-consumer.log` and its disposable consumer.

Local Git authentication was absent during the first push probe; the owner
completed GitHub's device authorization. No credential was printed or included
in a commit. No force push, failed-tag rewrite or source-history replacement.

The known unfinished caretaker pause/resume replay P2 remains open. Stable
publication is blocked by `docs/release/status.json`. No live installation,
personal-profile migration, model/account request or owner acceptance is claimed.
