# Autonomous-life integration verification

Date: 2026-11-13, Asia/Ho_Chi_Minh.
Historical integration checkpoint: candidate `205e94730368` was superseded by
the later [thin Core/package review](package-code-review-2026-11-13.md).
Its code cases remain relevant; current candidate and acceptance status belong
to the handover. The old generic Core scheduler is now retired.
Scope: owner-requested code verification and installed-test cases. Installation,
real model requests, personal workspace tests and human acceptance are excluded.
This extends the [integration plan](../planning/autonomous-life-game.md) and
[owner trial](../handover/autonomous-life-owner-trial.md).

Result: build and type checks passed; **161 code tests passed, zero failed or
skipped**, including **20 new composition cases**. Candidate `205e94730368` is
not installed. All owner acceptance cases remain not run.

The checked package has 412 build files matching the verified source build.
Vendor provenance, 149 local documentation links/anchors and source whitespace
checks pass. Task scope is two production files, the selected code tests/test
command and their owning delivery records; unrelated existing work is retained.

## Finding and disposition

The inspected paths reuse Core's companion identity and workspace binding,
native DSH conversations, the existing Memory Bank and the shared Body/Economy
authorities. No additional assistant runtime, world or memory store is needed.
Two reproducible integration defects were repaired within those existing paths:

1. A native Life fact envelope was a reply ancestor but lacked its own queued
   Memory observation. The actual Python MemoryPort returned `unknown` for the
   derived reply, and the native batch tracking predicate could withhold it.
   Core now queues that envelope as a **system** source, alongside its original
   fact roots. Original actor/channel/session attribution remains separate; an
   owner action does not become an owner statement or permission grant.
2. Desktop used native Life runner readiness to decide whether its older
   whisper/dream inference could run. Persisted Life intent can be enabled while
   native startup is unavailable. Desktop now reads the public saved clock
   admission first, retaining the existing `running()` fallback for compatible
   older services. Explicit Life disable still permits those optional features;
   deterministic todo reminders continue without an extra model chain.

The first defect was reproduced against an actual disposable Python MemoryPort,
not only a mock returning eligible. The second was reproduced with real Life and
Desktop coordinators: four of six new cases failed before the guard repair.

## Composition coverage

| Boundary | Actual code exercised | Evidence and practical limit |
| --- | --- | --- |
| Core identity / records / native prompt | `createCore`, public binding/initialization, companion foundation hooks, real self file | Two owner chats assemble the same records, plan and body facts; host prompt assembly/persistence are simulated |
| Body / Life / Economy | Public Body and Economy services, persistent Life domain plan, real SQLite and JSON | Purchases, food effects, reservations, interruptions, restart and versioned reading reconcile; choices are supplied by fixtures rather than inferred |
| Native input / Memory | CoreNative, NativeMemory, Core SQLite and Python MemoryPort | Full source ancestry is eligible; source deduplication, scope checks and withdrawal propagation work in tested cases; semantic recall quality is unmeasured |
| Summary / original records | Existing native summary batching and Memory join | Retry reuses the completed summary; Memory-off material is withheld; native originals remain available |
| Emotion / Core / Memory | Real Emotion canonical file, Core binding, original completion/update APIs | State survives restart and unavailable Memory; stale writes and corrupt files are rejected; visual expression is not exercised |
| Desktop / Life admission | Actual Life control and Desktop maintenance, fake native opener/model stream | Unavailable inference cannot admit the parallel automatic thought chain; selected deterministic reminders remain functional |
| Binding / permissions / portability | Core owner/module contracts and workspace initialization, existing storage/backup regressions | Tested scope and file ownership remain enforced; actual Cordis teardown, installed native logs and cross-device continuity require the owner trial |

## New code cases

The entry point is `source ./scripts/env.sh` followed by
`pnpm run test:life-integration`. It builds the repository, runs the existing
explicit autonomous-life regression list, then the new integration cases and
selected Core/Workspace/Memory-batch/Emotion regressions. It does not run the
broad unscreened `test`, live-model or installed-window scripts.

| ID | Case | Required result | Test file |
| --- | --- | --- | --- |
| C01 | Two owner chats, Life and Memory off | Shared identity/self/plan/body; prompt preparation alone does not acknowledge facts | `life-core-integration.test.ts` |
| C02 | Guest, foreign and archived chat | No private environment fact or acknowledgement | Same |
| C03 | Flush failure, failed turn, missing effective context | Fact retained until a completed durable owner turn | Same |
| C04 | Domain unload after prompt preparation | Old service cannot receive a late acknowledgement | Same |
| C05 | Body fact → Life message → native reply → actual Bank | Complete eligible ancestry and summary admission; correct system/owner distinction | `life-memory-integration.test.ts` |
| C06 | Same fact in two owner conversations | One provider observation; existing source revalidated | Same |
| C07 | Lost provider acknowledgement and Core SQLite reopen | Original source/observation identity retained on retry | Same |
| C08 | Memory off, then re-enabled | Originals retained; old unobserved Life inputs not silently enrolled | Same |
| C09 | Guest and Bank change during asynchronous work | Private association and late wrong-Bank acknowledgement rejected | Same |
| C10 | Original source withdrawal | Actual provider rejects the derived reply | Same |
| C11 | Life buy/consume with SQLite settlement abort and restart | Body effect applied once; reservation retained; original operation settles once | `life-domain-integration.test.ts` |
| C12 | Owner inventory meal interrupts sustained activity | Original intent and provenance survive restart, then resume | Same |
| C13 | Reading offer, pause, restart and content replacement | Only actual offered text/version can advance its bookmark; duplicate confirmation does not advance again | Same |
| C14 | Economy component absent, then restored | Transaction waits; free care works; original wallet/operation resumes | Same |
| C15 | Enabled Life with native opener unavailable, awake | No automatic Desktop whisper timer or model stream | `life-desktop-integration.test.ts` |
| C16 | Enabled Life with native opener unavailable, asleep | No automatic Desktop dream timer or model stream | Same |
| C17 | Explicit Life disable, awake | Original optional whisper path still works once at its own deadline | Same |
| C18 | Explicit Life disable, asleep | Original optional dream path still works once at its own deadline | Same |
| C19 | Enable fails after an old thought timer was armed | Old timer cancelled; retained Life intent wins | Same |
| C20 | Todo due while Life owns autonomy | Reminder delivered once without a separate model call | Same |

The Python probe uses a disposable Bank without starting its background runner
or a listening service. Socket connections are explicitly forbidden. Other
native/model/display boundaries use fakes; production domain and provenance
methods supply the behavior under test. Fault injection touches only temporary
SQLite/JSON, never the owner's records.

The adjacent tests initially contained outdated prerequisites: Core execution
without a ready workspace, device-side Core databases, legacy document layouts,
resolved settings used as saved configuration CAS, and a legacy emotion inserted
after canonical initialization. The fixtures now follow the public portable
initialization/configuration contracts. Original idempotency, permission,
evidence, preservation and failure assertions remain. Execution waits are bounded
so a refused admission cannot leave a test hanging. Product guards were retained.

## Installed integration cases for the owner

All cases are **not run**. Use the candidate recorded in the
[current handover](../handover/README.md), the expected companion and complete
workspace. Pick ordinary interactions/items; no special test money, database edits,
reset, deliberate corruption or destructive fault injection is required. Read
the original U01–U16 for general life, platform and resource acceptance.

| ID | Setup and action | Pass observation | Evidence if it fails |
| --- | --- | --- | --- |
| I01 | Life off, Memory on: give water in Room, then immediately ask in another owner chat | Same Xiaoxi recognizes the completed owner action and real result; plan/body are consistent | Both chat channels, time, actual body state, unexpected repetition |
| I02 | Life on: interact while she is reading/resting, then open another owner chat | Sustained activity survives; current facts appear without restarting or consuming again | Plan/operation before and after; duplicated actions or wrong speaker |
| I03 | Discuss a real offered passage and explicitly ask her to retain a meaningful point; later open a fresh owner chat and ask about it | Response uses the actual passage and existing memory service with its source; uncertainty is admitted when material is unavailable | Content/version, relevant original and later answers, retrieved source if visible |
| I04 | Turn Memory off; use an ordinary new chat and life interaction; turn it back on and use a new chat | Core/body/plan remain usable; no silent Bank backfill of unobserved old logs | Component settings, which source was observed while on/off, archive entries if visible |
| I05 | Through normal settings, make the configured Memory connection temporarily unavailable while Life/Body still have accepted work | Current body and accepted plan persist; chat degrades without invented recall; restoring Memory does not repeat physical effects | Availability state, operation/receipt, before/after body and repeated observations |
| I06 | With Life enabled, make its configured model unavailable while Desktop's optional automatic thoughts are configured | No parallel Desktop whisper/dream chain; accepted work continues and new decisions wait | Which model route failed, Life enabled/running distinction, call reasons and times |
| I07 | Use the official correction/forget operation on a selected saved memory; ask about it in a fresh chat | Withdrawn material is not recalled as a valid source; current body, possessions and independent emotion are not rolled back | Selected memory/version, operation result and later recalled material; old chat text is expected to remain |
| I08 | Restart normally after an interaction or inventory meal, then ask from another owner chat | Same identity, effects, inventory and receipts; no duplicated eating/payment or blank replacement stores | Candidate, timestamps, holdings and current operation |
| I09 | In settings, disable/re-enable optional Life, Memory, Economy and presentation components one at a time, restoring each before the next | Required dependencies and unavailable states are explicit; enabling a view does not create another companion/world/Bank | Component order, availability/readiness, duplicate actions, stale UI or reload errors |
| I10 | With Memory unavailable/off, observe mood and current life, then hide/show Room or Desktop | Current independent feelings and body remain; restored display uses current state without resetting or replaying old replies | Mood/body before and after, display state, replayed bubbles or missing character |

For I04/I06, visible behavior alone cannot prove absence of hidden backfill or
model calls. Record the available archive/source and request diagnostics; without
that evidence mark the internal part **inconclusive**, not passed. Actual language
understanding, natural continuity, recall usefulness and device-power results are
owner judgments, not properties established by the code tests.

## Evidence and remaining limits

Code results and the candidate belong to the
[runtime record](../mvp-runtime.md#autonomous-life-integration-verification-2026-11-13).
Task-local baseline, test/build/type logs, package checks and candidate receipt
are under `.cache/autonomous-life-integration-20261113/`.

No installed acceptance, real-model, native-window, thermal or cross-device
measurement is claimed. The original Memory-batch scheduler still checks its
existing queue once per second; this review preserves that policy. CPU, memory,
GPU and wakeups require the device procedure in the owner trial. A passing fixture
does not establish independent product acceptance or that untested paths are
free of defects.
