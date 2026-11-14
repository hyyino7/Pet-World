# Supplementary life media and confirmed gentle defaults — 2026-11-14

The owner selected supplementary Desktop animation assets through the existing
pipeline and confirmed the adjustable initial offline thresholds: 70% maximum
hunger/thirst/bladder needs, 35% minimum energy. Four-hour initial consumption
allowance, preservation of worse old severity and no new pain penalty remain.
The earlier [implementation record](life-design-implementation-2026-11-14.md)
retains repair history; this record owns the subsequent media/verification delta.
No installation, personal-workspace operation, real model conversation, commit
or publication is authorized.

## Delivered media

Eight built-in `image_gen` sprite sheets preserve the current `cute.png` Xiaoxi
reference: drinking, real-content reading, tilling, sowing, watering, fertilizing,
harvesting and sorting a trade. Original attribution remains. The final prompt
set and reviewed source sheets are development-only in
`art/life-animation-sources/`; the animated contact preview is
`art/life-animation-preview.webp`.

`src/desktop/assets/life-animations.json` records each installed WebM/PNG pair,
source/output hashes, 640×360 canvas, 4 fps, eight encoded frames (six distinct
poses) and a two-second forward loop. Endpoint holds avoid visibly reversing
planting/harvesting. The manifest records the precise total encoded size; separate static first-pose PNGs support the existing photo
fallback. Root decoded every frame with alpha: eight frames per clip, six distinct
poses, no nontransparent outer-edge pixels and substantial transparent padding.
The source sheets were visually inspected; an encoded sample was composited on
white to inspect actual alpha/color. These are asset checks, not installed UX.

The source-only `scripts/build-life-media.mjs` uses an explicitly supplied
FFmpeg executable for conversion. Ordinary builds only verify installed output
hashes and catalogue registration; no encoder, image generator, raw sheet,
intermediate frame or preview is shipped. The code package does not depend on
the generation directory or development checkout at runtime. Encoder download
and hash provenance are retained under `.cache/life-media-20261114/` only.

## Execution and presentation boundaries

- The catalogue uses a `life` group. These clips cannot be chosen as random,
  reply-expression or work animations. Body facts/phase/progress remain the
  authority; no clip completion triggers a model turn or business effect.
- Body derives a small read-only presentation kind from its accepted execution
  and the existing Economy content receipt. Reading requires a running real read
  operation, its actual owned dwell and an offered content segment. Arbitrary
  activity prose, intent, animation or elapsed time never advances a bookmark.
- Receipt readiness enters the existing Body revision/change projection. Desktop
  switches once when real content arrives; ordinary progress does not restart
  its clip. Pause/end/unavailable content do not impersonate active reading.
- Room 2D serves the same actual installed WebM/PNG bytes through an explicit
  immutable allowlist. No copied media, public state route, second simulation,
  Memory bank or assistant is introduced. Actual drink/garden/read state takes
  precedence over cosmetic/TV clips. Moving/sleeping retains physical priority.
- The new assets cover the agreed minimal activities. Unsupported future actions,
  custom packs and optional 3D-model details remain honest gaps/owner acceptance;
  this work does not claim pixel/frame equality across renderers or installed
  visual acceptance. Props illustrate an activity, not inventory counts or book
  content. Actual selected items/crops and outcomes remain domain-owned.

## Regression and owner handoff

The new semantic mapping/real receipt path adds twelve cases to the previous
551-case suite. `life-media.test.mjs` adds twenty-seven more: eight shared media and
poster routes with byte/range equality, nine physical garden/drink mappings,
real-content reading admission, rejection of arbitrary/private asset paths,
the actual action-bar entry, four interrupted wake transitions and shared idle
without random physical rotation. Bound previews cannot cancel a route or
replace the actual activity. Old sleep/wake transitions and once-clip deduplication
remain only for unbound template presentation; bound snapshots switch directly
to their actual phase. Two actual upstream-router regressions additionally
prove reserved life names cannot be shadowed by user-root or per-pack files;
ordinary custom media and stale-binding rejection are retained.
Normal builds verify media hashes, unique catalogue entries and static posters.
The package verifier also checks media hashes and actual relocated Room aliases.
The eight video files total 2,628,184 bytes; posters total 1,306,460 bytes.
All eight forward loops were decoded with alpha and checked as described above.
The final candidate and isolated evidence are recorded below once complete.

Owner acceptance after a later authorized installation should observe: clip
legibility and loop transitions on light/dark desktops; the same selected
activity and phase with Room open/closed; real-text-only reading with bookmark
continuity; active work surviving brief care; hidden playback stopping; custom
packs/optional 3D fallback; and actual CPU/GPU/memory/wakeup behavior. Do not
interpret asset inspection or synthetic model tests as those completed trials.

## Final verification and candidate

Clean build, types and patch checks pass using the repo-local toolchain. The
final extracted package passes **122 + 468 = 590 code cases**, zero failures or
skips, including **39 additions** to the earlier 551. Eighteen existing Economy
cases additionally pass against the generated `./client` carrier.

Complete `check-native-services.mjs`, `check-native-room.mjs` and
`check-native-channel-homes.mjs --messaging` pass from the final extracted
package with temporary workspaces/Banks and scripted local models. They cover
real Core/Memory/native chat collaboration, Room HTTP/body/chat/TV/album and
channel admission, owner/guest/V1 nudge, V2 no-nudge, simulated QQ/WeChat/Bridge
and restart deduplication. There are no real chat-model/account calls or actual
external channel deliveries. Source artwork generation used eight separate
built-in `image_gen` requests, as explicitly selected by the owner.

Package checks: **939 members**, 252 build files, 42 shipped first-party/helper
files, 260 vendor hashes, seven source-only provenance inputs, 544 runtime
references, 11 Markdown targets and 43 external-import occurrences. The checker
verifies every supplementary file hash and serves all sixteen relocated shared
media/poster aliases. No source artwork/preview/encoder is shipped. All 939
archive/runtime files match their frozen input after tests; the current source
files match too (the packer only omits packageManager metadata).

A fresh package-only review of intermediate `67d4a09b824a` found a concrete P2:
upstream Desktop routing could shadow a new built-in life name with an existing
user/per-pack file, while Room always read the installed media. The adapter now
reserves only the new `thumb/main` life labels for their installed bytes before
upstream routing. User files are retained and ordinary/custom names keep their
original precedence. The final review closure verifies all eight names under
GET/HEAD, both collision locations, ordinary names, other methods/roots, scope
revocation and inside-path guards. No additional supported finding remains in
that focused review. An initial PNG-background concern was retracted after
actual RGBA decoding confirmed transparent pixels. Hash checks and this focused
review are not installed UI or complete semantic acceptance.

Final candidate, **not installed**:
`.cache/life-media-20261114/package/dsh-Chatpet-candidate-134cc52f47af.tgz`
(129,972,557 bytes), SHA-256
`134cc52f47affc3968802a98cd481a0841bf1c17d69751eeb06e0fbb89ff386d`.
Final isolated stage: `/private/tmp/chatpet-life-media-isolated-y38l46ti/`.
Logs, encoding/frame receipts, candidate metadata, final hash comparison and
unchanged review reports are copied into `.cache/life-media-20261114/`.
Historical archives and the personal installation remain untouched.

Owner cases E01–E04 remain not run. Basic built-in media delivery is complete;
optional 3D/custom-pack representation, smoothness/legibility on the real desktop
and measured CPU/GPU/memory/wakeups require the owner's later installed trial.
