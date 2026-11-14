# Supplementary life animation sources

These eight reviewed transparent 3×2 sprite sheets were generated with the
built-in `image_gen` tool, using `src/desktop/assets/cute.png` as the existing
Xiaoxi identity/style reference. Original dsh-pet character attribution and
notices remain in `THIRD_PARTY_NOTICES.md` and the pinned origin records.
`prompts.json` records the final prompt set. No replacement character/runtime
or persona is introduced.

The generated production clips and static photo fallbacks are in
`src/desktop/assets/life-*.webm` and `life-*.png`; `life-animations.json` records
hashes, dimensions, frame rate and source-sheet hashes. This source directory,
the encoder, intermediate frames and test previews do not ship in the package.
The Room 2D sprite route serves those exact installed files; it does not copy
another set into the Room template.

To rebuild with a separately prepared compatible FFmpeg encoder:

```sh
source ./scripts/env.sh
CHATPET_FFMPEG=/absolute/path/to/ffmpeg node scripts/build/build-life-media.mjs
```

Ordinary builds only call the built-in output verifier. They do not download or
invoke FFmpeg. Conversion crops the six existing cells, scales/pads them to the
original 640×360 presentation canvas and encodes an 8-frame forward loop at
4 fps with lossless VP9/alpha and no audio. The static poster is the first pose.
No image content is redrawn by the conversion step. Playback does not complete
an action, read a page, consume inventory or make an earning decision.

Artwork props are representative activity illustrations, not inventory counts
or book text. Actual item/crop identity, progress and outcomes still come from
Body/Economy/Life. Visual quality, custom packs and optional 3D-model appearance
remain separate owner acceptance; this source record does not certify them.
