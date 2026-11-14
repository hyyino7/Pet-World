# R6 package-audit repairs, 2026-11-13

## Scope and authority

The owner authorized verification and repair of R6-01–R6-05 (four P2 and one P3),
documentation correction, code regressions, repackaging and a fresh no-history
package-only review. **Do not install.** Installed functional, model/provider,
media, portability and power acceptance belongs to the owner. The
[native-service plan](../planning/native-service-refactor.md) owns module/data
boundaries. The unchanged [r6 report](../../.cache/audit-r2-repair-20261113/independent-review-r6/report.md)
and [inventory](../../.cache/audit-r2-repair-20261113/independent-review-r6/inventory.json)
describe the previous frozen, uninstalled `49745acd50d2` candidate. Its prior
repair history is in the [round-two record](package-audit-round2-repairs-2026-11-13.md).

The pre-task baseline contains 840 text files plus dirty Git status, staged and
unstaged patches and revision metadata under
`.cache/audit-r6-repair-20261113/baseline/`. Preserve unrelated changes. Keep the
retired Core activity/receipt/whole-chat eligibility/dependency executor and
duplicate Life archive removed. DSH owns conversations; the existing Memory,
Emotion, Body and Economy owners retain their data. No new runtime, schema,
parallel Memory, garden clock or mandatory activity schedule is authorized.

## Verified findings and repair boundaries

| ID | Verified trigger | Selected repair and verification |
| --- | --- | --- |
| R6-01 (P2) | Two owner views retain equal original profile/identity revisions; binding changes from A to B before the old view saves. | Explicit `WorkspaceEditScope` uses the existing preferences revision, workspace ID and storage ID; the original synchronous Core write rejects missing/old scope. No fallback to the current binding. Explicitly unbound identity editing remains. Settings snapshots check the scope across awaits, and same-page conversation-setting acknowledgements advance only their matching editor scope. Fourteen new cases: ten actual Core/RPC/storage cases in `audit-r6-binding.test.ts`, four actual UI payload/acknowledgement cases in `audit-r6-channel-drafts.test.mjs`. The initial seven domain cases all failed on the baseline. |
| R6-02 (P2) | An A Memory operation waits while the singleton connection moves to B and binding returns to A. | `prepare` captures an ephemeral Memory binding from existing workspace/path/storage ID/preferences revision. Recall/detail/materialize/capture/archive and the original summary/compaction path pass the existing expected Bank. The connection checks captured client/scope/liveness after provider return; binding is checked before source writes/context publication and again after the native next-middleware await. Ordinary native chat continues without invalid recall. Nineteen `audit-r6-memory-scope.test.mjs` cases: 15 failed/four passed on baseline, all pass after repair; existing IDs, acknowledgement retry, off-period rules, guest sharing and withdrawal remain. No whole-chat admission gate or new state field. |
| R6-03 (P2) | Individually legal feelings/references/dependencies serialize above the canonical Emotion reader's byte limit, replacing the old readable state. | Serialize once and enforce the same 262,144-byte UTF-8 limit before creating/replacing the canonical document. Preserve CAS, old bytes, identity and legacy source. Eight `audit-r6-emotion-size.test.mjs` cases cover multibyte/escaped/combined input, exact and over-limit bytes, reopen/edit and oversized legacy adoption; baseline six fail/two pass, repaired eight pass. This is the existing storage bound, not a new feeling policy. |
| R6-04 (P2) | Native Room has `onChanged`, no accepted care/body deadline and a naturally changing crop, so one successful garden read leaves an indefinitely old view. | Reuse one existing visible refresh timer. Native moist immature plots use the prior 15-second compatibility cadence; empty/mature/dry native views remain event-driven. GET/act/control share scheduling so a manual transition also refreshes without requiring an event. Ticket/visibility guards reject late read/write presentation; accepted work is not claimed undone. Twenty-three actual-client/fake-clock cases in `audit-r6-garden-refresh.test.mjs`: baseline 16 fail/seven pass, repaired all pass, plus 23 older Room/presentation cases. No new growth authority, model wake or automatic harvest. |
| R6-05 (P3) | Saving one Channels section resets the whole draft from a complete server snapshot. | Confirm only the submitted section if it has not been edited again; retain unrelated/newer edits. An explicit discard label identifies whole-page reload, and typing after that click is retained. Nine actual component/request-seam cases in `audit-r6-channel-drafts.test.mjs`; the initial seven had five failures/two passes. All pass after repair, without a browser or account. |

Examples in fixtures do not define activity rules, fixed crop durations or
device resource acceptance budgets. Six older test files were updated only to
provide the explicit editor scope or use actual NativeMemory with a fake provider;
their original permission, retry, withdrawal, idempotency and preservation
assertions remain. No previous case was dropped.

## Source and package results

Types and clean build pass. `pnpm run test:life-integration` passes **465 code
tests** (111 plus 354), zero failures/skips; **73 new regressions** cover the
five findings (14 scope, 19 Memory, eight Emotion, 23 garden and nine drafts).
`pnpm run test:audit-r6` selects these cases. Logs are under
`.cache/audit-r6-repair-20261113/`; agent frozen hashes and the final source/test
receipt retain exact bytes. An early unbounded Emotion assertion-formatting run
was interrupted and is not verification evidence; bounded hash assertions
produce the red/green results above, followed by the full clean-build run.

The actual `./client` export is the generated Desktop carrier, not just the
readable Console source. After building, the current settings factory is
embedded exactly once; the same 13 UI scope/draft cases also pass against
functions extracted from that actual carrier. These repeat tests are reported
separately, not added to the 73 unique new cases. No UI/renderer was launched.

Frozen candidate, **not installed**:
`.cache/audit-r6-repair-20261113/package/dsh-Chatpet-candidate-4474a5bc6533.tgz`;
126,033,632 bytes, SHA256
`4474a5bc65337416e24dbdedaf0ff759aaecc9089be7c38689f3a4736fea293d`.
It supersedes uninstalled `49745acd50d2`. Archive checks pass: 922 members,
252 build files, 42 directly shipped first-party/helper files, 261 vendor hashes,
six source-only origin entries, 543 local runtime/resource references, 11 local
Markdown targets and 43 declared external-import occurrences. Relocated
profile/identity stale-scope rejection/current-scope success, Core/bootstrap,
never-configured Memory resume, actual Room routes, Body/plan/Economy and the
socket-blocked Python MemoryPort fixtures pass. Retired Core/contracts, duplicate
Life archive exports, development tests and build-only adapters remain excluded.
Adapted garden hashes/treatment are current; upstream pins/licenses are retained.

Healthy native visible moist-immature gardens make at most four periodic reads
per minute after the initial read, plus actual events/owner actions. The existing
failure backoff remains five seconds. The view lacks a passive-Life marker, so a
visible paused but moist immature crop has the same read bound. ETA values never
control this cadence; zero/tiny/invalid ETAs cannot create a busy loop. Hidden,
minimized, locked and disposed views stop the timer/read lifetime. These are
fake-clock code bounds, not measured CPU/GPU/memory/wakeup or installed claims.
No polling frequency is promoted to a mandatory product-life schedule.

## Verification and acceptance separation

Use `source ./scripts/env.sh` and
`export pnpm_config_verify_deps_before_run=false` for repo-local code checks;
do not let pnpm install modules as a side effect. Tests use disposable files,
SQLite, fake provider/process/media/DOM/clock seams and actual production code.
Do not run live-model, installed-window, account, personal-workspace or installer
workflows. A clean build must precede packaging so retired outputs remain absent.
Archive checks cover relocated code, resource/dependency closure and unchanged
source/vendor bytes; they do not establish installed compatibility or low power.

The fresh r7 independent reviewer received only a neutral frozen archive at
`/private/tmp/companion-package-independent-review-20261113-r7/candidate.tgz`, with
no previous findings, repair/test results or repository context. This provides
instruction isolation, not an OS-enforced filesystem sandbox or formal
double-blind experiment. Its coverage and before/after hashes must accompany the
verdict. Passing regressions, independent findings and owner acceptance remain
three separate results.

## Final independent r7 verdict

The [raw report](../../.cache/audit-r6-repair-20261113/independent-review/report.md),
[inventory](../../.cache/audit-r6-repair-20261113/independent-review/inventory.json)
and [parent receipt](../../.cache/audit-r6-repair-20261113/independent-review/delivery-receipt.json)
are retained with all independent fixtures/results. The review confirmed **two
new P2 findings**, no confirmed P0/P1/P3. **Final audit not passed.** These are
new findings, not unrepaired R6-01–R6-05; they remain open in this archive.

| ID | New open finding | Evidence and subsequent code regression scope |
| --- | --- | --- |
| R7-01 / P2-01 | Ordinary Pet's desktop helper and actual web carrier retain a recorder controller that accepts late microphone startup after chat disposal. | Normal added-body L/M/menu and web overlay paths reach the original controller. Both actual methods in isolated VM fixtures become recording after dispose with no recorder cancellation. Cover delayed permission/initialization, close/dispose, immediate release of late resources, normal recording and both actual carriers. Compact/Room use another updated control and are outside this new finding. No actual microphone or audio transmission was tested. |
| R7-02 / P2-02 | QQ private/V1 empty-body fallback sends an internal reply-nudge source that Core/guest admission rejects. | Actual `createQqHome`/`askTurn` and native pre-step fixtures reproduce the incompatible source. Cover original delivery/session-bound permission, owner/guest private and V1, V2/silence, cancellation and binding/allowlist changes. Preserve the existing single-nudge path; do not globally trust an arbitrary kind string. Whether real DSH omits a matching admission event and holds the queue until its ten-minute timeout remains a conditional host inference, not an observed result. |

Coverage is 138 full reads, 18 partial, 351 syntax-only, 186 index-only and 229
unread media members (26,851 semantic lines). All 500 parsing checks passed:
297 JS/CJS/MJS, 185 Python AST and 18 JSON. The reviewer used Node 22/Python 3.9,
so these do not replace the repo-local Node 24 code run or real DSH acceptance.
Ninety Room resource responses and 141 catalog paths were checked without a
server/window; resource existence is not media/visual acceptance. The parent
independently rehashed the tgz and all 922 archive/extracted members against the
start/end inventory: unchanged. No package/production-source changes followed
this verdict, only source-only delivery documentation.

The 465 passing regressions and 13 repeated carrier checks support the completed
repair batch. The new defect fixtures demonstrate failures; they are not added
to the passing regression count. Real installation, supported-host scheduling,
media/provider behavior and power remain unaccepted. The frozen candidate is
not described as release-ready. No installation was performed.

## Owner-run checks after a later authorized installation

All procedures are **not run**. Earlier U01–U16, I01–I10, R01–R04, A01–A08 and
B01–B24 remain owner-run as documented in the linked earlier records.

| ID | Procedure and expected observation | Status |
| --- | --- | --- |
| D01 | Open two owner settings views over disposable Repos with identical original profile/persona. Switch the current binding in one view, then save the other view's old draft. It reports a binding conflict and preserves both B's saved bytes and A's local draft. Also check explicit unbound identity editing. | Not run |
| D02 | With a deliberately slow test Memory provider, change workspace/Bank during recall, detail or compaction and return to A. No B material or source acknowledgement enters A; an unavailable/stale recall does not block ordinary native chat. | Not run |
| D03 | On disposable Emotion data, submit an oversized legal multibyte payload. It is refused while the prior feeling remains readable/editable; normal updates and restart keep the state. Do not damage personal files to perform this check. | Not run |
| D04 | View a naturally growing garden while the companion sleeps or waits with no care job. Growth/maturity refreshes; hide/minimize/lock stops reads and showing it obtains a fresh state. Check actual request frequency/power separately; no model call or automatic harvest should be introduced. | Not run |
| D05 | Edit WeChat/bridge without saving, then save QQ; reverse the order and edit while a delayed save is pending. Unsubmitted edits remain until deliberately saved or discarded by explicit refresh. Switch binding to verify old data/results do not enter the new view. | Not run |
