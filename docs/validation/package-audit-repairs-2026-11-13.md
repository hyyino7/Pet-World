# Package audit repairs, 2026-11-13

This is the historical first-eight repair and second-audit record. The owner
subsequently authorized its six new findings; their repair/testing/current
candidate are tracked in the [round-two repair record](package-audit-round2-repairs-2026-11-13.md).
The old archive and original independent report remain unchanged.

## Authorization and evidence boundary

The owner requested verification and repair of all eight findings in the first
independent package audit, regression tests, a rebuilt package and a new clean
read-only package audit. Do not install this candidate. Installed functional,
resource-use and acceptance testing belongs to the owner.

The first report and unchanged inventory are retained under
`.cache/blind-package-audit-20261113/`. The pre-repair text-file baseline, dirty
Git patches, red tests and current code-test logs are retained under
`.cache/audit-repair-20261113/`. A huge pre-existing dirty tree is preserved;
the complete Git diff is not a diff for these eight repairs alone.

## Verified findings and repairs

| ID | Verified defect | Repair and regression evidence |
| --- | --- | --- |
| F1 | Default external bootstrap Core could not initialize because the Repo inventory unconditionally required a database that only the later stopped migration could copy. | Declare only the actual Core location or an already promised portable Core. Document readiness can precede storage completeness. Reuse stopped migration to copy the same Core and atomically finalize its manifest; declaration failure is retryable. An initialized identity manifest prohibits manufacturing a missing empty Core, including the interrupted migration window. `first-install.test.mjs`: actual installer configuration prefix with mocked host boundaries, public initialization, failure/restart, real SQLite relocation, declaration failure and missing-data guards. |
| F2 | Deferred transcript export reselected the current workspace and could drop A's tail or assign B's storage identity after rebinding. | Capture original root, managed-directory identity, workspace, storage ID, membership and channel scope. Export the original native log to that captured Repo; reject replaced directories or conflicting retained identity. `audit-transcripts.test.ts`: delayed A/B exports, rebind during read, registry disposal, root and managed-directory replacement. |
| F3 | The export batch cleared every ID, then abandoned later IDs after its first failure. | Remove each item only after success, continue other items, retain newer captures, retry automatically at most three times with delayed wakeups and warnings, and retain failed work for explicit flush/restart recovery. Close stops the timer and waits through a concurrent export barrier. Same test file covers partial failure, new events during export, bounded retries and final concurrent flush. Native logs remain the recovery authority; abrupt termination is not an atomic portable-copy guarantee. |
| F4 | Awaited todo imports/session creation could use a new binding's store or association key. | Capture id/path/storageId; validate after asynchronous boundaries; keep the original TodoStore and original association key; publish/save session association only after native Agent membership validation. `audit-desktop.test.ts`: POST/PATCH/DELETE, same path with changed storage ID, delayed prepare/create/resolve and closed-view completion. An already accepted original-store write cannot be redirected to B. |
| F5 | QQ dedupe was committed before the volatile quiet batch or native admission, so a restart could permanently lose input. | Checkpoint raw pending input and a frozen batch in existing channel-received records, using the original platform identity and actual native message ID. Extend the existing QQ home at its one submission seam; reconcile against native logs/inbox without allocating a new session. Revalidate scope/account/allowlist/owner authority, retain unknown outcomes, and drop temporary message bodies after admission. Reuse recorded V2 wake decisions without spending quota again. `audit-qq-recovery.test.mjs`: quiet/receive/home interruptions, stable-ID retry, native flush/read/inbox uncertainty, routing/authority changes, guest restart, uncertain external send and wake-quota reuse. Old dedupe-only rows contain no recoverable body and are never guessed/replayed. |
| F6 | Whisper and sleep-talk generation ignored the saved background duration despite the settings promise. | Preserve the original one-request generator; combine the saved duration, existing 30-second generator limit and lifecycle abort. Normal owner native conversations retain DSH execution. `audit-desktop.test.ts`: hanging fake streams for whisper/sleep talk, rebind abort and owner non-cancellation. No extra native chat or Memory writer is introduced; provider billing still applies to submitted work. |
| F7 | A failed platform hide prevented chat/child/timer cleanup; an asynchronous settings close could reject unhandled. | Synchronously invalidate/close the chat projection and clean timers before awaiting hide; catch event-triggered rejection. Same desktop tests cover hide failures in both lifecycle orders and late completions. |
| F8 | Garden switch/help claimed automatic sowing/harvest/sales/restocking even though this runtime accepts only planned/requested goals. | Describe the stored garden preference consistently in the actual served UI, including accessible label, title, status and help. Planned-mode control receipts describe that preference. Preserve original execution and explicit work; do not add an automatic garden planner. `audit-garden-ui.test.ts` executes the complete served module with a fake DOM and actual click handlers, then exercises actual Behavior/caretaker persistence to verify no automatic task and no cancellation of requested work. |

## Code verification

`pnpm run check:types` and `pnpm run test:life-integration` run through the
repo-local toolchain. The latter includes all new regression files and the
existing autonomous Life/Core/Memory/Emotion/Body/Economy/Desktop/Room and storage
checks. `desktop-work.test.ts` additionally verifies the original work chain;
its fixture now supplies the raw saved configuration for revision comparison.
Use `pnpm run test:audit-repairs` for only the eight-finding regression set.

All tests use disposable directories and fake host/model/channel boundaries.
The installer test executes its configuration prefix with mocked host effects;
the actual installer is not invoked. No installed app, Electron window, real
model, network account or personal workspace is exercised.

The archive check verifies excluded legacy outputs, current build bytes,
resource/import closure and vendor digests, then runs relocated packaged Core,
external bootstrap initialization, Body/plan/Economy and Python MemoryPort code
against disposable data. This is code validation, not installed acceptance.

Final source checks passed: **208 integration tests plus one Desktop work-chain
case**, zero failures/skips, including **42 new eight-finding regressions**.
Types and clean build passed. Archive checks passed: 922 members, 252 current
build files, 261 shipped vendor digests and 542 local resource/import references.
Six known origin entries are intentionally source-only. The extra bootstrap
archive fixture uses canonical macOS temporary paths; its initial harness-path
failure was corrected without changing the candidate.

Frozen candidate:
`.cache/audit-repair-20261113/final-package/dsh-Chatpet-audit-repaired-49427e59f5c3.tgz`,
126,019,853 bytes; SHA256
`49427e59f5c37869daa746fed6da92940bc84f9353791f72a409d9eb04f34da2`.
The independent package-only review is complete and **does not pass the final
audit**: it identified six additional P2 findings and one P3 documentation group.
The original F1–F8 repair matrix remains supported; the new findings are distinct
and are not silently marked repaired. No installation has occurred.

## Independent package-only review result

A new `fork_turns=none` agent received only a neutral archive copy. It received no
old findings, development history or test results, and used no repository,
personal files, installed host, network or package-code execution. Its raw
[report](../../.cache/audit-repair-20261113/independent-review/report.md) and
[inventory](../../.cache/audit-repair-20261113/independent-review/inventory.json)
are preserved unchanged. It fully read 163 files, partially read nine, and parsed
all 482 JS/Python files without syntax failures. Large dependency algorithms,
physical media and installed acceptance remain explicitly outside that coverage.
All 922 extracted member hashes and the archive hash matched before/after; the
parent independently rechecked the 922 member hashes and the frozen archive.

The new report uses its own local F1–F6 numbering. To avoid confusing them with
the original eight, this record calls them R2-1–R2-6:

| ID | New finding | Evidence and current disposition |
| --- | --- | --- |
| R2-1 | Memory keeps a stale client after its owned child exits, so the same binding cannot recover on demand. | Static chain plus parent disposable code fixture confirms `start()` resolves while lifecycle is stopped and stale client remains. No process or network was used. Not repaired in this eight-finding delivery. |
| R2-2 | Concurrent owner self-description saves can both accept the old revision and overwrite each other. | Static asynchronous CAS interleaving; no runtime reproduction yet. Not repaired. |
| R2-3 | Dynamic Life JSONL paths and predictable temporary writes lack final-file link guards. | Static chain plus parent disposable fixture confirms `appendWake` follows a symlink to a target outside the disposable Repo, still wholly inside the temporary fixture. No personal data was accessed. Not repaired. |
| R2-4 | Hiding the compact chat does not invalidate asynchronous microphone/transcription work; late text can enter a newer draft. | Static UI/helper lifecycle chain; no actual recording or window test. It does not claim the text is automatically sent. Not repaired. |
| R2-5 | Saving quiet mode does not stop an already running automatic whisper from publishing later. | Static generation/refresh/publication chain; no provider call. Distinct from the repaired F6 duration limit. Not repaired. |
| R2-6 | Electron automatic download imports two undeclared dependencies. | Conditional clean-environment dependency-contract gap; not proof that an existing DSH installation fails. No download/install was performed. Not repaired. |

The P3 group concerns stale Memory switch/default/self-path descriptions,
Emotion-linked-material claims, source notices and source-only document links.
It is not authorization to restore the retired whole-chat eligibility/dependency
executor or to turn continuing Emotion into a Memory projection. Any later
repair must preserve the selected native/runtime boundaries and distinguish
document correction from a new product decision.

Parent reproduction evidence is retained in
`.cache/audit-repair-20261113/review-memory-recovery-reproduction.json` and
`review-life-file-boundary-reproduction.json`. These observations supplement the
unchanged static report; they are not installed acceptance. The source and
candidate remain frozen after the final 208+1 passing regressions. The additional
findings explain why those passing tests do not establish a clean package.

## Owner-run acceptance after a later authorized installation

These are proposed acceptance procedures. None has been performed in this task.
Use disposable test companions/accounts where needed; preserve real records.

| ID | Procedure | Expected result | Status |
| --- | --- | --- | --- |
| A01 | In a fresh test profile, bind/initialize; inspect storage, then finish the documented stopped migration. | One companion identity; ready documents before complete storage; the same Core after migration; no blank replacement on missing-data errors. | Not run |
| A02 | Finish a native chat in A, switch quickly to B, restart and inspect A's portable history. | A keeps its completed tail and storage identity; B has no A history. | Not run |
| A03 | With disposable data, make one export temporarily unavailable, create another chat, then restore access/restart. | Failure is visible; other sessions export; originals recover without truncation or duplicate turns. | Not run |
| A04 | Submit a todo/open chat while changing binding, including rapid close/reopen. | No content or association from the cancelled A operation is written to B. | Not run |
| A05 | In an authorized QQ test chat, restart before the quiet batch submits; also inspect a deliberately ambiguous gateway/native result. | One original input is admitted at most once; pending/unknown status remains visible; no authority promotion or uncertain reply resend. | Not run |
| A06 | Set a short saved background duration, allow whisper/sleep talk and close or rebind during a slow request. | Effective duration/lifecycle cancellation is respected; ordinary owner chat continues under native DSH limits. | Not run |
| A07 | Close/disable the Pet with its platform already stopping; reopen. | No stale chat window/timers or unhandled rejection; normal later opening succeeds. | Not run |
| A08 | Inspect and toggle the garden preference with Life enabled and disabled; start a requested garden action. | Copy describes saved preference; toggling does not create an automatic task or cancel planned/requested work. | Not run |

The existing [autonomous-life owner trial](../handover/autonomous-life-owner-trial.md)
remains the owner of U01–U16 and I01–I10, including long-term continuity and actual
CPU/memory/GPU/wakeup measurements. Passing this repair matrix does not replace it.
