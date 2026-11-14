# Project Plan: DeepSeek Harness Dafeiyu

- Project ID: `dsh-dafeiyu`
- Revision: v0.1
- Status: Discovery and route-selection draft; architecture not accepted
- Prepared: 2026-11-04, Asia/Ho_Chi_Minh
- Retention: This file is the project continuity entry point. Saving does not commit or arrange backup.
- Knowledge state: Requirements support route comparison; a combined installation is not yet verified.

## Desired Outcome And Confirmed Context

The user wants a blue fat fish desktop companion installed for their DeepSeek
Harness (DSH), using established plugins where practical. It should provide
persistent chat, a memory system, a desktop pet, and an independent ongoing life,
including exploring Bilibili. It should have its own QQ identity so the user can
chat with it through QQ.

The user explicitly selected local operation: it operates while the Mac and DSH
are running in the background; shutting down the Mac stops its activity. Server
hosting is not required. Mac sleep and wake behavior still needs verification.

These facts come from this engagement's user messages and three clarification
answers. Earlier companion designs are historical evidence, not accepted
requirements for this new project. No specific personality, message frequency,
model budget, account registration method, or memory implementation is selected.

## Overall Direction

The working recommendation is a DSH-centered companion with one persistent
identity and one owned memory system, accessed through both desktop and QQ.
This is a design candidate, not a verified combination of available plugins.

The responsibilities are:

- DSH executes conversations and permitted activities using its configured model.
- The desktop pet provides the visible character, chat entry, and activity display.
- QQ is another communication channel for the same companion. An official bot
  identity is the first candidate; a conventional personal QQ account would need
  a different gateway and operating setup.
- Memory retains user preferences, conversations, and the companion's actual
  experiences with their sources. Corrections and forgetting must remain usable.
- A background activity mechanism chooses between chatting, exploration, ongoing
  interests, and rest within explicit operating limits. Its state is inspectable
  and pausable; user interaction takes priority.
- Bilibili tools retrieve actual content. The companion can describe what it
  accessed and how, preserving links and distinguishing metadata, subtitles,
  sampled frames, and fuller media analysis.

Example whole workflow: the user tells the fish a preference at the desktop;
later the fish explores a relevant Bilibili video and records an actual experience;
the user asks about it in QQ; the same companion answers from that experience and
retains the preference after DSH restarts. Animation or a scheduled invented diary
does not satisfy the autonomous-life requirement.

Public commenting, posting, spending coins, contacting other people, and reading
the user's unrelated project files are not necessary to establish this workflow.
Their scope remains undecided. Reading Bilibili and replying to the paired owner
must not silently enable those additional actions.

## Existing Local Installation

Read-only inspection on 2026-11-04 established:

- App: `/Applications/DeepSeek Harness.app`, version `0.2.1-rc.5`.
- Profile: `/Users/hy-yin/.dsh/profiles/desktop`.
- Installed directories contain `dsh-pet` `0.3.8` and `dsh-chatbot` `0.5.0-local.1`.
- The profile bundle list registers `dsh-chatbot`, not `dsh-pet`.
- The inspected chatbot configuration sets its main pet's display to `none`.

These are file observations, not proof of the running process's state. No plugin
was installed, upgraded, enabled, or reconfigured during this discovery.

Historical audit notes helped locate these files. Current chatbot source still
contains the `mayControlMemory` path and a pending-memory condition that returns
an empty active-record list. Its previous reliability problem must not be assumed
fixed or inherited as the new project's foundation. Current runtime reproduction
and data migration have not been performed.

## Market Routes And Evidence

Primary project documentation was inspected on 2026-11-04. Capabilities below are
maintainer claims unless expressly identified as local observations. Repository
popularity and published tests do not establish compatibility or user acceptance.

| Route | Evidence and useful fit | Material gap and operating cost |
| --- | --- | --- |
| DSH plus selected plugins | `dsh-pet` provides the desired fish and desktop presentation. `dsh-plugin-memory` targets native DSH sessions. `dsh-qq-plugin` connects an official QQ bot to DSH. Bilibili extraction tools exist. | Composition is unverified. The pet's built-in chat calls the model directly and has its own conversation history; installing a native-session memory plugin does not establish shared memory. Session routing, background operation, and activity ownership need proof. Several plugins also mean several upgrade boundaries. |
| DSH companionship plugin | `dsh-dafeiyu-dot` documents source-backed memory, QQ through OneBot, and a configured DSH companion session. Its stated baseline is DSH `0.2.1-rc.3`, and it is in public beta. | Its documented widget is inside the DSH window. The required independent desktop fish and Bilibili life are not established. Adding another desktop or memory plugin could duplicate responsibility. |
| AstrBot-based companion | AstrBot has IM integrations. The `dafeiyu-astrbot` community deployment combines companion memory and autonomous Bilibili activity; a separate Bilibili AI plugin also documents exploration and content memory. | This introduces a second agent runtime. Reusing DSH's conversation identity, local desktop presentation, credentials, and memory needs additional integration. Some community features explicitly remain local tests or unverified live behavior. |
| SurfCore | Its documentation describes DSH, QQ, Bilibili, memory, and an external desktop companion as one workflow. | Its current README explicitly targets Windows, including platform-bound setup and gateway choices. It is a useful comparison, not a direct Mac installation candidate. |

Sources:

- [dsh-pet overview](https://github.com/PC2005-cloud/dsh-pet),
  [chat implementation](https://github.com/PC2005-cloud/dsh-pet/blob/main/dsh-pet/src/host/chat.ts),
  [feature boundaries](https://github.com/PC2005-cloud/dsh-pet/blob/main/FEATURES.md).
  The inspected upstream package declares version `0.4.1`; the user's local copy is older.
- [dsh-plugin-memory](https://github.com/LittleBlackTong/dsh-plugin-memory):
  native-session context injection, persistence, and memory operations; automatic
  collection scope and default cross-session behavior require inspection before adoption.
- [dsh-qq-plugin](https://github.com/xcisxc29/dsh-qq-plugin):
  official QQ channel, session management, and pairing. Its documentation describes
  a QR setup flow; availability on the user's account remains unverified.
- [QQ official starting guide](https://bot.q.qq.com/wiki/develop/api-v2/):
  official bot identities support individual conversations. This does not prove
  the user's entitlement, registration result, or proactive-message allowance.
- [dsh-bilibili](https://github.com/CZX2244/dsh-bilibili):
  content extraction, optional frame analysis, and a declared DSH version range.
  Extraction is not autonomous selection or sustained activity.
- [dsh-dafeiyu-dot](https://github.com/wz20/dsh-dafeiyu-dot):
  companionship session, memory, QQ, and window widget; public-beta status.
- [AstrBot](https://github.com/AstrBotDevs/AstrBot),
  [community Dafeiyu deployment](https://github.com/whyever77/dafeiyu-astrbot),
  [Bilibili AI plugin](https://github.com/chenluQwQ/astrbot_plugin_bilibili_ai_bot):
  reference implementations with separate runtime and deployment dependencies.
- [SurfCore](https://github.com/Mieksido/surfcore):
  combined workflow and explicit Windows applicability limit.

## Decision Readiness And Next Evidence

| Decision | Current state | Evidence needed and consequence |
| --- | --- | --- |
| Local versus hosted operation | User selected local operation | Verify background, sleep, wake, and restart behavior on this Mac; do not interpret downtime as an experience. |
| DSH-centered route | Recommended candidate | Inspect exact versions, interfaces, and failure behavior before selecting an install set. A proven coherent mature alternative may change this recommendation. |
| Shared desktop/QQ identity and memory | Blocked for final architecture selection | Trace a desktop input to a native DSH session and a QQ input to the same memory owner. Establish input routing and concurrent-operation behavior. If unavailable, estimate a bounded adapter or choose another route before installation. |
| QQ identity | Independent identity confirmed; official bot proposed | Confirm the official bot's pairing and delivery constraints. A personal-account identity would change gateway requirements. The user must complete account-side login or QR confirmation. |
| Autonomous life | Outcome confirmed; mechanism unselected | Inspect a mature activity mechanism against real exploration, durable activity records, idle/rest choices, interruption, restart recovery, and resource limits. Timed prompting alone is insufficient evidence. |
| Existing data reuse | Undecided | Inventory only data relevant to a selected migration. Preserve the current plugin and data; do not auto-import old persona, memories, or unresolved pending operations. |

## Delivery And Acceptance Proposal

The full goal retains desktop companionship, memory, autonomous activity,
Bilibili, and QQ. The following order tests dependencies; it does not redefine
the goal as a chat-only pet.

1. Establish an exact candidate set and responsibility map. Resolve the shared
   conversation/memory gap first, including any adapter work and its maintenance
   owner. Produce a concrete installation and rollback handoff.
2. In separately scoped operator work, preserve the existing profile and data,
   install/configure the selected components, and verify native-session chat and
   desktop presentation. Do not replace old memory in place as a shortcut.
3. Pair QQ with the owner. Verify desktop-to-QQ and QQ-to-desktop continuity,
   restart persistence, correction, forgetting, and concurrent inputs.
4. Add actual Bilibili exploration and background life. Set the operating budget
   and contact cadence with the user. Check provenance, interruption, service
   failures, sleep/wake recovery, and pause behavior.

Acceptance requires the complete example workflow above, plus a failed operation
that leaves unrelated valid memories readable. A reply must not claim a video was
watched when only its title was fetched, a message delivered without a delivery
result, or work continued while the Mac was off. User observation of conversational
continuity and a believable, nonintrusive activity rhythm remains separate from
technical checks.

No subscription, hosting cost, token budget, or completion date is estimated yet.
Relevant cost drivers are model calls for chat, memory maintenance and activity,
optional vision/transcription, disk use, and plugin integration maintenance.

## Review And Next Decision

Draft self-check retained the full requested outcome, compared complete operating
routes, and exposed the shared-memory integration gap and Mac applicability limits.
No runtime or independent evaluation has been conducted. No architecture approval,
account connection, installation success, or final acceptance is recorded.

The next decision is whether to pursue the DSH-centered route as the candidate for
compatibility investigation. Final component selection depends on demonstrating
one companion across desktop, QQ, memory, and background activity. This planning
engagement uses the repository's S0-S3 Skill; an installation handoff must name the
selected versions, targets, permitted changes, checks, and recovery steps.
