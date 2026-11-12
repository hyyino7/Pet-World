# Native companion service refactor

Status: implementation authorized on 2026-11-12 (Asia/Ho_Chi_Minh): the owner
approved proceeding after review of Claude's `大肥鱼重构方案.md`. This record
owns the amended execution direction; it does not claim implementation or owner
acceptance. The preceding four-feedback delivery remains the rollback baseline.

## Selected behavior

- DSH owns ordinary conversation execution, streaming, tools and permissions.
  Ordinary owner requests do not allocate Core activities/executions or inherit
  Core's 12-step, 24-tool-call or 120-second autonomous limits. Autonomous Life
  and unsolicited Room television input retain explicit source admission and
  bounded execution. Distinguish input origin within a shared home session.
- Core supplies the bound workspace, persona, editable foundation, settings and
  storage. Persona changes apply on the next turn, without cancelling a current
  reply. Workspace, account, route and tool authority remain deterministic and
  use native services; removing duplicate execution gates does not remove them.
- Each input surface retains its native conversation. Memory uses the same
  existing Bank across verified owner and registered external conversations.
  Guests keep separate native sessions/directories and cannot use owner tools
  or mutate Memory through tools. Existing group-local capabilities remain.
  Trusted speaker/account/group identifiers must be visible in recalled text;
  visitor statements must not be promoted to owner statements.
  Guests share SOUL (the companion's persona), not the whole static USER owner
  profile on every request. Shared Bank retrieval remains available as selected.
- Shared Bank access includes sharing recalled owner information with registered
  visitors, as described in the reviewed proposal. Speaker labels identify
  origin; they are not confidentiality filters. Preserve route authorization.
- On each native turn, replace the prior recall using the existing context
  provider with recent conversation material. Observe attributed user inputs
  and final assistant text at completion; retain stable keys and the provider's
  required source roots. Do not automatically ingest tool output. Provider
  failure or Memory-off removes the previous recall block and permits chat.
- The Memory switch applies to the current turn, superseding the earlier
  new-conversations-only enrollment policy. Do not backfill Memory-off history.
  Ten-turn/idle summaries and archives remain product behavior, with their
  adapters repointed to the new per-turn observations rather than removed Core
  execution records. Retain pending summaries and full original transcripts.
- Forget/correct changes future Bank retrieval. It does not erase native logs,
  previously visible dialogue or independent emotional state. Do not promise
  that an old conversation can never mention a retained original. Withdrawn
  observations must not be replayed as new records merely by retrying storage.
- Emotion remains one independently readable/editable file when Memory is off
  or unavailable. Retain legacy text and optional Room numeric values; nine
  semantic labels (happy, calm, sweet, heartache, worry, sad, jealous, anger,
  boredom) do not require invented numeric scores. Same-reply footer updates
  may update the shared emotion from registered guest conversations without
  granting them owner tools.
- Behavior owns actual activity; Emotion owns feelings and expression intent.
  Desktop and Room consume a versioned projection with surface-specific asset
  mappings. An expression must not cancel eating or wake a sleeping body.
  Missing media uses an accurate activity label and neutral presentation.
- Retain existing Life, garden, album, Qzone, matters, speech adapters, custom
  packs and settings. Thin upstream adapters are reuse, not proof of incomplete
  functionality. Verify actual paths before replacing them.

## Delivery sequence and evidence

1. Preserve the entire dirty source tree, patch, current installed archive and
   existing preservation copies before edits. Keep the original caches and
   installer backup. No commit or publication is implied by this direction.
2. Refactor ordinary native chat and per-turn Memory together with their
   downstream adapters, so an intermediate delivery does not leave Emotion,
   album, matters, summary or archives dependent on removed admission records.
3. Complete shared presentation wiring: real playback reports into Emotion,
   saved work-animation delay on the normal host, bounded third-party playback
   queries, event-driven state refresh and consistent activity fallback.
4. Verify supplemental capabilities and implement file-level offline recovery.
   Declare whether native DSH histories are restored or intentionally retained;
   copying `.chatpet/` alone is not a whole-profile rollback. Check hashes and
   preserve the current state before replacement. Retain current external-send
   receipts/deduplication and actual usage; only internal companion state is
   rewound. File-level recovery cannot undo an external publication or cost.
   Never test recovery on live personal data.
5. Remove unused legacy plumbing only after callers have moved. Use runtime-
   matching SDKs where available without replacing global tools or installing
   unreviewed upstream hooks. Do not use a line-count or zero-cast quota as a
   substitute for correct public contracts.

Verification must cover ordinary multi-step requests, current-turn persona
stability, Life-off owner channels, every input's shared Memory read/write,
disabled/unavailable Memory with no stale recall, speaker attribution, summary
and archive continuity, scope rebinding, all nine emotion labels, eating/sleep
precedence, actual playback feedback, work-animation timing, restricted playback
queries, and backup integrity/restore behavior. Use temporary fixtures and
native services without paid inference or real-account delivery. Source checks,
fixture integration and installed owner acceptance are distinct evidence.

Prepare a concrete package after relevant checks. Personal installation,
physical microphone/account delivery and owner trial results must be recorded
separately; neither a test pass nor this document establishes them.

## Baseline

- Branch `main`, HEAD `676bd65f61a0086249575d4077cd0587950b8b36` with extensive
  unstaged/untracked implementation; staged scope empty.
- Source/patch/hash snapshot:
  `.cache/native-service-refactor/baseline-20261112T041831Z/`.
- Supplementary copy outside the checkout:
  `/private/tmp/codex-pet-refactor-baseline-20261112T041831Z/`. This temporary
  location is not the sole durable backup; retain original caches and the native
  installer backup.
- Installed rollback build `99a9fb2a2fd9`; current refactor source is not installed.
