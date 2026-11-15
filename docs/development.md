# Development

Start with README and this document. Keep current source and operational docs;
do not create historical plan, handoff or audit-report collections.

## Local tools

On Apple Silicon macOS, prepare the pinned tools once with
`python3 scripts/setup-runtime.py` (requires `uv`), then:

```sh
source ./scripts/env.sh
pnpm install --frozen-lockfile --ignore-scripts
uv pip install --python .venv/bin/python -r vendor/mnemosyne/requirements-test.lock
```

Source `scripts/env.sh` in each development shell. Do not replace global tools
or the installed DSH application. Bundled upstream origins and licenses stay in
`references/manifest.json`, vendor records and `THIRD_PARTY_NOTICES.md`.

## Everyday checks

Run checks affected by the change. For a crop-clock edit, for example:

```sh
pnpm run build
node --test dist/tests/behavior/garden-clock-continuity.test.js tests/regressions/audit-r5-garden-clock.test.mjs
```

Documentation-only edits need link, diff and scope checks. `pnpm test` and the
existing focused suite commands remain available; do not chain overlapping
suites and rebuilds just to repeat the same verification.

## Full verification and release

```sh
pnpm run verify
```

This is the shared PR/release check: environment and types, one build, all
compiled TypeScript and JavaScript test entry files once, Python Memory tests,
release validation, one archive and its package-closure/integrity checks.
Regression tests for crop growth, wallet/inventory, deduplication, Memory,
continuity, backup/restore and storage ownership remain included. Tests use
disposable data and no paid models. Memory process tests need local loopback;
a sandbox-denied bind is an environment failure, not a failed recall result.

The publication workflow runs this command itself. Local work normally needs
only relevant checks; a separate manual release copy and a second full local
verification are unnecessary for clean, committed source. See
[publication and update instructions](github-updates.md) for the single release
entry and for safely isolating intended changes from a dirty working tree.

## Optional native checks

Native/window checks under `scripts/checks/` and `tests/manual/` require explicit
isolated environments. Never run them against personal companion data.

- `test:native-context`: real installed DSH loop/persistence with a scripted
  local model; current context, durable interaction acknowledgement, originals
  and the accepted plan survive.
- `test:native-services`: cross-conversation Bank recall and provider restart.
- `test:native-life`: scoped review read/write, outside-scope rejection,
  correction/withdrawal, native history restoration and compaction continuity.
- `test:room-refresh`: optional macOS Room compositor/window verification.

These checks do not install or update DSH. Installed owner acceptance is
separate from source, package and scripted-host validation.

For a specifically selected original native log, the read-only
`pnpm run check:context-payload -- /absolute/events.jsonl.zstd --day YYYY-MM-DD --offset-hours 7`
compares context rendering. Counts are request-weighted text characters, not
billed tokens or measured cache savings; overlapping estimates cannot be added.

## Runtime and data boundaries

DSH owns chat and scheduling. Modules own their data and expose explicit
interfaces; presentation and readers do not create assistant runtimes or write
Memory independently. Current state uses required native tail snapshots and
surface replacements; original events, dialogue, interaction receipts and
reading text remain retained. History maintenance prepares during native idle
and applies inside the next real request, without another model call. Memory,
compaction, review and source withdrawal keep their existing owners. Operational
settings and storage details are in [settings](settings.md) and
[portability](portability.md).

Accepted Life steps continue from actual completion events without another
model decision. A typed Body refusal before submission retains the original
operation while the current owner interaction finishes; an unknown submission
outcome still requires receipt reconciliation. Integration tests must exercise
these transitions through the real coordinators without manually advancing the
next step.

Interaction delivery acknowledgement is separate from shared Memory recall.
Admitted domain facts remain system evidence with their original actor and
source; transport envelopes are evidence only. Cross-conversation checks must
call the actual provider recall after the first conversation acknowledges the
fact, rather than supplying its known ID to the second conversation.

Body retains optional `gardenClockEnabled` metadata in its existing home
checkpoint. Explicit Life pause freezes crop time; component suspension retains
clock intent. Queries before restoration preserve elapsed growth. Economy
rejects checkpoints that rewind the existing crop or settlement clock. This
does not reconstruct progress already lost in an older save.

Review regressions include `tests/life/life-review-runtime.test.mjs` and the
compiled `life-review-files`, `review-continuation` and `life-sleep-continuity`
tests. They cover dated retries, restart reconciliation, existing diary protection
and actual sleep through the Life/Body coordinators without a paid model.

Keep runtime exports, native bundle IDs and companion data formats stable.
`dist/src` is retained for GitHub installation; the release workflow builds and
freezes it with the tested source. `dist/tests`, source maps, caches, tools and
personal companion data are not deliverables. Ordinary builds verify built-in
media; optional regeneration uses `src/behavior/animation-allocation.json` and
artwork in `art/`.
