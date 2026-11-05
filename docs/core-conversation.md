# Core: Continuous Dialogue And Matter Completion

- Updated: 2026-11-05, Asia/Ho_Chi_Minh.
- User-authorized scope: prioritize upstream reuse and complete continuous
  dialogue -> chat-created matter -> execution progress -> result reply, with
  special attention to harmful hardcoding.
- Evidence record: Earlier implementation checks used the installed native DSH
  runtime and the configured real model. This is not current execution status or
  product acceptance; see [the handover](handover/README.md) for reconstruction.
- API: Product contract 0.3; SDK remains 0.2.1-rc.5 / Cordis 4.0.5.

## Observable Flow

1. A trusted channel supplies a paired owner's input; Core authenticates,
   deduplicates and stores the source/message before native handoff.
2. Core projects bounded eligible dialogue and current matters. Another channel
   or a restarted Core uses the same companion/scope records. Native execution
   sessions remain disposable, avoiding unreviewed opaque native history.
3. The native model interprets the full request. Ordinary conversation needs no
   matter. An assigned outcome can create or continue a matter via scoped tools.
4. The model records concrete progress, revises the matter, or records a waiting
   dependency. Missing quantity, deadline or other facts are not guessed by a parser.
5. The model stores a substantive analysis result with admitted evidence. Core
   validates state/revision/source scope, commits the result and returns its receipt.
6. The final non-tool reply returns through `host.chat()` and native observation,
   with a pending contact tied to the original channel/account/recipient. A tool
   receipt or intermediate commentary is not delivered as the final reply.

A finished model turn never automatically finishes a matter. A recorded analysis
is a model interpretation, not proof that a purchase/message/other external action
occurred. QQ/Desktop transport and external-action providers remain separate.

## Reuse Actually Applied

| Pinned upstream | Reused implementation | Core adaptation |
| --- | --- | --- |
| whale `8b0009f8ce` `lib/session-delivery.js` | Promise-tail delivery serialization and failure isolation | `src/core/upstream/serial-delivery.ts`, used by execution; persisted intents/receipts remain Core-owned |
| dot `ff288f57a2` `lib/session.js` | Successful-turn final non-tool reply projection | `src/core/upstream/messages.ts`; removes singing/persona coupling and does not concatenate intermediate planning |
| dot `lib/memory-tools.js`, world `d0b0ba7116` `src/life/tools.ts` | Native schema/tool registration and structured text receipts | `src/core/matters.ts`; no memory extractor, inherited persona or private Bank is copied |

Exact commits, source/target files and adaptation limits are recorded in
[`references/manifest.json`](../references/manifest.json). Complete MIT texts and
copyrights are retained in [third-party notices](../THIRD_PARTY_NOTICES.md), also
included in package files. Upstream files/origins/commits are not modified, and
upstream setup/build/plugin hooks are not run. SurfCore's broader autonomous
budget and other platform-specific flows remain reference candidates, not falsely
reported as copied or operational in this batch.

## Public Connections

- `host.chat(context, incoming)` admits input and returns the resulting activity,
  final reply, pending contact, related matters and progress. It uses the same
  services as channel adapters, not another assistant runtime.
- `CoreService.getConversationTurn` queries that read model.
- `CoreService.listCommitmentProgress` queries durable progress records.
- `pet/matter.progress` is the native live observation; reconnecting clients
  query authoritative records and can deduplicate by `progressId`.
- Native model tools: `pet_matter_list`, `pet_matter_read`, `pet_matter_create`,
  `pet_matter_update`, `pet_matter_progress`, `pet_matter_finish`.

The model never receives an owner context issuer or identity/policy/account/
resource/shell dispatcher. A tool is bound to one admitted execution and native
session, observes cancellation/quiescence, validates expected revisions, and
can reference only sources admitted or read in that execution. Tool-call IDs
provide idempotency; repetitions cannot create duplicate progress/completion.

Create/read/update/progress/result records survive restart. An interrupted native
run records actual waiting/interruption for touched unfinished matters. Unknown
native handoffs remain unknown and are not replayed. A new owner message can
continue the same stored matter; it does not fabricate offline progress.

## Direct Dialogue And Memory Eligibility

Contract 0.3 corrects the foundation's overly broad dependency on an absent Memory
module. Core owns raw authenticated conversation and current matters; these can
support dialogue continuity before an extracted Memory Bank is implemented.
This is not a second memory service or an unguarded native-session fallback.

Context is generated only by Core from its scoped records, not from arbitrary
caller sections. Future queued inputs and unrelated reports are excluded. Generated
replies carry delivery status instead of claiming that the owner necessarily saw
them. Every generated result retains the full source dependency lineage.

When a trusted source-eligibility provider is attached, Core persists that it is
required. Ineligible records are omitted/withheld; losing the provider does not
restore access, even after restart. Source checks run before native steps, tool
execution, final result publication and new contact attempts. Matter-tool reads
expand both the live and persisted execution dependencies, so withdrawal between
steps also blocks old tool results. Cancellation and actual receipt/control
handling remain available. Raw owner audit retains its explicit privileged purpose.

The current synchronous host guard is an integration seam, not implementation or
acceptance of the full Memory view/use lease and cross-process withdrawal protocol.
Caller-provided Memory views and derived Memory resources remain rejected without
that protocol. Full Memory integration/forgetting acceptance remains open.

## Hardcoding Review

| Boundary checked | Actual implementation |
| --- | --- |
| Intent and matter classification | Native model + typed tools. No production `if`/regex/keyword table detects assignment, progress, cancellation or completion from chat text |
| Answers and task progress | Generated from supplied conversation and actual tool receipts; no preset business answer, comparison formula or success phrase in Core |
| Persona and relationships | Required host configuration + persisted identity; no inherited whale persona, owner nickname or fixed relationship score |
| Paths/accounts/model route | Trusted host configuration; live test reads the configured DSH provider/model. Credentials stay in native read-only services and are never logged |
| Limits | `conversation` settings own history/context/step/tool/time limits. Shared defaults and validated upper bounds are explicit implementation policy; zero tool allowance hides the tools |
| Contract names/permissions | Stable tool IDs, state enums, scope checks, revision checks and allow-lists remain deterministic. These are controls, not semantic substitutes |
| Fixtures | Scripted responses and numerical expected results live only in test scripts. The real-model check uses the configured native account adapter, not the scripted model |

`CONTRACT_VERSION` now has one shared definition. No user sentence, machine path,
account ID, reference character or sample expected answer selects production
business behavior. This is an author source review plus behavioral evidence,
not a claim that model judgment is always correct or independently accepted.

## Verification And Limits

Observed on 2026-11-05:

| Evidence | Result | What it establishes |
| --- | --- | --- |
| Type/build + 27 behavior tests | Passed | Persistence/replay, boundaries, source-lineage withdrawal/provider loss, scoped matter tools, evidence denial and chat continuation |
| Installed native runtime with a scripted local model | Passed; ten turns, seventeen local model calls | Real native tools/events/JSONL persistence, multi-turn chain/restart, tool/step budget denial, mid-turn withdrawal, cold reconciliation and cancellation |
| Existing configured real model | Passed; `deepseek-account / deepseek-flash`, four owner turns, twelve model stream calls | Natural Chinese chat delegation, progress/waiting, same matter after restart, supplied-data calculation/result reply, and quoted task words without mutation |
| Personal config/credentials | Byte hashes unchanged | Live test used existing authentication read-only; no new sign-in, installation or profile edit |

The retained [real-model evidence](validation/core-conversation-live-2026-11-05.json)
contains synthetic inputs, observed replies/progress, expected quantities and a
compiled Core digest. In that final run, the model retained one matter across
restart and computed 6 units at 11/16 per unit as 66/96, selecting the 2-day option
under a 3-day condition. Those numbers are fixture inputs/observations, not product
rules. A casual final turn produced no matter mutations. Reports contain no keys,
tokens or personal conversation history.

An earlier sandboxed live attempt could not reach the API; the authorized network
run passed. The installed Electron's codesign diagnostic is separate from the
successful assertions and exit status. Real-model observation is still a bounded
author acceptance scenario, not general semantic quality or user acceptance.

Reproduce using [Core runtime commands](core-runtime.md#verify). The local latest
full live report is ignored at `.cache/core-live/latest.json`; the retained JSON
is the dated evidence, not a promise that future model runs produce identical words.

Remaining scope: Desktop/QQ UI and transport, full Memory and Voice providers,
autonomous activities/allowances, external execution tools, complete guarded
restore, long-running operation and the full CC/V/A acceptance suites. Core's
conversation-and-matter flow is operational independently of those future modules.
