# Dafeiyu Reference Study

Date: 2026-11-04, Asia/Ho_Chi_Minh.
Scope: Inform a new DSH-backed companion product. These projects are references,
not a proposed installation bundle or automatically accepted requirements.

The user named SurfCore, surfpet, dsh-dafeiyu and dsh-dafeiyu-room. The room
project links QCYTSN/dsh-dafeiyu as its target, supporting that resolution of the
otherwise ambiguous dsh-dafeiyu name. It is distinct from dsh-dafeiyu-dot.

## Inspected Sources

| Reference | Inspected commit | Declared state |
| --- | --- | --- |
| [Mieksido/surfcore](https://github.com/Mieksido/surfcore/tree/0deb8261afe4c31b3127759ee4de36a1439cf422) | `0deb8261afe4c31b3127759ee4de36a1439cf422` | README 0.8.8; Windows-targeted system |
| [Mieksido/surfpet](https://github.com/Mieksido/surfpet/tree/d825d236a2afb760c15b9332eee3a8ccad1958a4) | `d825d236a2afb760c15b9332eee3a8ccad1958a4` | README 0.2.0; Windows desktop client |
| [QCYTSN/dsh-dafeiyu](https://github.com/QCYTSN/dsh-dafeiyu/tree/084323845ab82b68d5388d5c638bec09d8544a8a) | `084323845ab82b68d5388d5c638bec09d8544a8a` | README 0.1.23; macOS Helper remains experimental |
| [bearyluo/dsh-dafeiyu-room](https://github.com/bearyluo/dsh-dafeiyu-room/tree/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed) | `e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed` | 0.6.4-preview.1; SDK 0.2.1-rc.5 target |

Evidence consists of README/design documents and selected source reads. No
upstream application, tests, model calls, accounts, or desktop windows were run.
Maintainer-reported tests and screenshots describe their conditions, not ours.
Earlier Windows installation exclusions do not diminish value as design references.

## SurfCore: A Shared Character Across Scenes

The [architecture document](https://github.com/Mieksido/surfcore/blob/0deb8261afe4c31b3127759ee4de36a1439cf422/docs/guides/ARCHITECTURE.md)
describes shared persona, memory maintenance, purpose-based outreach and usage
accounting across QQ, Bilibili and the pet. Different external conversations can
have different DSH sessions while sharing the character. Memory ingestion has
one maintenance owner and scene-specific context projections.

The inspected [purpose engine](https://github.com/Mieksido/surfcore/blob/0deb8261afe4c31b3127759ee4de36a1439cf422/src/purpose-engine.js)
separates computation from I/O and distinguishes whose goal and what kind of
evidence supports a candidate. The bridge owns actual delivery. This is useful
for choosing meaningful activity without making a timer synonymous with a motive.

**Transfer:** Own the persistent companion independently of execution sessions;
collect experiences centrally; build context for each scene; coordinate contact
and resource use in one place. Keep semantic proposals separate from dispatch.

**Do not inherit automatically:** Windows ACL/setup, SnowLuma-specific bindings,
fixed pricing/cadence, role cards or the complete bridge/control plane. Its own
architecture notes acknowledge large bridge coupling and source-path/reload costs.
These are reasons to design explicit interfaces, not proof of a runtime defect.

**Important limit:** [pet-chat source](https://github.com/Mieksido/surfcore/blob/0deb8261afe4c31b3127759ee4de36a1439cf422/plugins/surfcore/lib/pet-chat.js)
uses DSH's `llm.stream` with assembled persona/memory and a separate pet history.
Shared persona and memory do not establish a shared native Agent execution path.
Our desktop assistant should initially use the native Agent path; any later
light-chat optimization needs the same record, memory and action semantics.

## Surfpet: Presentation Without Owning The Character

The [chat design](https://github.com/Mieksido/surfpet/blob/d825d236a2afb760c15b9332eee3a8ccad1958a4/docs/CHAT.md)
and [connection source](https://github.com/Mieksido/surfpet/blob/d825d236a2afb760c15b9332eee3a8ccad1958a4/src/main/surfcore.ts)
describe separate pet, bubble and chat windows. The client connects to SurfCore
through a discovered local endpoint and credential; transport lives outside the
renderer. Host boot identity and event cursors handle reconnects and port changes.
Focus mode is coordinated with QQ, and audio playback has one active owner.

**Transfer:** Keep windows, input, playback and animation in the desktop client;
keep identity, memory, activity decisions and delivery selection in the core.
Preserve reply-to-message navigation and a shared focus/pause state.

**Do not inherit automatically:** Electron/Windows deployment, default timeouts,
reply clipping, speech behavior, or credentials in media URLs. Its documented
reconnect strategy can discard an event across a restart. Use durable history and
delivery state to recover meaningful messages; ephemeral visual events can expire.
Do not treat an event cursor as proof of reliable message delivery.

## DSH Dafeiyu: Host-Owned Desktop Lifecycle And Real Status

The [overview](https://github.com/QCYTSN/dsh-dafeiyu/blob/084323845ab82b68d5388d5c638bec09d8544a8a/README.md)
places native companion startup/shutdown under DSH. [Protocol source](https://github.com/QCYTSN/dsh-dafeiyu/blob/084323845ab82b68d5388d5c638bec09d8544a8a/src/protocol.js)
defines versioned newline-delimited messages and separate task states and alerts.
The [Swift entry point](https://github.com/QCYTSN/dsh-dafeiyu/blob/084323845ab82b68d5388d5c638bec09d8544a8a/native/macos/Sources/main.swift)
reads input and exits when the parent stream ends. Native rendering does not own
the Agent's reasoning or fabricate progress.

**Transfer:** Let DSH supervise the Mac helper; use a small versioned boundary,
explicit connection state, real task signals, and orderly shutdown. Distinguish
decorative reactions from work progress. Native Mac presentation is a concrete
candidate rather than an assumed cross-platform port.

**Limits:** This is primarily an Agent status companion, not evidence of complete
private-assistant chat or memory. The [acceptance log](https://github.com/QCYTSN/dsh-dafeiyu/blob/084323845ab82b68d5388d5c638bec09d8544a8a/docs/ACCEPTANCE.md)
separates CI/contributor reports from missing Mac hardware checks. Our multi-screen,
click-through, focus and sleep/wake behavior remains untested.

## Dafeiyu Room: Model Decisions And Local Body Execution

The [overview](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/README.md)
and [host integration](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/src/index.js)
add environment context and observe/plan tools to the existing Agent. The model
selects activities; a local engine supplies motion, furniture interactions and
continuous rendering. A plan being accepted is explicitly different from finishing.

[Life state](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/src/life.js)
applies completed action receipts once and maintains virtual items separately
from chat/persona memory. [Runtime state](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/src/runtime.js)
checks ownership and revisions, limits idle decisions, and pauses on errors.
Offline display is labeled local rest; the source avoids simulating deprivation
or meals over downtime.

**Transfer:** The model chooses meaning and intent; a deterministic local engine
checks feasibility and executes body actions. Preserve requested, accepted,
running, completed, interrupted and failed distinctions. Ambient animation need
not call a model. Environmental state should not force narration into every reply.

**Do not inherit automatically:** A room as a product requirement, furniture,
needs scores, virtual inventory, Beijing defaults, Android/LAN features, or an
independent idle scheduler. Our product needs one activity coordinator across
room, browsing and assistance. A virtual phone action is not a real QQ action;
an animated reading pose is not proof of reading an external source.

The [cost note](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/docs/token-cost.md)
counts example injected context separately from autonomous-turn cost. Adopt that
measurement distinction, not its example token quantities as our forecast.
The [verification record](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/docs/verification.md)
is a preview's maintainer evidence, not proof of our host or final experience.

## Dispositions For Our Product

| Responsibility | Proposed treatment | Reason / required evidence |
| --- | --- | --- |
| Identity, memory and cross-scene activity | Design our own coherent core; borrow SurfCore's ownership pattern | User selected an independently designed product; session and scene lifetimes differ. |
| Model/session/tools runtime | Keep DSH as host; implement a bounded adapter | Existing host supplies execution; exact installed-version capabilities need confirmation. |
| Desktop client | Own Mac-first client; compare native AppKit helper with Electron | Native lifecycle reference exists; actual rich-chat/room fit and maintenance cost are untested. |
| Body / room | Borrow command/receipt/local-engine pattern; evaluate a web renderer | Separates visual simulation from costly decisions. A full room remains a proposed view. |
| QQ transport | Adopt OneBot/NapCat interoperability; own channel mapping and delivery policy | Ordinary-account requirement persists; no new QQ protocol implementation is justified. |
| Bilibili access | Reuse an established compatible tool/connector behind our adapter | Own activity intent and experience ingestion; avoid rebuilding site parsing without a concrete gap. |
| Persistence | Compare SQLite transactions with simpler file storage before selecting binding | Durable identity, concurrent receipts, memory edits and delivery status require coherent commits. |

Reference code and assets have separate provenance. The reviewed source license
notices identify MIT code in SurfCore, surfpet and DSH Dafeiyu, and Apache-2.0 in
the room project. Bundled third-party components and character art have their own
notices. These observations do not authorize wholesale copying or settle asset
rights. No upstream code or art was copied into this repository in this study.

This study supports a new design proposal. It does not establish that every
reference is mature, correct, approved, compatible with the user's Mac, or a
dependency of the future product.
