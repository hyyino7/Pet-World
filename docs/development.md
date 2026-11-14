# Development

Use the current source and README as the working entry point. This repository
keeps no historical handoff or implementation-report archive.

## Bootstrap

On Apple Silicon macOS, install the pinned local runtimes with
`python3 scripts/setup-runtime.py` (requires `uv`), then:

```sh
source ./scripts/env.sh
pnpm install --frozen-lockfile --ignore-scripts
uv pip install --python .venv/bin/python -r vendor/mnemosyne/requirements-test.lock
```

Tools and dependencies are disposable and ignored. Do not replace global
runtimes or the installed DSH application. Required upstream code is already
in `vendor/`; origin/commit/license metadata is retained without cloned
reference projects.

## Verification

```sh
pnpm run check:types
pnpm test
pnpm run test:life-integration
pnpm run test:release
pnpm run build
pnpm run check:release
pnpm run test:refresh
```

`pnpm test` retains its previous scope: compiled TypeScript tests plus World
JavaScript tests. `test:life-integration` retains the explicit existing regression
suites. Moving tests does not remove their assertions or broaden them into live
account/model checks. Python provider tests are under `tests/memory/`.
`test:refresh` covers bounded Room/garden/Desktop refresh convergence, stale
responses, explicit refreshes, intentional frame rates and resize/draw ordering.
On macOS, the isolated compositor check uses the existing Electron runtime:

```sh
"$HOME/.dsh/electron/Electron.app/Contents/MacOS/Electron" tests/manual/room-canvas.cjs
pnpm run test:room-refresh
```

Native/window checks in `scripts/checks/` and fixtures in `tests/manual/` require
explicit isolated environments; they must not run against personal companion data.

Current runtime exports and bundle IDs are stable. Core's native adapters live
in `src/core/native/`; each business module retains its existing data authority.
`src/behavior/animation-allocation.json` is the current allocation input used by
`scripts/build/build-animation-map.mjs`. Artwork in `art/` is used by the optional
life-media regeneration script; ordinary builds only verify those media.

`dist/src` is generated but retained for direct GitHub installation. Build before
publication and include the new generated runtime files; GitHub's release
workflow performs this automatically. `dist/tests`, source maps, caches,
virtual environments and local dependency directories are not source deliverables.
Do not commit credentials, private profiles, companion data or cache directories.
