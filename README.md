# Her World

A modular DSH-backed companion sharing identity, memory and life across native
chat, Room and Desktop. This checkout contains the current implementation only.

## Install or update in DSH

Open **Plugins → Add plugin**, enter the same repository address for installation
or a replacement update, then enable Her World:

```text
https://github.com/hyyino7/her-world
```

No custom plugin index is required. Disable the old `dsh-Chatpet` bundle before
first enabling Her World. The owner reported a successful installation on
2026-11-14; broader functional acceptance is separate. The known caretaker
pause/resume replay P2 remains unresolved, so releases remain prereleases.

## Source layout

| Path | Purpose |
| --- | --- |
| `src/` | Current TypeScript/runtime code and built-in media, grouped by module |
| `src/core/native/` | Native DSH chat, Memory, transcript and prompt adapters |
| `tests/` | Domain tests, current regression cases and explicit manual fixtures |
| `scripts/build/` | Deterministic build/media generation |
| `scripts/checks/` | Release/package checks and explicit native/manual checks |
| `scripts/lib/` | Shared setup, storage and lifecycle helpers |
| `vendor/` | Required bundled upstream code and license/origin records |
| `art/` | Source artwork used to regenerate the current life media |
| `dist/src/` | Current prebuilt runtime required by direct GitHub installation |
| `references/manifest.json` | Origin/commit/license provenance, without reference clones |
| `docs/` | Current development, settings, portability and release instructions |

- [Development and verification](docs/development.md)
- [GitHub installation and release workflow](docs/github-updates.md)
- [Settings](docs/settings.md)
- [Portable storage](docs/portability.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Historical plans, handoffs, audit reports, local packages, temporary workspaces
and research checkouts are not retained in this working tree. Companion data
and device configuration belong outside this repository.
