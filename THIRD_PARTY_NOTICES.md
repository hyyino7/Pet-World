# Third-Party Notices

The following pinned sources are adapted in Core. Upstream applications are not bundled or activated. Core owns its product contracts, storage and permissions.

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
