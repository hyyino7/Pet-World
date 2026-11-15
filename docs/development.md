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

Crop-clock continuity is covered by `garden-clock-continuity.test.ts` in both
the main tests and `test:life-integration`. It uses disposable Body and SQLite
Economy data, including real Cordis service disposal and replacement, without
models or installation. Body retains optional `gardenClockEnabled` metadata in
its existing home checkpoint: an explicit Life pause freezes crop time, while
component suspension preserves clock intent. Legacy checkpoints with unknown
intent retain elapsed growth during observation until admission is restored.
Economy rejects checkpoints that reduce an existing crop's committed progress or
rewind its settlement clock. These checks prevent future rollback; they do not
reconstruct growth already lost from an older save.

`pnpm run test:native-context` uses the installed DSH loop and native persistence
with a scripted local model and a disposable workspace. It checks a stable system
prefix, one current operational snapshot, durable interaction acknowledgements,
retained originals and an unchanged accepted Life plan. It installs nothing and
makes no paid model calls. Domain/Memory failure and restart cases remain in
`test:life-integration`.

`test:native-services` verifies real Bank recall across conversations and a
provider restart. `test:native-life` explicitly enables the fixture's review
schedule, exercises preset-inherited native read/write tools, rejects writing
outside the original review scope, and checks independent writing after Bank
correction/withdrawal. Both use disposable data and scripted models. Their local
Memory provider must be allowed to bind loopback; a denied bind is an environment
failure, not evidence of broken recall. Review masks combine the host's global view with visible preset read/write
capabilities; agent-local Life tools are never passed as inherited names.

Completed autonomous Life turns also prepare model-free history maintenance
while the native Agent is idle. Only older successful default state reads are
eligible; the latest turn, owner turns/takeovers, reviews, errors, explicit full
views, interaction/transaction receipts and reading text remain untouched.
The existing module-owned overview functions preserve pending plans, waiting
states, failures, inventory and receipt identifiers. A queued input takes
precedence. No new timer, session, summary call or Memory writer is created.

Idle preparation does not write the log: DSH requires replacement tool results
inside an open turn. Prepared changes land in the next real `agent/request`,
with native shadow pricing, positional source citations and ordinary turn
persistence. Changed bindings and nodes superseded by native compaction are
discarded. All original events remain in the append-only log. Native semantic
compaction, Memory batching, recall, source withdrawal and review schedules keep
their existing ownership and settings. `test:native-life` checks persisted
restoration and continuation through the actual preset compaction provider,
using one explicitly requested scripted summary for that compatibility test.

For an explicitly selected original native log, a read-only payload comparison is
available after building:

```sh
pnpm run check:context-payload -- /absolute/events.jsonl.zstd --day 2026-11-14 --offset-hours 7
```

It accepts native JSONL (including concatenated Zstandard frames) or an event
array. Output contains counts only. It compares the same original calls against
the overview/fact renderers, preserving ordinary-owner full-view defaults. Text
characters are not provider tokens or billed savings; the comparison excludes
new context/header overhead and cannot predict future model choices or cache hits.
Its `maintenance` section separately replays idle preparation over legacy full
defaults, retaining the latest turn. These savings overlap the overview
comparison and must not be added to it. Values are request-weighted text
characters, not measured provider tokens, cache hits or billed savings.

Current operational context uses required DSH tail snapshots. Superseded owned
sections are retired through native surface replacements; original events stay
in the append-only log. Other producers' distinct sections are retained, and an
equal current snapshot is reused. Room, garden, economy and plan read tools accept
`view: overview | full`; autonomous reads default to overview, ordinary owner
reads retain full defaults. Economy also offers paged catalog/recent-ledger reads. Room/economy queries accept
`factIds` to read original interaction receipts, including their numeric effects.
Actual reading text, original dialogue, domain state and memory sources are not
truncated by these model-facing views.

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
