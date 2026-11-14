# Common activity playback logic

Updated: 2026-11-14. Source implemented; types/build, code regressions and
isolated-package checks pass. All earlier reported defects have targeted
package-only closure evidence. The final no-history package-only review found
no confirmed P0–P2 in its inspected scope. No installation or owner acceptance. The detailed
[action vocabulary](../planning/companion-action-design.md) remains a proposal;
individual food/emotion/touch variants and artwork are not declared complete.

## Authorized scope and reuse

The owner authorized writing playback logic first, reviewing individual animation
assets later. Reuse the current WebM/double-buffer players and native visibility,
state and lifecycle transports. Source inspection established concrete gaps:
Room/Desktop chose different clips; no common phase offset survived opening a
window; shared mode bypassed old once/sleep sequences; the automatic eating movie
needed an uninvoked food-prop scene; Sprite garden tools could be drawn twice.

The change adds one read-only Body presentation contract and thin adapters to the
original players. It introduces no engine, assistant runtime, memory store,
needs simulator, business executor or durable playback database. Retired Core
machinery remains absent. Existing domain interruption/return remains authoritative.
No asset generation, replacement or deletion is included in this batch.

## Responsibilities

- `src/behavior/playback.ts`: resolve the actual Body/content state to a shared
  media timeline; sample current segment/offset. Encoded media lengths are visual
  metadata, not life durations. Missing actions retain explicit representation gaps.
- Behavior publishes the same projection in snapshots and immediate Room/garden
  responses. Phase starts use persisted route departure, actual sleep event,
  ordinary dwell or direct accepted operation time where valid. Missing phase
  starts remain zero: loops use a common cosmetic clock; old one-shots do not
  replay. Snapshot/open times and generic `updatedAt` are never fabricated starts.
- Desktop's default main body receives the projection in live configuration.
  Progress changes do not reissue animations. A parallel sleep clock/explicit
  activity animation request is bypassed for shared Body. Saved configuration and
  ordinary custom packs remain separate; selected canonical files use installed
  bytes without modifying same-name user files.
- Native and web adapters reuse original loading/double buffering, add bounded
  phase wakeups, seek on entry/resume/new operation, preserve same-key continuity,
  hold one-shot final frames, reject late generations and use the same mirror
  rule. Hidden/disposed adapters cancel timers and listeners. Decode failure
  retains truthful status rather than inventing another physical activity.
- Room uses the same descriptor and actual SpriteActor. Intro/loop sampling,
  stale load rejection, once holding, hidden recovery and static poster fallback
  stay renderer-only. Sprite videos own their baked tools; scene hand tools stay
  available to the existing 3D path. Real crop/plot geometry is unchanged.

Current provisional media mappings unify ordinary eating with existing `吃白饭`,
plus existing desk/nap assets. The eight recent life videos remain provisional;
new food forms, emotional rest and nuanced touch animations are not claimed.
3D retains its existing root poses/procedural tools and displays an activity-gap
notice for activities whose complete motion is unavailable. No new skeletal
animation capability is claimed.

## Verification boundary

Tests use real domain code and generated carriers with disposable workspaces,
clocks, media elements and external transport seams. No DSH/Electron windows,
accounts, paid model, microphone, personal workspace or installer is used.

Coverage includes common phase/clip selection, known/unknown historical starts,
reading offer gating, actual routes, incidental care and restart, original media
aliases/shadowing, same-key/new-key behavior, sleep sequences, once holding,
hidden/resume/dispose, generation races, bounded listeners/timers and legacy
unmanaged behavior. Full results and frozen candidate are recorded below once
checks complete.

Owner-only acceptance remains: artistic quality, complete loop/alpha inspection,
visible two-window phase alignment, actual item-specific portrayal, emotion/touch
appropriateness, 3D coverage, transparent input and measured device resources.
Future owner cases should exercise opening either surface mid-activity, hiding
through sleep entry, care while reading/gardening, repeated touches, network
outage, restart and decoder failure without additional consumption or new goals.

Evidence directory: `.cache/playback-logic-20261114/`.

## Verification results

- Type check and clean build pass.
- Complete `test:life-integration`: **696 passed**, zero failures/skips (122 base
  checks and 574 integration/audit checks).
- Frozen-package Room/native/web/state effects: **93 passed**, using actual
  package code and fake media/clock/transport/React-setter boundaries. These are
  a relocated repeat of relevant code cases, not 93 additional distinct cases.
- Archive/relocated Core, Memory, Body, plan, Economy and common timeline checks
  pass: 941 members, 254 build files, 42 first-party/helper files, 268 vendor
  hashes, seven source-only origin inputs, 547 local references, 11 Markdown
  targets and 43 declared external-import occurrences.
- All 941 unpacked runtime file hashes remain unchanged after isolated tests.
- Canonical Room/Desktop media bytes are checked together so a later one-sided
  artwork replacement cannot silently invalidate their common presentation.

Current candidate **69c0a1527985**, **not installed**:
`.cache/playback-logic-20261114/package/dsh-Chatpet-candidate-69c0a1527985.tgz`.
SHA256 `69c0a1527985f87fa10fac36b160c5a32fe0a237ef7bbd1c9d679c35b5181926`.
Its archive is frozen. Tests, source sheets, encoder and build-only adapters stay
out of the package; there is no second assistant or world runtime.

## Independent review and repair evidence

Earlier archives are retained unchanged and are not current deliveries:

| Archive | Review | Disposition |
| --- | --- | --- |
| f394cd8427c2 | First no-history review found intro-failure boundary loss, native hung-load handling and removed-descriptor retention | Superseded |
| 55d721073dcc | Contextual closure passed those triggers; visibility recovery, lock release and web release gaps remained | Superseded |
| 40b4ab4c4b42 | Hidden release, post-resume decode errors, managed format routing, initial locks and fresh-config retry needed repair | Superseded |
| 725c53aee9b7 | Only a first-config/first-state race remained in the new independent review | Superseded |

All raw reports are retained as `package-review-r1.md` through
`package-review-r4.md` under the evidence directory. Repairs reuse the existing
players, locks, original load timeout, initial state baseline and configuration
request effect. Recovery keeps a single visible config request and capped retry,
cancels hidden/disposed work, rejects old generations, and does not retry a
failed final media loop. Native/web bundles inline only their used common
functions, not an unused second resolver or native installer in web.

Contextual package-only checks of **69c0a1527985** close initial lock/format/fresh
recovery, hidden release and post-resume errors. The former reviewer of the last
race separately reproduced A→B correction with one baseline reread, identical
counters causing no loop, and later real changes still loading C. A new reviewer
with no history received only this archive and completed the final independent
review, with no confirmed P0–P2 in its inspected scope. The report is retained as
`package-review-r5.md` in the evidence directory. Existing Desktop playback
observations may still reach Emotion's recent-interaction SQLite; this is the
pre-existing observation path, not a new Bank. Zero storage writes are not claimed.

No real decoder, Safari/Electron compatibility, artistic motion, installed
cross-window timing or device power claim follows from these probes.
