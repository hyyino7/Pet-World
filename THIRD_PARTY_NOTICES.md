# Third-Party Notices

## sh2234113/feiyu-room-template

Source: https://github.com/sh2234113/feiyu-room-template/tree/9df0a6b76b563abc738b6d4b7ae137381c425424

The original `src/home-state.js` is retained unchanged in
`vendor/feiyu-room-template/home-state.js` (Git blob
`7fda4d0d16430a861a20d30c88f26a3026030219`). The native Life adapter
supplies the bound Repo and lifecycle. Room includes the template's room, garden
and television presentation and the original garden and visitor state. Its web
page reaches the companion through native DSH and reads native chat history.
QQ group play reuses the template's affinity scoring, slang library, role-card
sections, sticker library and forwarded-message formatter. The affinity adapter
supplies a storage file for the current QQ account and group.
The original code and Three.js carry MIT notices. The 2D character artwork
retains CC BY-NC-SA 4.0 and attribution. The models are included with the
template for personal, noncommercial room display under the author's terms.
[Upstream notices](vendor/feiyu-room-template/THIRD_PARTY_NOTICES.md) ·
[Model terms](vendor/feiyu-room-template/public/room/assets/models/README.md) ·
[Origin record](vendor/feiyu-room-template/origin.json)

The following pinned components are reused/adapted in Core and Memory. Whole companion plugins are not activated. Core owns execution; the selected Memory provider owns its Bank and eligibility state.

## canyueY/dsh-mnemosyne

Source: https://github.com/canyueY/dsh-mnemosyne.git

Pinned commit: `796dc292367667d2f453885c12d09bec49f8327b` (2.0.0).

The canonical Python service and REST client/process host are retained under
`vendor/mnemosyne/`. The upstream DSH session collector, plugin/preset and installer
are excluded. Local changes address process termination, dependency revision
coverage, durable partial-withdrawal settlement, scoped retrieval/consolidation
and an import cycle. Pet scope
and native integration live in `src/memory/` and `src/core/native-memory.ts`.

Apache-2.0 applies to this component. Its [LICENSE](vendor/mnemosyne/LICENSE),
[NOTICE](vendor/mnemosyne/NOTICE), [third-party notices](vendor/mnemosyne/THIRD_PARTY_NOTICES.md)
and [origin/change record](vendor/mnemosyne/ORIGIN.md) are included in the package.

## Alterssss/dsh-bili-whale

Source: https://github.com/Alterssss/dsh-bili-whale.git

Pinned commit: `8b0009f8ce2ebdc421afcb2e727b19ac18912ec6`.

- `lib/session-delivery.js` -> `src/core/upstream/serial-delivery.ts`: Adapted the Promise-tail serialization and failure isolation; product request/receipt persistence remains Core-owned.


MIT License

Copyright (c) 2026 ALTERSSSS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## wz20/dsh-dafeiyu-dot

Native browser factory and settings composition patterns in `src/console/client.js` are adapted from upstream `client.js`. The Chatpet settings UI uses DSH native settings slots and owns no assistant runtime or business data.

Source: https://github.com/wz20/dsh-dafeiyu-dot.git

Pinned commit: `ff288f57a25becfe195201b02e4fc4726ae71a5b`.

- `lib/session.js` -> `src/core/upstream/messages.ts`: Adapted final non-tool reply projection; removed persona, singing and whole-session presentation coupling.

- `lib/memory-tools.js` -> `src/core/matters.ts`: Adapted the native tool/output registration pattern; no upstream memory extractor or persona rules copied.


MIT License

Copyright (c) 2026 dsh-dafeiyu-dot contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## chenkezhen480/dsh-world

Source: https://github.com/chenkezhen480/dsh-world.git

The World foundation uses a separate 0.7.4 release pin,
`49bc2c9bb8183e3dbed9257404099946e0c97a1d`. The selected original runtime
modules, declarations and templates are redistributed under this MIT license.
[Release integrity and individual file hashes](vendor/dsh-world/origin.json)
and the [upstream license](vendor/dsh-world/LICENSE) accompany the package.
Core's scoped prompt registration, request-series restart and retirement of old
prompt content adapt `src/promptSection.ts`, `src/worldScope.ts` and
`src/runtime.ts`. Emotion uses this placement for its expression contract.

Pinned commit: `d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f`.

- `src/life/tools.ts` -> `src/core/matters.ts`: Adapted native scoped tool registration and text-rendered structured receipts; no life scheduling or persona defaults imported.


MIT License

Copyright (c) 2026 ckz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Dafeiyu desktop animations and stickers

The pinned, unmodified PetSprite shell, input, playback, motion, window-fit,
geometry, pointer-target and shared modules are copied under `vendor/dsh-pet/`
from PC2005-cloud/dsh-pet commit
`c7ea8b28e2a8b04a495a3b472a871dff6969ccca` (MIT). `origin.json` records their
hashes. `scripts/build-desktop-animation.mjs` verifies them, copies the runtime
modules to `src/desktop/helper/upstream/` and compiles the shared TypeScript into
its classic-script `shared-core.js`. The adapted `body.html` retains upstream
layout/styles; `shell.js` connects the original PetSprite to local media and the
native Core/Emotion bridge. No upstream setup/build hooks are executed. The MIT
license is retained in the vendor directory and packaged helper. Earlier custom
body implementations are rollback artifacts, not active renderers.

The transparent clips and reaction images in `src/desktop/assets/` are unmodified
media from [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)
at commit `c7ea8b28e2a8b04a495a3b472a871dff6969ccca`. The catalog maps their
original names to playback identifiers. The upstream project permits
noncommercial use of these media and requires attribution for adaptations.
The community character (溟月 by 上善无形, whale-tail design by ZipZipPipe) is
credited under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
These visual assets retain their original terms. See the
[upstream asset notice](https://github.com/PC2005-cloud/dsh-pet/blob/0e6465f29bb89b386390ba0f14fb86fa1bc656d0/README.md#许可).

## dsh-chatbot batching reference

The completed-turn / idle / minimum-interval policy and retry progression in
`src/memory/batch.ts` are adapted from the installed MIT dsh-chatbot
0.5.0-local.1 `src/host/native-chat.ts`. Its separate memory store and extraction
model loop are not copied. Native DSH compaction and Mnemosyne retain ownership.
The PC2005-cloud MIT notice above applies to this reference.

## chenkezhen480/dsh-world

The isolated-preset service lookup in `src/memory/batch.ts` adapts
`src/console/homeApply.ts` (`compactionFor`) at commit
`d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f`. No world plugin is activated.

MIT License

Copyright (c) 2026 ckz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Additional dsh-pet Desktop features

The earlier MIT pin `0e6465f29bb89b386390ba0f14fb86fa1bc656d0` supplies the native whisper/model-selection helpers,
balance registry/providers, todo store/routes/reminder policy and shared panels.
Verbatim source files and hashes are recorded under `nativeFiles` in
`vendor/dsh-pet/origin.json`. Local adapters bind them to DSH services and the
companion Repo. The original three sleep clips, click sound, font, cursor images and interaction text
pools retain the upstream asset terms and attribution above; their origins and
hashes are recorded in that same file. The 0.4.7 distribution also supplies the speech recorder, recognition and synthesis adapters, voice registry, queue and cache. Its released browser client and presentation runtime are recorded in `vendor/dsh-pet/platform/origin.json`. The native host scopes them to the bound companion.
