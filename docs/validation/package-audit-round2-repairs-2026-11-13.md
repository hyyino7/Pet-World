# Round-two package audit repairs, 2026-11-13

Historical checkpoint: the frozen r6 archive and its open findings below remain
unchanged. The owner subsequently authorized their repairs; current source,
tests, candidate and new review belong to the [R6 repair record](package-audit-r6-repairs-2026-11-13.md)
and [handover](../handover/README.md).

## Scope and preserved boundaries

The owner authorized verification/repair of the six P2 findings and documentation
drift from the [previous independent package-only review](../../.cache/audit-repair-20261113/independent-review/report.md),
regression tests, a new package and another no-history package-only review.
Do not install. Installed functional, media, provider and power acceptance
belongs to the owner. The [native-service plan](../planning/native-service-refactor.md)
owns the runtime boundaries; the [previous repair record](package-audit-repairs-2026-11-13.md)
retains the original F1–F8 evidence and owner A01–A08 procedures.

The pre-task text baseline (830 files), dirty Git status/patches and new evidence
are under `.cache/audit-r2-repair-20261113/`. Preserve the pre-existing dirty
tree. No old Core executor, generic task/receipt scheduler, parallel Memory,
assistant runtime, audio implementation or world is restored. Native DSH
permissions and original conversation logs remain authoritative.

## Finding-to-repair matrix

| ID | Verified trigger | Repair and code evidence |
| --- | --- | --- |
| R2-1 | Memory's owned child exits but same-directory/scope preparation returns the retained client. | Reuse the existing serialized transition and `MemoryProcessHost.stop/start`. The fast path and requests require a ready owned child with no observed exit or sent kill. Unresolved stop retains ownership and prohibits replacement. `audit-r2-memory-self.test.mjs` covers observed exit/recovery, stale request rejection, unresolved stop/close retry, live reuse, startup failure and close behind recovery. No new supervisor or background retry loop. |
| R2-2 | Two owner self saves receive the same asynchronous snapshot and both accept its old revision. | In the original `saveSelf`, revalidate binding and compare the actual bounded UTF-8 file hash synchronously immediately before the original durable write. Use no-follow/fd checks and retain the stable reader's BOM behavior. The same test file exercises concurrent saves against one old snapshot, a completed intervening edit, rebind, BOM and empty files. This is not an OS-wide transactional CAS against arbitrary external writers. |
| R2-3 | A valid Life directory contains a symlink/hardlink/dangling dynamic JSONL or predictable temporary file. | Harden the original store's state/JSONL/read/index/write boundaries with regular-file, no-follow, descriptor/inode and directory-identity checks. Use exclusive random temporary files; failure cleans only its owned inode. Preserve Windows rename retry, torn JSONL recovery, merge rules and activity gap behavior. `audit-r2-life-files.test.mjs` exercises all three log outputs, reads, state, replaced directories/temporary paths, failed writes and retries. |
| R2-4 | Compact chat hides or changes session while media permission, AudioContext resume or transcription is pending. | Apply strict build-time changes to the pinned original recorder/control. Cancel the caller generation and request; late stream acquisition releases its tracks, abort during resume releases tracks/context, and stale success/error/finally cannot alter a new draft/control. Actual compact chat revokes on hide/Escape/pagehide and native session/workspace/new/send transitions. `audit-r2-desktop-voice.test.mjs` runs the generated audio module with fake media/DOM and the actual chat script, including real WAV-byte assertions. No second audio stack. |
| R2-5 | Quiet/visibility/settings/Life/rest conditions change after an automatic whisper/dream starts or a todo-list read awaits. | Mark automatic generation in the existing whisper path, abort when its live conditions change and recheck immediately before publication. Preserve deliberate manual whisper and normal owner chat. Todo publication rechecks the shared proactive conditions without depending on the whisper/Life enable switch, and quiet cancellation does not consume a reminder. `audit-r2-desktop-policy.test.ts` uses delayed fake providers/list reads and checks both cancellation and final publication. |
| R2-6 | A fresh device lacks cached Electron and the original fallback imports two undeclared packages. | Keep the original download/extract branch. Declare optional `@electron/get@5.0.0` and `@electron-internal/extract-zip@1.0.3`; resolve their lock entries/integrities without installing modules or running hooks. `audit-r2-electron-dependencies.test.mjs` invokes the real fallback function with only its module-load boundaries mocked: cached, successful download/extract, failure and pinned lock coverage. Archive validation now rejects undeclared ESM/dynamic runtime imports. No actual binary download/extraction/launch is performed. |

The dependency families match the
[official Electron 43.3.0 npm manifest](https://raw.githubusercontent.com/electron/electron/v43.3.0/npm/package.json).
The existing fallback and executable-path controls remain; optional dependencies
can be omitted when a compatible runtime is supplied. Fake modules verify the
branch's contract, not a real first-download/native-library installation.

## Documentation correction

- Memory's current switch applies on the next turn to existing and new sessions.
  The runtime capability reason and guide no longer advertise per-session old
  enrollment mode. Bank/native originals remain retained; off-period turns are
  not backfilled.
- New initialized `COMPANION.md` is empty and declared; there is no default
  persona fallback. New self/history/diary paths are `.chatpet/self.md`,
  `.chatpet/self.history/` and `.chatpet/diary/`. Existing legacy records retain
  their selected canonical path until explicitly migrated.
- Continuing Emotion remains independent of Memory eligibility. Optional old
  source/dependency references do not promise live revalidation of the current
  reason. Correcting/forgetting Bank material does not automatically hide or
  rewrite Emotion. This corrects the guide under the already selected design;
  it does not reinstate the removed whole-chat dependency/eligibility machinery.
- Source notices distinguish pinned input hashes from adapted output and name
  DSH as ordinary execution owner. Historical attribution/licenses remain, while
  removed adapters are described as historical rather than active code.
- Shipped guides no longer claim old build installation/acceptance for a new
  candidate or link to excluded `.ts`, plans/handover/runtime files. Source-only
  records are explicitly identified as such. Local links point to shipped
  portability/notices/assets. Archive validation now checks Markdown targets.

## Additional findings during the fresh package review

The independent r3 reviewer received only the frozen `ff5d8145f06a` archive and
returned three further P2 findings and one P3 guide conflict. Its raw
[report](../../.cache/audit-r2-repair-20261113/independent-review-r3/report.md) and
[inventory](../../.cache/audit-r2-repair-20261113/independent-review-r3/inventory.json)
remain unchanged; all 922 member hashes were also rechecked by the parent. The
review fully read 152 files, partially read ten and parsed 297 JS plus 185 Python
files. It did not execute code or access the repository. The three adjacent
faults and guide conflict were repaired within this task before the final package.
The initial archive and a document-only intermediate remain historical evidence.

| ID | Independently identified fault | Repair and regression evidence |
| --- | --- | --- |
| R3-1 | The resume loader treats Core's always-created Memory container as an existing Bank, forcing Python for a never-configured companion. | Reuse the existing Bank-directory validator. Distinguish actual/declared Bank and matching retained owner from a technical recent-interaction container; inspect SQLite read-only without creating a Bank or invoking Python. Missing/corrupt/linked/conflicting/unknown retained data remains a reconciliation error. Restore a custom declared Bank by its Repo-relative location. Twenty `audit-r3-portable-memory.test.mjs` cases include actual no-Memory Core initialization and the real installer's resume decision block with host boundaries mocked. The installer itself is unchanged and unexecuted. |
| R3-2 | Full retained Body history eventually exceeds the public Core input canonicalizer's 4 MiB limit and blocks notifications. | Hash the existing internally serialized JSON projection directly with Node SHA-256. Do not use an incoming-request budget on already saved internal history. Preserve every operation/fact receipt and keep Core's input checks unchanged. The large-history case in `audit-r3-body-voice.test.mjs` verifies notification, unchanged-state suppression, restart and duplicate replay without another effect. This removes the hard failure, not all long-term file-size/serialization costs; no arbitrary receipt expiry or new archive runtime is introduced. |
| R3-3 | Caller cancellation reaches the voice route but is lost before the original speech queue, allowing cancelled queued work to start later. | Strictly adapt the original route, speak service and builtin encoder through the existing build adapter; carry/check the signal at admission, cache lookup, dequeue, submission and commit boundaries. Keep the original queue/cache/timeouts. A submitted third-party provider without cancellation retains its serial slot until settlement/original timeout and cannot commit late bytes. Seven Body/Voice regressions cover both builtin/registered queued synthesis, release, live-provider serialization, cache lookup and late builtin output; all use fake dependencies and no network/media. |
| R3-4 (P3) | The guide promises stopping Life withdraws the local bridge, while Channels keeps it available. | Correct the guide under the already selected Life-off owner-channel behavior. Disabling bridge, changing Repo or stopping Channels withdraws it; pausing/unloading autonomous Life does not disable an explicitly enabled owner bridge. No token/bridge/lifecycle code is changed. |

The next independent r4 reviewer received only `0e3ee288c64e` and confirmed
seven P2 findings and one P3. Its unchanged [report](../../.cache/audit-r2-repair-20261113/independent-review-r4/report.md)
and [inventory](../../.cache/audit-r2-repair-20261113/independent-review-r4/inventory.json)
retain the evidence, coverage and unconfirmed risks. It fully read 195 files,
partially read 11, indexed/syntax-checked 471 and left 245 unread (229 media);
482 JS/Python syntax checks passed. The parent independently rehashed all 922
members. These confirmed adjacent faults were repaired before the next archive.

| ID | Independently identified fault | Repair and regression evidence |
| --- | --- | --- |
| R4-1 | Seven garden companion buttons drop their existing home-action callback. | Pass the original callback through `createGardenClient` to `mountGardenUI`. Ten `audit-r4-room-wiring.test.mjs` cases follow actual UI/client/RPC wiring and initial quality controls, including existing cancellation behavior. Keep the single Body execution entry. |
| R4-2 | A static photo updates the actor only one interpolated frame, so its position/height differs from the saved snapshot. | Add an optional snap update used only by static overview/free shots for sprite/model/3D actors. Normal movement interpolation and POV remain unchanged; the snapshot never writes Body. Sixteen `audit-r4-room-photo.test.mjs` cases exercise actual actor transforms, shot boot and poster completion with fake rendering/media. |
| R4-3 | Quality-button registration occurs inside the view-mode click handler, leaving initial opens unbound. | Register once at startup and refresh its initial state there. The wiring suite covers first open, saved mode and subsequent switches. DOM deduplicates the same handler; this was not a proven repeated-click-execution defect. |
| R4-4 | Waking while walking to bed clears the route and falls back to its target, losing the actual position. | Capture current position/facing/height before clearing accepted work and retain it as a free standing position. Saved physical positions preserve legal doorway coordinates; new destinations keep existing bounds/padding. Eight `audit-r4-wake-route.test.mjs` cases cover route fractions, ordinary asleep wake, normalization and the actual Behavior interaction/restart/deduplication path. No new goal is invented. |
| R4-5 | A failed poster load reaches invalid diagnostic fields in video fallback, which can leave its Promise unresolved. | Remove the invalid diagnostic. Install seek/timer handling before changing time; every completion clears its owned listener/timer and settles once. The photo suite covers poster failure, synchronous/asynchronous seek, timeout and throw using fake media. No claim that every ordinary photo previously failed. |
| R4-6 | A pending opinion from cast A can publish during later cast B. | Bind the original native Room request to cast generation, stream and AbortController; cancel on stop/source/follow/visibility changes and recheck ownership before publication. Ten `audit-r4-cast-lifetime.test.mjs` cases cover stale success/error/finally, live B ownership and explicit manual behavior. Existing cadence, roles and native permissions remain. |
| R4-7 | Reinstall from another path can inherit a Memory service entry pointing at an old checkout. | Before Python probing, clear proven managed/current/prior installed entries in favor of the installed shim. Recognize an old checkout only with package identity and matching shim/provider bytes. Unknown inherited entries fail closed with explicit `--memory-service-entry bundled` or a deliberate existing absolute custom path; never silently execute/discard an unknown path. Twelve `audit-r4-memory-entry.test.mjs` cases run the actual installer configuration block with host boundaries mocked. The shipped portability guide explains the one-time choice; Bank/identity are unchanged. |
| R4-8 (P3) | Speech-rate validation removes the negative sign before checking its declared bounds. | Adapt only the original signed parse in the build adapter, preserving `-50%..+100%`. Eight `audit-r4-voice-rate.test.mjs` cases invoke the emitted service with fake synthesis at both boundaries, outside them and with malformed input. These are provider contract checks, not a new product rate policy. |

The r4 review also identified an uninstantiated `LifeLibrary` compatibility
surface. Source callers confirmed only an obsolete test used it. Delete that
duplicate class and its unused fixed-schedule validator, retaining the existing
Life preferences parser. The album regression now exercises the current Core
`CompanionRecordLibrary`, including reopen/delete behavior and canonical diary
records. Existing legacy paths, photos and records remain supported. The archive
check rejects both retired exports; no parallel archive implementation is kept.
Unconfirmed r4 risks were not turned into new permission policy or a replacement
recovery runtime; its report states the relevant limits.

The r5 package-only review of frozen `e16e6d9e8a70` confirmed one P1 and two P2
findings, so that candidate did not pass review. Its unchanged
[report](../../.cache/audit-r2-repair-20261113/independent-review-r5/report.md),
[inventory](../../.cache/audit-r2-repair-20261113/independent-review-r5/inventory.json)
and independent fixtures are retained together. The parent rehashed the archive
and all 922 original and extracted members. Coverage was 115 full reads, seven
partial, 372 syntax-only, 199 index-only and 229 unread media; 482 syntax checks
passed. These are separate coverage categories, not a claim of complete review.

| ID | Independently identified fault | Repair and regression evidence |
| --- | --- | --- |
| R5-1 (P1) | Offline backup/restore trusts the configured Memory path and misses a live writer in the actual current Repo Bank. | Reuse `inspectRepoBinding` and `boundMemoryDirectory` to validate current ready Core/storage identity and select the actual Bank. Exclude stale unrelated external Banks. Each original offline gate rechecks the binding/selection and uses the original `assertStopped` on affected Memory owners, including retained default/custom Banks when Memory is unconfigured. Limit retained-owner discovery to Memory namespaces/Bank structures/provider markers, not arbitrary same-named attachment files. Twelve `audit-r5-backup-memory.test.mjs` cases cover both create/restore gates, changed selection, retained owners, unrelated data and stopped recovery. Existing trusted-inventory, fingerprints, journal preservation and missing-data refusal remain strict. |
| R5-2 | A paused Body receives an already advanced Economy garden and only then changes its timestamp, committing paused growth. | Pass Body's existing passive admission into the original Economy projection/action before pure growth. Settle the active interval at pause with the existing checkpoint; retain explicit enabled-restart `restoreElapsed`. Economy settings await the original Body snapshot before settling old rates, then recheck scope/cancellation. Sixteen `audit-r5-garden-clock.test.mjs` cases cover reads/manual work/settings, pause/restart/resume, enabled time, stale CAS/duplicate transactions and cancellation. No new clock, persistent field or economic authority. One existing fake port now forwards the optional parameter; its original assertions remain. |
| R5-3 | Prepare-only or failed setup overwrites the current installed receipt with planned paths; backup accepts it. | Keep evolving receipts beside each prepared Bundle. Pre-install refusal preserves the completed receipt byte-for-byte. Immediately before package CLI mutation, retain those old bytes and atomically publish an explicit `applying` marker; only verified completion publishes installed bindings. Backup rejects prepared/applying/incomplete receipts before Core/process probes, while installed-but-disabled remains valid. Fifteen `audit-r5-install-receipt.test.mjs` cases execute the real installer suffix/backup admission with fake host boundaries and real temporary files, covering prepare, failures, successful publication and failed final rename cleanup. This is setup metadata, not a revived Core execution receipt system. |

The r5 report's incidental description of the large original model as an unused
backup was corrected by inspecting the actual quality selector: `app.js` passes
the selected `MODEL_URLS` into `ModelActor`, and the high-quality button requests
the source GLB. Both GLBs remain required runtime assets. Three shipped model/
privacy/notice documents now distinguish default 2D, standard optimized 3D and
optional source quality; the replacement instructions follow the real URL seam.
Current adaptation hashes are updated without changing upstream pins, license
text or media. The raw independent report is unchanged. Plan/trial headers now
link to the current handover instead of advertising superseded candidate IDs.

## Verification protocol and limits

Use `source ./scripts/env.sh`. Existing local TypeScript and build scripts are
the toolchain. `pnpm` 11 defaults to installing out-of-sync dependencies before
`exec/run`; this task disables that behavior for code checks using the temporary
environment variable `pnpm_config_verify_deps_before_run=false`. No global config
or toolchain was changed. The initial accidental metadata-resolution attempts
were interrupted with zero packages downloaded/added; they are not counted as
successful checks. Explicit `--lockfile-only --ignore-scripts` then resolved the
new dependency metadata/integrities with zero packages downloaded/added. It did
not install a module, Electron, DSH or a plugin, and ran no dependency hooks.

Tests use temporary directories, fake process/HTTP/media/model/channel boundaries
and inert sentinels. No real model, account, microphone/window or personal
workspace/profile is used. Static/read/fixture evidence is separate from owner
acceptance. `pnpm run test:life-integration` includes the prior 209 cases and all
new cases; the per-review `test:audit-r2`–`test:audit-r5` commands select their
respective subsets. Clean build
still removes retired compiled output before packaging.

Final type check and clean build passed. `pnpm run test:life-integration`
passed **392 code tests** (111 plus 281), zero failures/skips; **183 regressions**
are new this turn: 49 for R2-1–R2-6, 27 for r3, 64 for r4 and 43 for r5
(12 Bank safety, 16 garden clock, 15 setup/receipt).
The original archive case now checks Core instead of the unused Life duplicate;
the earlier cast-boot fixture includes the real cancellation helper and retains
its existing assertions. `test:audit-r2`, `test:audit-r3`, `test:audit-r4` and `test:audit-r5`
select the respective new suites. Final logs are `integration-final-r5.log` and
`types-final-r5.log`; the frozen source/test receipt is
`.cache/audit-r2-repair-20261113/source-test-receipt-release.json`.
No real environment acceptance is implied by these counts.

The final frozen archive is
`.cache/audit-r2-repair-20261113/release-package/dsh-Chatpet-candidate-49745acd50d2.tgz`,
126,029,974 bytes; SHA256
`49745acd50d2828f16aa10ccf3128acaacdf00d5885f9fc3b0e773a6ccf026d7`.
It supersedes uninstalled `e16e6d9e8a70`, `0e3ee288c64e`, `ff5d8145f06a` and `49427e59f5c3`. Final archive checks
passed: 922 members, 252 build files, 42 directly shipped first-party/helper
files, 261 vendor digests, six source-only origin entries, 542 local runtime/
resource references, 11 local Markdown references and 43 declared external-import
occurrences. Relocated Core/bootstrap, never-configured Memory resume, Body/
plan/Economy and actual Python MemoryPort fixtures pass. Retired Core and draft
contract output remains excluded. No installation is authorized or performed.

A new `fork_turns=none` r6 agent reviewed only a neutral copy at
`/private/tmp/companion-package-independent-review-20261113-r6/candidate.tgz`.
It received no prior findings, development history or test results, and read only
the archive/extracted files. It used independent static checks and isolated local
fixtures, without package hooks, apps, repository, personal data, installed hosts,
skills/memory or network. This is instruction isolation, not a separate OS
filesystem sandbox. Its final verdict is **four new P2 and one P3; audit not
passed**. These new findings remain unrepaired in the frozen candidate; the 392
passing code tests do not cover every possible behavior or supersede this verdict.

## Final r6 review and unresolved findings

The unchanged [report](../../.cache/audit-r2-repair-20261113/independent-review-r6/report.md),
[inventory](../../.cache/audit-r2-repair-20261113/independent-review-r6/inventory.json)
and its independent fixture scripts/results are retained together. Coverage:
133 full reads, 18 partial, 350 syntax-only, 272 index-only and 149 unread media.
All 482 JS/Python syntax checks passed; 78 PNG/two GLB checks concern container
headers only. No rendered/media/host/installed acceptance is claimed. The parent
independently rehashed the archive, all 922 archive members and all 922 extracted
members; they match the auditor's start/end values. No package/source change
was made after the verdict, only these source-only status records.

| ID | Open finding and confirmed code boundary | Regression required for a subsequent repair |
| --- | --- | --- |
| R6-01 (P2) | `console/settings` profile/identity requests do not carry an expected workspace/storage binding. Equal original content/revision lets an old A owner form save into current B. | Two simultaneous owner forms with equal/blank originals; after binding B, reject A's old profile/identity save and retain B's bytes. Preserve explicitly unbound local identity editing. |
| R6-02 (P2) | Native Memory chat context/materialize/recall/detail omit the connection's existing expected-Bank guard. A→B→A can pass current-scope equality while the singleton connection remains B. | Delay an actual A recall, switch connection to B and binding back to A, then reject every wrong-Bank call/publication/source write. Real DSH scheduling remains separate from the audit's method-level fixture. |
| R6-03 (P2) | Emotion permits a valid UTF-8 serialized state larger than its own 262,144-byte read limit, replaces the old state and then cannot read/update it. | Oversized multibyte feelings/dependencies must be rejected before replacement, retaining prior bytes/revision/hash; boundary-valid states remain readable and editable. |
| R6-04 (P2) | Native garden stops refresh polling with `onChanged`, but natural crop changes have no deadline/event when no body or accepted care boundary exists. | A visible garden with sleeping companion/no job still refreshes natural growth/maturity; hidden/minimized/locked views remain stopped. Do not add model calls, new goals or automatic harvest. Actual window behavior still needs owner testing. |
| R6-05 (P3) | Saving one Channels section resets the entire draft from the server, discarding unsaved edits in another section. | Preserve unsaved WeChat/bridge edits while saving QQ, and vice versa; explicit whole-page reload handles discarding deliberately. |

The audit's issue fixtures successfully reproduce defects; their result is not
a functional pass. They are evidence, not newly passing production regressions.
Conditional observations about indirect forgotten-text repetition, optional
upstream `waterfall`, provider cancellation and scale remain explicitly separate
in the raw report; they do not authorize restoring retired dependency machinery
or adding new product policies. The frozen archive is a review candidate, not a
claim of release readiness. Installation remains prohibited in this task.

## Owner-run checks after a later authorized installation

These procedures have not been run; use disposable companions/accounts and
retain real records. The original U01–U16, I01–I10, R01–R04 and A01–A08 also remain
owner-run and unaccepted in this task.

| ID | Procedure and expected observation | Status |
| --- | --- | --- |
| B01 | After a successful Memory start in a test companion, terminate its owned test service and request recall again. Recover the same Bank without creating a second unresolved writer. | Not run |
| B02 | Edit “我是谁” from two forms opened at one revision. Only one old-revision save succeeds; the other preserves its draft and reports conflict. | Not run |
| B03 | In a disposable Repo only, introduce an abnormal linked Life log. Refuse/preserve it without changing its target; after repair, ordinary logging continues and retains any gap report. | Not run |
| B04 | Delay microphone permission or transcription, hide/new/rebind the compact chat and reopen. No old text/error enters the new draft; inactive recording resources are released. | Not run |
| B05 | Start a slow automatic whisper/dream or pending todo reminder, then save quiet=true. No late proactive output; explicit manual whisper and owner chat stay available. | Not run |
| B06 | On a clean test device with declared optional dependencies and no Electron cache, request a desktop body. Verify original preparation or a concrete failure; test the configured-runtime path separately. | Not run |
| B07 | Inspect Memory capability text, blank foundation, canonical record paths and Emotion behavior after Bank withdrawal. Confirm the current guide and shipped local links match the interface. | Not run |
| B08 | Move a disposable never-configured-Memory companion without providing Python; separately test a declared Bank with a missing file. The former resumes without inventing a Bank; the latter is refused and preserved. | Not run |
| B09 | On a disposable long-lived save, verify continued Body/Room notifications and duplicate-operation recovery after restart. Actual long-term file growth and power still require measurement. | Not run |
| B10 | Queue Room speech behind slow synthesis, then close the window. The queued cancelled text is never newly submitted; already submitted provider work remains subject to that provider's capabilities. | Not run |
| B11 | Enable the owner bridge and pause/unload Life. Verify bridge remains available; explicitly disable bridge or stop Channels and verify withdrawal. | Not run |
| B12 | In the garden, use each of the seven companion buttons. Verify each reaches the existing Body action or gives its normal concrete response, with no duplicate effects. | Not run |
| B13 | Photograph near-target standing, sitting and lying snapshots with different heights in supported actor modes. Compare photo pose/location to the same saved Body; ordinary live movement still interpolates. | Not run |
| B14 | Open Room directly with fresh and saved 3D preferences; use quality before changing view mode. Verify one intended change per click and correct initial label. | Not run |
| B15 | Ask her to sleep, then wake her at different points on the walk, including a doorway. She stops at the actual position, continues consistently after restart and retains normal bedside wake behavior. | Not run |
| B16 | In a disposable media fixture, make the selected photo poster unavailable. Video fallback completes or reports its concrete failure without an indefinitely pending photo request. | Not run |
| B17 | With a deliberately slow TV-opinion provider, request on cast A, stop/change source and start B. No A result/error appears in B or clears B's busy state; manual opinions retain their normal behavior. | Not run |
| B18 | Reinstall a disposable profile from a new download location with a prior managed Memory entry, then with an unknown custom entry. The former selects the installed shim; the latter requires the documented explicit choice. Retain the same Bank/identity. | Not run |
| B19 | With a disposable speech provider, check signed rate bounds and explicit rejection outside them; listen separately for actual provider behavior at accepted settings. | Not run |
| B20 | Use the current Core album/review entry to open retained photos/diaries, restart and delete a disposable record. No second Life archive appears and legacy canonical records remain reachable. | Not run |
| B21 | With a disposable companion, verify stopped backup/recovery uses the Bank reported by current Core rather than a stale configured external path. A retained live Memory owner must cause refusal before copying/replacement; do not run this against personal data. | Not run |
| B22 | Pause Life with an immature crop, leave time between observations, perform manual care and edit economic settings, then resume/restart. Paused time neither grows nor dries the crop; enabled time and explicit admitted offline continuation still follow configured rules. | Not run |
| B23 | Prepare another Bundle without applying it and compare the completed receipt bytes. It stays current; the planned receipt is separate. After a later authorized successful update, inspect the new actual binding; incomplete/applying receipts cannot be used as completed backup authority. | Not run |
| B24 | Enter standard 3D and explicitly switch to high quality. Each selects its documented GLB; assess actual load/render/resource behavior separately from file sizes and code fixtures. | Not run |
