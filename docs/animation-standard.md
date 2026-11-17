# Animation and artwork standard

This is the proposed production standard for new or deliberately revised artwork.
The **current baseline** and **compatibility constraints** describe the shipped
source and media. **Authoring targets** are recommendations for owner review;
they are not new runtime validation rules or acceptance of existing artwork.
Adopting this document does not regenerate assets or change playback behavior.

## Scope and current baseline

The primary deliverable is a transparent 2D character clip shared by Desktop and
Room. Stickers, posters, props and source artwork have separate roles. Room's 3D
models have a separate contract below; a 2D clip does not provide a 3D action.

| Resource | Current baseline | Owning source |
| --- | --- | --- |
| Original character clips | 114 WebM files; 640 × 360; VP9; declared alpha; 24 fps | [Catalog](../src/desktop/assets/catalog.json), [pinned origins](../vendor/dsh-pet/origin.json) |
| Supplementary Life clips | 8 WebM files; 640 × 360; VP9/alpha; 4 fps; 2 seconds | [Life media manifest](../src/desktop/assets/life-animations.json) |
| Life production artwork | 8 RGBA PNG sheets; 1536 × 1024; six 512 × 512 cells in a 3-column, 2-row grid | [Source artwork and conversion](../art/life-animation-sources/README.md) |
| Life posters | 8 RGBA PNG files; same presentation canvas as their clips | [Life media manifest](../src/desktop/assets/life-animations.json) |
| Registered chat stickers | 27 RGB PNG files; width 384; heights 288–384; existing backgrounds are part of the artwork | [Catalog](../src/desktop/assets/catalog.json) |
| Existing composited food props | Three 512 × 512 RGBA PNG files | [Prop allocation](../src/behavior/animation-allocation.json), [prop files](../vendor/dsh-pet/platform/assets/pic/baifan/) |
| Room 3D models | Two GLB files; both have no skins or animation clips | [Model contract](../vendor/feiyu-room-template/public/room/assets/models/README.md) |

The registered animation set contains 122 clips, approximately 60.46 MB in total.
Container durations are 10.042 seconds for 110 clips, 5.125 seconds for three,
4.917 seconds for one, and the Life duration above for eight. These are measured
container values, not a requirement to make every new action ten seconds long.

All containers declare alpha and contain a video track without audio. Declared
alpha is not proof of clean decoded transparency. Sampled original clips had
corner alpha of 1/255; sampled Life clips had zero corner alpha. The existing
[alpha correction switch](../vendor/dsh-pet/src/shared/constants.ts) is disabled.
New art should remove background residue at export instead of depending on it.

The Life conversion uses a few held poses. It is a supported legacy profile,
not the smooth-motion target. Some sampled Life standing poses also place the
feet several pixels above the common ground line. Retention of these files
does not certify their alignment, loop seams or artistic consistency.

## Canvas, resolution and placement

### Compatibility constraints

| Property | Contract |
| --- | --- |
| Production presentation canvas | 640 × 360 pixels, landscape 16:9, square pixels |
| Coordinates | Origin at the top left; X increases rightward; Y increases downward |
| Character root | Use the canvas center X = 320 and the standing ground line Y = 330 as authoring anchors |
| Interaction rectangle | X = 200–440; Y = 50–335; the existing click/drag region is fixed relative to the canvas |
| Desktop layout | Configured `size` is the whole canvas width in CSS pixels; height is `size × 9/16` |
| Scaling | Preserve the complete canvas and its transparent margins across frames and clips |

The ground line and hit rectangle come from the
[shared geometry constants](../vendor/dsh-pet/src/shared/constants.ts). Desktop
uses them in [sprite layout](../src/desktop/helper/upstream/sprite.js); Room has
its own [sprite plane and ground placement](../vendor/feiyu-room-template/public/room/actor.js).
The two surfaces can present the same pixels at different apparent sizes.
Check both surfaces before accepting alignment.

### Authoring targets

| Item | Recommended target for new artwork |
| --- | --- |
| Editable master / rendered master frames | 1280 × 720 or larger at the same aspect ratio; retain vector or layered originals when available |
| Runtime frames and matching poster | Export to the production presentation canvas; preserve the same root and framing |
| Neutral standing body | Approximately 260–280 pixels tall; align with `idle.webm` before comparing special poses |
| Body placement | Keep the main torso/head inside the interaction rectangle; tails, held tools and deliberate motion may extend outside it |
| Edge clearance | Keep all visible artwork within X = 32–608 and Y = 18–342, including effects at their largest extent |
| Unintended drift | At neutral transitions, aim for no more than 2 pixels of root/foot displacement; intentional jumps, sitting and lying are exempt |
| Color | sRGB artwork; 8-bit RGBA PNG master frames with clean antialiased edges |

Use a stable body root rather than recentering each frame's visible bounding
box. A moving tail or extended watering can must not move the entire character.
Do not tightly crop each frame, stretch a square pose to fill a widescreen
canvas, or normalize a crouching pose to standing height.

The runtime canvas is not the character's visible width. Its transparent side
margins support motion and interaction geometry. DPI/PPI metadata does not add
on-screen detail. A larger master preserves edit quality, but downsampling it
does not make the current runtime output native-resolution at every Retina
display size. Higher-resolution runtime exports require separate compatibility
and performance validation.

## Timing, motion and playback

**New smooth animation target: constant 24 fps.** Preserve actual pose changes
and motion timing. Repeating six poses in a 24 fps container does not turn them
into smooth animation. A deliberate held-pose style or reduced frame rate is an
explicit artistic exception, reviewed at the intended display size.

| Clip role | Recommended starting point | Motion requirement |
| --- | --- | --- |
| Idle, breathing, quiet presence | 3–6 second loop | Small, readable motion; stable feet and body scale |
| Repeating activity, such as reading or drinking | 2–6 second loop | Clear action and prop contact; no visible reset at the seam |
| Touch reaction / expression | 1–3 second one-shot | Readable anticipation, reaction and recovery |
| Finite action / celebration | 2–6 second one-shot | A meaningful final pose that can remain visible |
| Sleep | Separate entry, loop and exit when the existing allocation uses them | Entry leads into the sleep pose; loop remains asleep; exit finishes awake |
| Walking / running | Match the configured movement window | In-place gait; actual route translation belongs to the runtime |

These are authoring ranges, not replacements for current registered durations.
Existing independent Desktop movement has configured `leadSec` and `tailSec`
in [interaction settings](../src/desktop/assets/interaction.json). A replacement
movement clip must leave positive travel time after both holds. Do not shorten
it to a gait cycle without reviewing that movement profile.

Loop review includes the last-to-first transition: pose, velocity, eye state,
props and effects should join naturally. Avoid an accidental freeze from
duplicated endpoint frames. Planting, harvesting and other directional actions
play forward; reversing frames must not visibly undo the action. For a finite
action, make its final frame suitable for the runtime's end hold.

Actual container timing is read by the
[animation-map builder](../scripts/build/build-animation-map.mjs). The existing
[shared playback contract](settings.md#desktop-interactions) owns activity progress,
pause, cancellation and final-frame holds. Art does not complete a task, consume
an item, read a page or settle a reward. Add entry/work/exit assets only for
phases the approved allocation and actual activity can represent.

Scene redraw rate is separate from media frame rate. Room's
[presentation loop](../vendor/feiyu-room-template/public/room/app.js) currently
selects 30 fps for active movement/input and 6 fps for a quiet populated scene;
visibility also controls suspension. A 24 fps file does not imply every Room
mode displays every frame. Validate actions in their actual presentation mode.

## Character and art direction

Use the existing character, with one shared identity across all action sets:
blue hair and eyes, side fins, fish/whale tail, maid headband, navy-and-white
dress and apron, and the established small chibi proportions. Keep hair shape,
tail design, accessory placement, outfit motifs and face proportions consistent.

| Reference | Purpose |
| --- | --- |
| [Character front/side/back reference](../vendor/dsh-pet/platform/assets/main-character.png) | Identity, costume, silhouette and directional consistency |
| [Idle animation](../src/desktop/assets/idle.webm) | Production scale, root placement, line weight and motion restraint |
| [Existing cute illustration](../src/desktop/assets/cute.png) | Supplementary expression/style reference; its white background is not an animation background |
| [Life source prompts](../art/life-animation-sources/prompts.json) | Existing action briefs and AI-generation provenance |

The local character sheet is 1920 × 1072 and matches the upstream
[`main-character.png`](https://github.com/PC2005-cloud/dsh-pet/blob/main/dsh-pet/assets/main-character.png)
byte-for-byte. Additional original production resources are public:

- [Action prompts](https://github.com/PC2005-cloud/dsh-pet/tree/main/prompts), including the common reference-image, framing and per-second action instructions.
- [Source-video release](https://github.com/PC2005-cloud/dsh-pet/releases/tag/assets-videos), containing an `assets-videos.zip` download of source MP4s; archive completeness has not been checked here.
- [Original production guide](https://github.com/PC2005-cloud/dsh-pet/blob/main/MAKE-YOUR-OWN-PET.md): Doubao-generated continuous green-screen video, Premiere manual background removal, normalization and runtime encoding.

No PSD, layered animation project or Premiere project download was found in
the checked public tree or release attachments. Original source videos and
generation prompts are distinct from an editable rig or layered animation
project. The supplementary Life sheets use a different production method;
matching the original look requires visual review of identity and motion, not
only matching output dimensions or increasing the container frame rate.

A sticker is an expression reference, not a replacement model sheet. Match the
production idle clip when its proportions or shading differ from an illustration.
Keep lighting and palette stable between clips. Avoid flickering embroidery,
changing fingers, tool deformation, disappearing accessories, spontaneous outfit
changes or a different face halfway through an action.

### RGB color control

Use the production idle clip as the color reference, decoded in the target
renderer. Record colors as 8-bit **sRGB** triples, together with the reference
frame, sample rectangle and material. Keep separate shadow, base and highlight
samples for blue hair, skin, white headwear/apron and navy clothing. A small
patch median is a diagnostic reference, not a flat replacement color for all
pixels of that material.

Compare equivalent neutral poses on the same background. Exclude outlines,
antialiased edges, blush, embroidery and props from base-color samples. Match
materials separately with one fixed correction throughout the clip; preserve
their shading. A global brightness change cannot independently correct a purple
white headband and dark skin. Review beginning, action midpoint and ending
frames before exporting the complete clip, then watch the result for color
flicker and accidental changes to props.

Make the RGB-to-video conversion explicit: source range/matrix assumptions,
working sRGB space, output range, matrix, primaries and transfer function. For
an sRGB WebM export, BT.709 primaries/matrix and the sRGB transfer function are
a candidate profile; verify the actual supported host before adopting it.
Changing metadata alone does not correct colors already changed in generation.
See the [FFmpeg color-conversion controls](https://ffmpeg.org/ffmpeg-filters.html#colorspace).

Measure the decoded final file as well as the master PNGs. Use a flat RGB test
chart to distinguish color-conversion/playback errors from artwork differences,
and record actual patch deviations after encoding. A recommended initial
review tolerance is a median deviation of at most 5 levels per RGB channel for
equivalent, opaque base-color patches. This is an authoring target, not an
automatic acceptance gate or a guarantee of whole-character consistency.

Props must be readable at the final displayed size and stay in contact with the
hand, mouth, soil or furniture as appropriate. Use representative book pages,
food and crops where the current allocation has no exact object variant. Keep
actual item identity, quantity, reading text and outcomes in their existing
domain/UI owners. Do not bake invented balances, rewards or inventory counts
into the illustration.

Deliver text-free body animation by default. The current renderer may mirror
directional clips. Lettering, handed tools and asymmetric actions need an
explicit mirror review and the applicable existing `noMirror`/slot configuration;
a file name alone does not prevent mirroring.

## Artwork and handoff files

| Deliverable | Standard |
| --- | --- |
| Editable source | Current layered/vector/rig project when available, or lossless ordered RGBA frames; retain the reference and action brief |
| Layer organization | Separate body, facial features, hair/tail, hands, props and effects where the authoring tool supports it; stable names and pivots |
| Runtime clip | Flattened transparent WebM; the current renderer does not consume arbitrary source layers or sprite sheets |
| Poster | Text-free RGBA PNG of a representative existing frame; same canvas and root as its clip |
| New chat sticker | Recommend 384 × 384 PNG; keep the full silhouette/text within the canvas; decide whether a deliberate background belongs to the sticker |
| Separate runtime prop | Use the existing composition route only when supported; keep alpha, scale and anchor consistent with the relevant composition |
| Attribution | Origin, author/license reference, source reference and hashes; for AI-generated artwork retain the tool, reference and final prompt |

For new separate stickers, prefer transparent backgrounds unless the sticker
design intentionally includes a panel. Existing opaque stickers keep their
current format. A sticker, logo or cursor image is not a body-animation frame.

For the existing Life-sheet workflow, follow the exact source layout and
conversion procedure in [its source README](../art/life-animation-sources/README.md).
Its encoder does not generate new in-between poses. Changing that workflow's
frame rate, layout or output format is separate implementation work.

Each handoff records the action ID and label, intended role, source file,
dimensions, fps, frame count, container duration, loop/one-shot intent, root and
foot placement, mirror intent, poster, file sizes and provenance. Use existing
manifest fields where they exist; keep additional authoring notes with the
current source artwork rather than adding an unreviewed runtime schema.

Use English kebab-case IDs for new files, such as `life-drink`, and distinct
display labels. Preserve all existing IDs, labels and file names, including
Chinese names. Keep reproducible current artwork under `art/`, shipped media
under `src/desktop/assets/`, and temporary previews/intermediate exports outside
the repository. Retain the layered original as an editable source, not as a
collection of numbered drafts or backup exports.

## Encoding and size budget

The current production path is WebM with VP9 alpha, muted video and no audio
track. The existing encoder uses `libvpx-vp9`, `yuva420p`, lossless encoding,
`-b:v 0`, `-auto-alt-ref 0` and `alpha_mode=1`; see
[the encoder](../scripts/build/build-life-media.mjs) for the actual recipe.
Keep that alpha-preserving route when exporting comparable new frames, while
using the intended timing profile. MP4, GIF, MOV and a loose sprite sheet are
not interchangeable built-in runtime deliverables.

For new clips, aim for at most 1,000,000 bytes per file; review larger files for
visual benefit and real decode cost. This is a proposed general budget, not an
existing global gate. The Life verifier already enforces that byte limit for
its own clips. Aim for posters/stickers below 300,000 bytes where quality allows.
Source-master size is separate from runtime-package size.

Keep the source/master at full quality. Optimize exported transparency and
unnecessary detail before sacrificing silhouette or readability. Do not add
multiple resolutions/codecs to the shipped package without a consumer and a
reviewed need. Runtime frame dimensions, decoded memory and actual playback
matter as well as compressed file size; these byte targets are not measured
CPU/GPU guarantees.

A replacement must be previewed in the actual supported host. An alpha flag or
successful decode alone does not establish that another browser preserves
transparency. No extra browser codec or fallback is introduced by this standard.

## Registration and ownership

- Register shipped actions and stickers in the [catalog](../src/desktop/assets/catalog.json).
- Keep Life hashes, poster metadata and source hashes in the [Life manifest](../src/desktop/assets/life-animations.json) when using that workflow.
- Map approved action roles in the [allocation](../src/behavior/animation-allocation.json).
  A name-based match is not proof that all required sub-actions exist visually.
- Generate [the runtime index](../src/behavior/animation-map.ts) through the
  existing build; do not edit it as a separate animation list.
- Preserve [Room's shared asset route](../src/room/assets.ts). New shared clips
  should use the canonical media, rather than creating another Room copy.
- Keep upstream pins and notices intact. A visual revision needs its actual
  provenance; do not simply replace a pinned upstream hash to hide the change.
  Follow [third-party notices](../THIRD_PARTY_NOTICES.md) for each resource family.

## Acceptance

For every new or revised clip, review the following before owner acceptance:

1. Decode the complete file. Confirm canvas, frame timing, duration, video codec,
   alpha and absence of audio; distinguish declared metadata from decoded pixels.
2. Composite against white, black, a mid-tone color and a checkerboard. Check
   every edge for a rectangle, halo, clipped hair/tail, holes or background residue.
   Empty background should export as alpha 0; retain intentional edge antialiasing.
3. Compare the neutral pose to the production idle clip. Check the root, ground
   line, apparent body size and hit region. Check the largest motion/prop extent.
4. Watch at normal speed for at least three loops or three one-shot invocations.
   Inspect the seam, transitions, endpoint hold, motion spacing and prop contact.
5. Preview at canvas widths of approximately 232, 462 and 640 CSS pixels, and
   on the target display scale. A clear large master can still blur when reduced.
6. Exercise actual Desktop and Room presentation, left/right facing where
   permitted, relevant sleep/activity transitions, pause/resume and interruption.
   Confirm the image remains consistent with the actual activity and data.
7. Confirm source files, poster, catalog pairing, provenance and byte budget.
   Run the affected existing checks; these do not replace the visual review.

Existing source/package checks for an implemented media change are:

```sh
source ./scripts/env.sh
node scripts/build/build-life-media.mjs --verify
pnpm run build
node --test tests/regressions/animation-media-timing.test.mjs tests/life/life-media.test.mjs
```

The first command checks the existing Life outputs without regenerating them.
The build verifies pinned assets and generates the shared registry. The focused
tests cover current timings, immutable media and carrier routing. They do not
automatically test every decoded frame, pose quality or loop seam; media
inventory changes may also require updating their existing fixtures. Ordinary
documentation edits need only link, diff and scope checks as described in
[development](development.md).

The baseline above was checked from all registered container headers, PNG
headers, source conversion code and runtime geometry. Visual sampling decoded
four frames each from idle, walk, sleep-loop, one click reaction, drink, read and
watering in an isolated Electron session, composited against light/dark colors.
It was not a full-motion review of every asset or installed owner acceptance.

## Room 3D boundary

Follow the existing [model coordinate and license contract](../vendor/feiyu-room-template/public/room/assets/models/README.md)
and [model renderer](../vendor/feiyu-room-template/public/room/model-actor.js).
The retained GLBs are static models; procedural root/vertex motion does not
provide authored skeletal actions such as grasping, page turning or planting.

For a future rigged character, first agree on the skeleton, bone names, animation
clip names, root-motion policy, textures/materials, polygon/texture budgets and
runtime mapping. Those require a separate design and implementation review.
Do not claim full 2D/3D action parity from the current model files or this standard.
