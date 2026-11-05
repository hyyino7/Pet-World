# Voice: Expected Experience And Reference Scope

- Date: 2026-11-04, Asia/Ho_Chi_Minh.
- Status: Module inclusion confirmed; experience and transfer proposals under discussion.
- Confirmed: Voice is the eighth independent business module, shared by Desktop
  and QQ. Implementation may be staged without removing either consumer.
- Current work: Discuss outcomes and reference scope. No provider, engine,
  dependency, account, implementation or live validation is selected here.
- Ownership: This record owns the Voice experience discussion. The product plan
  owns scope; module design owns responsibilities; module contracts owns the
  future public protocol; reference study owns inspected upstream evidence.

## Intended Everyday Effect

Speaking, typing and receiving a voice message should continue the same
companion relationship and matters. Desktop and QQ share a configured voice
identity and recognition/synthesis capability, while retaining channel-specific
capture, playback and delivery behavior. Shared capability does not imply
identical audio bytes, transport formats or one global queue for all channels.

The following effects are proposals, not accepted detailed requirements:

| Effect | Representative experience | Limits and choices |
| --- | --- | --- |
| Understand spoken input | Speak on Desktop or send an owner QQ voice message, then continue an existing matter | Preserve original message/audio attribution and recognized text. Recognition can be wrong; allow correction. Missing provider confidence stays unknown. |
| Speak as the same companion | Replies use a consistent chosen voice across Desktop and QQ, with appropriate pace and expression | Engine/model/voice revisions remain identifiable. Expression support varies; no per-reply emotion-model call is assumed. |
| Preserve useful content | Names, numbers, units, dates and mixed-language terms remain meaningful when spoken | Do not copy Chinese-only filtering. Select supported languages and pronunciation cases with the user. |
| Continue text and voice naturally | A voice exchange has a corresponding readable conversation record; typing can continue it | A spoken rendering may be shorter only under an explicit policy with traceable source text. No silent change of commitments or claims. |
| Stop and correct course | Stop playback, mute capture, cancel transcription/synthesis or interrupt a reply as separate actions | Local playback stop is distinct from Core's Agent interrupt and from a QQ message already sent. Late work cannot revive a cancelled interaction. |
| Fail clearly and remain usable | Missing microphone, unavailable recognition or failed synthesis has a specific visible state; healthy text chat remains usable | Recognition failure cannot create invented owner input. Text fallback after a confirmed synthesis/send failure is a policy choice; unknown QQ sends require reconciliation first. |

## Interaction Modes To Discuss

| Mode | Product effect | Proposed disposition |
| --- | --- | --- |
| Read aloud | Play an existing reply on request or under a selected auto-read policy | Include in complete Voice planning; automatic playback defaults remain open. |
| Voice messages | Submit one recording; receive text and/or a generated voice reply on Desktop and QQ | Recommended representative flow for discussing shared-module behavior. Release order remains open. |
| Manually opened conversation | Start a voice session, take turns speaking/listening, retain text access and explicit mute/end controls | Evaluate a half-duplex interaction as a candidate, rather than describe it as simultaneous conversation. |
| Simultaneous conversation | Speak while the companion is speaking, with turn detection, echo handling and interruption | Retain as an open experience choice. Neither streaming nor natural barge-in is established by this study. |

Always-on listening, wake words, speaker identification, voice cloning, singing,
QQ live calls and automatic public voice contact are not implied by the confirmed
module inclusion. Their desirability and scope need a separate discussion.

## Responsibility Proposal

| Owner | Responsibility |
| --- | --- |
| Voice | Shared recognition/synthesis adapters, capability/readiness descriptions, voice profile revisions, bounded audio jobs and cancellation/status. Audio normalization needed by those jobs belongs here; no codec/library is selected yet. |
| Desktop | Microphone permission and device capture, recording controls, local output device/playback ownership, playback receipts and optional body synchronization. |
| QQ | Bound-account media acquisition and transport receipts, original message identity, voice-message send/reconciliation. A QQ message never enables the Mac microphone or speaker. |
| Core | Accepted conversation input, native Agent execution, reply identity, channel choice, admission/budgets and cancellation coordination. Owns audio bytes/catalogue/retention through resources. |
| Memory | Eligibility of remembered/derived material, transcript interpretations and corrections through the common source/view/use protocol. Voice never writes a separate memory store. |
| Console | Configuration, preview controls and health views delegated to their owners. Preview is identifiable and does not create owner conversation or memory. |
| Life | May propose a reason to contact the owner; receives no independent speaking or listening authority. |

Voice depends on Core and discovers optional speech providers through native DSH
services. Desktop and QQ use a shared Voice port when available; their text
functions do not require Voice. Optional dependency loss must not tear down
healthy text functionality. There is no new assistant/model runtime.

An input route is: channel obtains audio -> Core validates attribution/admission
-> Voice returns a source-bound transcript -> channel/Core applies the selected
submission policy -> Core starts the normal DSH conversation. Desktop may offer
transcript review before submission; QQ may use automatic submission for a bound
owner. These policies remain open. A transcription result alone is not consent
to submit it to an Agent or evidence that the owner intended the recognized text.

An output route is: Core records reply/contact intent -> Voice synthesizes a
bound rendering -> Core resources holds the artifact -> originating adapter
plays/sends it -> the adapter returns actual playback/transport status. Completed
synthesis is neither completed playback nor a delivery/read receipt.

Derived audio inherits the source text's eligibility dependencies. Before
synthesis, playback/send and ordinary replay, apply the relevant use checks.
Withdrawal prevents new use; active work reports what actually stopped. Already
heard or externally delivered audio cannot be described as recalled. Old cached
audio cannot bypass correction/withdrawal by being treated as an ordinary asset.

Voice owns its profile/job records and state-maintenance participation; Core
owns shared artifacts and maintenance coordination. Raw recording retention,
generated-audio retention and remote processing destinations remain explicit
choices. Disabling Voice releases its work and any owned service resources;
Desktop releases capture/playback and QQ retains actual delivery evidence.

## Reference Focus

Use [the Voice source study](reference-study.md#voice-shared-desktop-and-qq-capability)
for pinned sources, inspected files and transfer limits. Primary references are
dot for a combined speech capability and official DSH for recognizer lifecycle.
Surfpet supplies presentation arbitration; AIRI supplies audio lifecycle patterns;
fish-buddy supplies a secondary local-input comparison. No whole stack is adopted.

## Proposed Success And Failure Cases

These are discussion cases, not executed tests or additions to the numbered
release suite yet. Freeze measurable criteria only after the experience is chosen.

| Case | Success observation | Failure example |
| --- | --- | --- |
| Continue a Desktop matter by owner QQ voice | One matter and attributed transcript; relevant context continues; same selected voice profile for replies | Another persona/history or a transcript attached to the wrong exchange |
| Speak a name, amount and mixed-language term | Transcript and spoken result can be inspected/corrected without changing the intended request | Cleaning silently deletes a name, unit or language segment |
| Stop while synthesis or playback is pending | Actual stopped/unknown state is visible; late audio cannot play automatically | Stopped audio starts again after a delayed response |
| Open chat while a bubble is speaking | One intended local playback owner; no doubled audio | Bubble and chat simultaneously read the same reply |
| Lose recognition or synthesis independently | Specific failure and usable text path; recognition produces no invented input | Global Voice health hides the healthy direction, or success is reported without audio |
| QQ voice send times out, then binding changes | Original target/attempt remains fixed and unknown until reconciled | Automatic text fallback or resend duplicates an uncertain voice message to an old/new target |
| Correct/withdraw material after audio was cached | New ordinary play/send is rejected or regenerated from eligible content | Cached voice repeats withdrawn content despite corrected text |
| Sleep/wake, change device, disable Voice or close DSH | Capture/output and owned jobs stop or reconcile; healthy text functions remain available | Orphan microphone, delayed old playback or duplicate submission after reconnect |

## Decisions Still Open

Discuss desired speaking character, required languages and proper-name handling,
voice-message versus open-session interaction, transcript review/auto-submit,
read-aloud defaults, expression strength, latency tolerance, local/cloud policy,
audio retention and release sequence. Measure capture/recognition, Agent reply,
synthesis and first playback latency separately. Account for optional expression
inference and format conversion as well as ASR/TTS work; choose no numerical
limits from an upstream example.

Detailed Voice public types, capability IDs/events and compile-only examples
remain an explicit Stage 0 gap. Complete planning requires those contracts after
this outcome/reference discussion, before any Voice implementation. Existing
contract 0.2 type checks cover seven baseline modules, not Voice.
