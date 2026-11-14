# Life design implementation and R7 repairs — 2026-11-14

This record preserves the pre-media `ca07b0e1d631` checkpoint. Subsequent owner
confirmation and delivered supplementary media are owned by the
[media record](life-media-2026-11-14.md); its candidate supersedes this checkpoint.

The owner authorized repairing the remaining two P2 findings, correcting channel
registration/TV test compatibility, implementing the confirmed life design and
repeating isolated verification. No formal installation, personal workspace
mutation, commit or publication is authorized. Historical archives/reports are
retained. This record owns code/service verification, not visual or installed
owner acceptance.

## Finding and regression matrix

| Area | Change and retained owner | Verification scope |
| --- | --- | --- |
| R7-01 | Reuse one build-time lifecycle adaptation for both ordinary Pet microphone controls. Dispose aborts permission/init/recognition work; setup failures release partial resources; late recorder cancels immediately and late stop never starts recognition. | `audit-r7-pet-hear.test.mjs`: actual generated desktop/web controls, delayed success/failure/disposal/release. No physical microphone. |
| R7-02 | Keep World's single reply-nudge workflow. Channels grants the exact message/session/current original-input capability, revalidating identity, scope and allowlist; Core/guest recognize it as conversational continuation while retaining native system provenance. | `audit-r7-channel-nudge.test.ts` plus full native channel-homes nudge fixtures. Owner/guest/V1, V2/silence, cancellation, forged payloads and revoked scope. |
| Channel/TV compatibility | Test actual channel data-directory/transcript registration APIs. Use native TV message/history/tool denial instead of retired Core `source` rows; empty gardens reject harvest. | Complete native services, channel-homes and Room scripts; no truncated success substituted for full-path checks. |
| Room/Desktop | One actual body projection owns activity/operation/phase/progress; random, work and reply clips cannot replace it. Progress-only updates do not restart clips. | `pet-activity-mirroring.test.mjs`; actual generated projection/lifecycle code. Missing activity media remains explicitly visible and is not counted as complete visual mirroring. |
| Initial resources | Retain existing zero-coins/empty-inventory construction and free basic care. No starter gifts, automatic wages or save reset. | Economy and Body fixtures, initialization/continuity checks. |
| Offline | Existing Body executor stores one bounded absence window, including original consumption cutoff and policy thresholds. Partial durable checkpoints/restarts cannot grant another allowance. Accepted phase boundaries determine actual sleep recovery. Explicit pause freezes passive body/crop time. | `offline-body-policy.test.ts` plus existing clock/scheduling/Garden tests: configurable 0/1/4/12 hours, severity/recovery, old severe states, partial checkpoint, repeated reopen, >8h live time, crop independence and invalid-window preservation. |
| Economic boundary | Economy rejects owner overrides of daily net reference, crop/fertilizer yield and buyback, including generic item-price/availability bypasses. Existing supported shop purchase prices/availability, reading import and food settings remain. | Expanded `economy-recovery.test.ts`, including actual UI edit payload and legacy/current configuration behavior. |

## Settings and compatibility

Portable companion settings reuse the existing Core configuration/save path:
`offlineBodyHours` initially 4 (0–168 whole hours),
`offlineNeedCeilingPercent` initially 70 and `offlineEnergyFloorPercent` initially
35 (both 0–100). Null legacy fields remain unconfigured and resolve to technical
defaults. The owner subsequently confirmed these gentle values as adjustable
initial defaults, alongside the four-hour allowance; they are not immutable
balance rules. Only new negative
change is bounded; there is no automatic healing to the ceiling/floor and no
absence-induced pain penalty. Real accepted recovery can improve old severity;
subsequent negative phases then honor the configured gentle bound.

Normal enabled live progression uses actual elapsed time; closing/hiding Room
is not an offline or paused transition. Crops use separate enabled elapsed time
up to maturity/water exhaustion, without time-generated harvest/sale/replant.
Only preaccepted valid work may finish. Reading still requires actual content
and explicit existing confirmation; no fictional offline experience is created.

Old stored economic overrides are projected to fixed game-owned returns without
read-time rewriting. Existing planted crop profiles retain their accepted yield
and growth parameters; newly planted cohorts use the effective common rules.
Current held crop sales use the common buyback price. Balances/items/receipts are
preserved. An explicit settings save writes only the effective supported values.
The rejected schema fields are not silently accepted as effective owner choices.

Retired Core execution/history/eligibility/dependency machinery remains removed.
No new assistant, Bank, body simulation, garden clock or income scheduler exists.

## Evidence and limits

Work logs and focused red/green cases are under
`.cache/design-implementation-20261114/`. Native service tests use temporary
workspaces/Banks and local scripted model adapters with read-only installed DSH
components. A loopback port needs sandbox elevation; no real external channel,
model account, microphone or window is needed for these tests. No tests grant
installed owner acceptance, natural-language understanding or power budgets.

Activity media for drinking, reading, gardening and some custom packs is missing
from the existing Pet catalogue. Code now reports these gaps instead of claiming
a neutral pose fulfills 100% mirroring. At this checkpoint the supplementary-media versus Room-rendering direction
was pending. The owner subsequently selected supplementary animation assets;
the media record owns delivery evidence. Hidden
or minimized Room is not silently treated as closed; rendering suspension remains
independent of its life state. Device CPU/GPU/memory/wakeup limits still need
actual measurements; this task does not freeze illustrative budgets.

The personal installation and workspace remain unchanged. Installation and real
UI/model/power acceptance require a later owner-controlled step. Owner cases
E01–E04 and the previous trial matrix remain not run.

## Final code/package/isolated verification

- Clean build and type verification pass with the repo-local toolchain. No
  dependencies were installed; dependency auto-preparation is disabled.
- Final extracted-package regression groups: **122 + 429 = 551 passed**, zero
  failures/skips. There are **86 new regressions** over the prior 465-case batch:
  32 microphone, 11 shared activity, 17 nudge/provenance, 15 offline and 11
  economic additions. The 18 Economy cases additionally pass against the
  actual generated `./client` carrier.
- Complete `check-native-services.mjs`, `check-native-room.mjs` and
  `check-native-channel-homes.mjs --messaging` all pass in the final extracted
  package. Actual Mnemosyne CRUD, cross-session/guest recall and attribution,
  Memory toggle/outage/rebind, Room HTTP/body/chat/TV permissions/album and
  owner/guest/V1 nudge, V2 no-nudge, forged rejection, simulated QQ/WeChat/Bridge
  deliveries and restart deduplication are exercised. No real model/channel
  accounts, GUI, microphone or physical screen source were exercised.
- Archive checks pass: 922 members, 252 build files, 42 first-party helpers,
  260 vendor hashes, seven intentionally source-only provenance inputs, 543
  local runtime references, 11 Markdown references and 43 declared external
  import occurrences. Retired Core/test/build-only inputs remain excluded.
- Final stage and archive match **922/922 file hashes** after testing; current
  source/runtime files match too. `pnpm pack` only omits `packageManager` metadata
  from the published manifest; the rest is semantically identical. The previous
  `4474a5bc6533` archive retains its original SHA-256.

Final candidate, **not installed**:
`.cache/design-implementation-20261114/package/dsh-Chatpet-candidate-ca07b0e1d631.tgz`.
SHA-256 `ca07b0e1d63158cf6b893ef3316eecc0553c1a3011ed9cee1f2a47dd5f83ff85`;
126,040,034 bytes. Final isolated stage:
`/private/tmp/chatpet-final-isolated-20261114-rl50z54w/`.
Its `result.json` and `logs/` retain the direct execution results; the permanent
checkout evidence includes `isolated-final-result.json` and copied final logs.

### Independent package review and retained failures

A fresh package-only reviewer found one adjacent recorder-initialization P2 in
intermediate archive `ae9b921461bd`: a granted stream leaked on audio setup
failure. The same upstream recorder now establishes teardown before graph
construction and propagates the existing abort signal through initialization
and recognition. The final frozen `ca07b0e1d631` package passes the independent
reviewer's **28/28** direct-function/combined-control cases for both actual
carriers, including pending permission/resume and real mocked-fetch cancellation.
The remaining reviewed QQ, Body/offline and economic paths had no supported
additional findings. This is a focused code review, not whole-package semantic
or installed acceptance. Final reviewer output is copied to
`.cache/design-implementation-20261114/final-package-review/`.

Intermediate candidates/logs are retained. `4386782944f5` was rejected as final
when package/source comparison caught the implementation agent's last recognition-
signal change; final packaging began only after all source edits stopped. The
new recognition regressions also rejected that intermediate carrier. Neither
intermediate archive was installed or presented as final passing evidence.
The final archive above supersedes them.

Missing drinking/reading/gardening animation coverage is the remaining design
completion limit at this checkpoint. The subsequent media record owns its
repair and current asset coverage; installed visual acceptance and all owner
cases remain not run.
