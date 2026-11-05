# Core Runtime

- Updated: 2026-11-05, Asia/Ho_Chi_Minh.
- Record: Previous implementation and its verification procedures, retained for
  reassessment. [The handover](handover/README.md) owns current task/installation
  status; this code and its checks do not establish an accepted architecture.
- Detailed change, reuse, hardcoding review and evidence:
  [Core conversation flow](core-conversation.md).
- Full scope: [Core/Console plan](planning/core-console-implementation.md).

## Code Entries

The package/Bundle is `dsh-Chatpet`; its first native component is `00-Core`,
loaded through `dsh-Chatpet/00-Core` with description `插件核心模块`.
Root and component locale exports are distinct; see the
[naming convention](planning/modular-design.md#naming-convention).
The existing README, companion identity, services, events, data paths and persisted
format IDs remain unchanged. Developer navigation lives in the
[development guide](development.md).

| Concern | Source |
| --- | --- |
| Native settings and owner adapter | `src/console/plugin.ts`, `src/console/client.js`, `settings.ts`; [scope and evidence](settings.md) |
| Native plugin and composition | `src/core/plugin.ts`, `src/core/index.ts` |
| Identity, caller capabilities, records and SQLite journal | `core.ts`, `authority.ts`, `storage.ts` under `src/core/` |
| Native per-run Agent/session lifecycle and dialogue projection | `src/core/execution.ts`, `dsh-driver.ts`, `history.ts` |
| Matter tools and conversation limits | `src/core/matters.ts`, `options.ts` |
| Artifact storage and partial checkpoints | `src/core/resources.ts`, `maintenance.ts` |
| Small upstream adaptations and installation | `src/core/upstream/`, `scripts/install-dsh.mjs`; see [reuse/evidence](core-conversation.md) |

Caller capabilities, Core-owned raw dialogue, per-run native sessions, the
synchronous eligibility seam, installer defaults and storage layout are all
reviewable implementation choices during reconstruction.

## Implemented Behavior

| Area | Current behavior | Limit |
| --- | --- | --- |
| Identity and trust | Durable configured companion/owner, expected revisions, issued contexts, narrow module grants, exact-target pairing | Trusted native plugins share process trust; no untrusted HTTP/Console bridge exists |
| Conversation | Authenticated input/dedupe, bounded Core-owned dialogue context across turns/channels/restart, logged native context, serial native execution and final non-tool reply | Text input; extracted Memory knowledge and its view/use protocol remain separate |
| Matters | The native model can list/read/create/update a matter, record concrete progress, wait for a dependency and store an analysis result with evidence | No keyword intent parser or automatic turn-end completion; external actions require future actual providers |
| Progress and reply | Durable revisioned progress, native interruption records, `pet/matter.progress` observations, `host.chat()`/turn queries and final reply/contact association | No Desktop/QQ transport is installed; a generated reply is not gateway confirmation |
| Restart | Identity/dialogue/matters/results persist; new input can continue an existing matter; unknown handoffs are reconciled rather than repeated | Accepted old input waits rather than replaying automatically; prior-boot contact attempts remain guarded |
| Source controls | Full source lineage, source checks before native steps/tools/publication, dependency expansion on tool reads; registered guard loss stays closed | The synchronous host eligibility adapter is not a Memory Bank or proof of the full cross-process lease/withdrawal protocol |
| Resources | SQLite bytes/catalogue, bounded uploads, digest checks, holders and GC | Derived Memory artifacts remain blocked without the full Memory protocol |
| Maintenance | Eligible current-matters/configuration export, protected partial Core snapshots, byte verification, restore-preparation records | Same-database local checkpoint only; full backup/import/guarded restore remains unavailable |
| Lifecycle/policy | Native Cordis injection/effects/disposers, scoped tools and budgets, writer lock, quiescence/resume; owner capacity separate from autonomous limits | Autonomy/proactive contact remain paused; exact monetary or hard-stop guarantees are not claimed |

## Public Entry And Ownership

`src/core/plugin.ts` provides `ctx.petCore` using the installed native Agent Loop,
session persistence, system prompt and tools services. Core owns product state;
DSH owns Agents and native logs. No second model runtime, plugin loader or
separate Memory authority is introduced.

- `host.services.core`: identity/bindings/input/history/matters/progress/turns/policy.
- `host.services.execution`: admitted start/inspect/interrupt/reconcile.
- `host.services.resources` / `maintenance`: Core-owned resource and maintenance facets.
- `host.chat(context, incoming)`: authenticated input through execution to its
  final turn, related matters/progress and pending contact; no fake send receipt.
- `host.observeFreshReplies()` / `observeProgress()`: current observations;
  native clients can subscribe to `pet/conversation.presented` / `pet/matter.progress`.
- `host.setHistoryGuard()`: trusted eligibility-provider attachment. Once used,
  provider absence remains blocked, including after restart.
- `host.operator` / `connectModule()`: trusted bootstrap handles. Never expose an
  issuer or wildcard owner capability to a model, browser or gateway payload.

Contract **0.3** adds progress/turn reads and clarifies direct Core dialogue
versus extracted Memory views. `CONTRACT_VERSION` has one shared definition.
See [module contracts](planning/module-contracts.md). Voice IDs are reserved;
its detailed port and Console UI remain pending.

## Configuration And Persistence

Required host configuration supplies absolute `dataDir`/`cwd`, companion/scope/
owner identifiers, display name/character and the selected native provider/model.
No business identity, account, model route, test input or answer is fixed in Core.
The [settings adapter](settings.md) edits existing identity/quiet policy and
Core-owned execution preferences. Saved limits apply to subsequent Core runs;
workspace selection is persisted but native Chatpet conversation remains unbound.

The optional host `conversation` seed and saved Core preferences own `maxHistoryMessages`, `maxContextChars`,
`maxSteps`, `maxToolCalls`, `maxDurationMs`. Defaults are 32 messages, 24,000
characters, 12 model steps, 24 tool calls and 120 seconds. Per-request output
limit is configured separately through the native driver. Bounds are validated;
zero tool allowance hides tools. These are implementation defaults, not accepted
latency, cost or personality choices. Cancellation waits for actual native state.

Core uses built-in `node:sqlite`; no new runtime library was installed. Its private
0700 directory holds `core.sqlite` (0600), SQLite WAL/SHM and an exclusive writer
lock. Schema 1 stores JSON records plus a transactionally consistent request
journal and artifact bytes. The new records use additive kinds, so existing
identity/domain records are retained without a destructive migration.

Records and idempotency receipts commit together. No model/network call runs
inside a SQLite transaction. Native session identities are execution-owned;
Core projects only bounded, eligible dialogue for continuity. File/resource calls
accept IDs, never user paths. Caps: 256 KiB chunks, 16 MiB artifacts, 256 MiB
resource-byte storage, 4 MiB canonical JSON calls/records. Full restore must
preserve operational ledgers, channel revision high-water marks and withdrawal
guards; replacing the database is not a supported restore operation.

## Naming Replacement Evidence (2026-11-05)

The official DSH CLI removed `codex-pet` and installed `dsh-Chatpet` after the
user confirmed DSH was fully closed. Package/type/build and the scripted native
runtime check passed. The installed DSH metadata resolver verified bundle title
`dsh-Chatpet` and component title/description `00-Core` / `插件核心模块` for
English, Chinese and Simplified Chinese. Installed dependency/bundle selection,
export resolution, README byte equality, and original host configuration were
checked. The installer verified the existing user patch hash was unchanged.
Packaging now sets `COPYFILE_DISABLE=1` to exclude macOS AppleDouble files,
which otherwise invalidate locale discovery. Prepared archives use a content-hash
filename to prevent pnpm from retaining a previous same-path archive. The final
archive and installed locale directories were checked for those extra files.
No live-model request or UI acceptance check was performed. An existing inactive
`dsh-dafeiyu-room` version warning was reported by the installer; no exemption or
other plugin change was made.

## Verify

Activate `source ./scripts/env.sh`, then choose checks for the change:

| Change | Relevant check |
| --- | --- |
| Documentation | Affected local links/anchors, diff and scope; `git diff --check` |
| Types / public contracts | `pnpm run check:types` |
| Core behavior | Affected tests; `pnpm test` for the Core suite |
| Native DSH binding/lifecycle | `pnpm run test:native` |
| Toolchain / reference restoration | `pnpm run check:env` |

These are available checks, not a mandatory sequence for every edit. Repeat or
broaden checks when changed behavior, a failure or unresolved concern requires it.

The native test imports the trusted installed application's actual Cordis,
Agent Loop, JSONL persistence and native executor into a temporary composition.
It uses a scripted local model, removes temporary data and does not boot the
personal desktop profile. For another app path, pass `--dsh-app` directly to
`scripts/check-native.mjs` after build.

Real-model validation is separate, sends model requests using existing configured
authentication, and is warranted only for a relevant model-path change/failure:

```sh
source ./scripts/env.sh
pnpm run test:live
```

The live script reads the chosen profile's provider/model, uses native account
services with a read-only credential provider, and submits synthetic test
material. It creates no new sign-in or provider installation. Personal config/
credential bytes are hashed before/after, never logged or copied to a report.
The current live composition supports the installed DeepSeek account adapter;
an unavailable configured route fails rather than selecting a fallback.

Observed behavior and exact evidence belong to the conversation record. Unit,
scripted-native, real-model scenario and user acceptance remain distinct. These
checks do not accept all C0–C3, CC01–CC20, V1–V6 or A01–A19. Console, complete
Memory/Voice/Desktop/QQ/Bilibili joins, autonomous policy and full restore remain
part of the overall scope.
