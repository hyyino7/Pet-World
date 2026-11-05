# Local Environment And Restoration

This file owns toolchain/restoration details. Setup observations below date to
2026-11-04; [the handover](handover/README.md) owns current work and the later
installation snapshot. Setup checks establish preparation, not product acceptance.

## Tools

| Tool | Version / location |
| --- | --- |
| Node.js | 24.21.0, `.tools/node`; official distribution, SHA-256 checked |
| pnpm | 11.25.0, `.tools/pnpm` |
| TypeScript / Node types | 5.9.3 / 24.10.0, pinned development dependencies |
| DSH development packages / Cordis | 0.2.1-rc.5 / 4.0.5, pinned development dependencies |
| Python | 3.12.14, `.tools/python` and `.venv` |
| uv | 0.12.5, existing installation reused |
| Swift / Apple developer tools | 6.4 / `/Library/Developer/CommandLineTools`, existing installation reused |

Use `source ./scripts/env.sh` in the current shell. Bootstrap did not replace
global tools or run upstream lifecycle hooks. Framework, gateway and memory
provider dependencies require their own selection; source downloads do not install them.
The development SDK version is distinct from the installed DSH app version.

## Restore When Needed

From the repository root on the selected Apple Silicon Mac:

```sh
python3 scripts/setup-runtime.py
source ./scripts/env.sh
pnpm install --frozen-lockfile --ignore-scripts
python scripts/fetch-references.py
pnpm run check:env
```

These are restoration operations, not a routine startup checklist. For deliberate
dependency changes, update the lockfile with `pnpm install --ignore-scripts`.
Native lifecycle hooks require a specific decision.

## Reference Library And Caches

The [index](../references/INDEX.md) and [manifest](../references/manifest.json)
record 32 pinned sources: nine shallow Git checkouts and 23 official GitHub
commit archives. Preserve commit identities and licenses. LFS payloads and
submodule dependencies were not fetched; no source for the Bilibili whitepaper
was established. Read/adapt reference code without running its setup/build hooks.

`references/sources/`, `.tools/`, `.venv/`, `node_modules/`, `dist/` and `.cache/`
are ignored local assets. Cached reference archives support checksum verification;
installation archives/metadata may be referenced by the installed profile. Failed
reference downloads/partials and compiler/package caches have separate purposes.
Inspect use before removing a cache; do not delete the whole tree as routine cleanup.

## Preparation Evidence

The setup record observed official Node checksum verification, SDK imports,
reference identities/checksums, TypeScript checks, `APPKIT_OK`, Python SQLite/TLS
imports (SQLite 3.53.1), script syntax, documentation links and Git scope checks.
Archive checks verify cached bytes/markers, not every extracted file. None of
these checks establishes desktop UX, memory quality or QQ/Bilibili operation.
Later Core implementation/evidence belongs to [the runtime record](core-runtime.md).

Repository path: `/Users/hy-yin/Developer/Codex Repo/Codex-Pet`. The original
setup recorded local `main` with no remote/publication and Codex project ID
`487765b7-a121-416a-9535-8a7a5bfff3a3`; refresh Git/project state when relevant.
