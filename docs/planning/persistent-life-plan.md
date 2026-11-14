# Persistent life plans and cross-conversation continuity

Updated: 2026-11-13. Status: base delivery, autonomous-continuation follow-up and plan-write/receipt repair installed for owner testing; acceptance pending. The later [autonomous-life integration](autonomous-life-game.md) and audit repairs remain uninstalled; the [current handover](../handover/README.md) owns their current candidate and verification status.

The [owner-confirmed design update](autonomous-life-game.md#owner-confirmed-design-update)
is now authorized for implementation and isolated verification. It
confirms Room/Desktop mirroring, no starter resources, the configurable
four-hour initial offline body allowance, confirmed adjustable gentle defaults
(70% maximum hunger/thirst/bladder need, 35% minimum energy) and the income-side
settings boundary. Worse pre-existing states are not healed and absence does
not add pain penalties.
It does not change the personal installation. Current source evidence belongs
to the [implementation record](../validation/life-design-implementation-2026-11-14.md);
missing media and owner acceptance remain distinct delivery gates.
The owner selected supplementary desktop animation assets through the existing
pipeline to address known gaps; this is not yet evidence of their delivery or
complete visual mirroring.

The owner authorized implementing persistent current-life planning, unified
activity scheduling and continuity across native conversations. The later
[virtual economy extension](economy.md) was separately authorized for source
implementation and subsequently installed after a later owner instruction. Plan installation was separately
authorized and completed; personal-data migration and test execution remain
outside this work. The owner retains functional testing and acceptance.
Current delivery status belongs to
the [handover](../handover/README.md); build evidence belongs to the
[runtime record](../mvp-runtime.md#persistent-life-plan-source-delivery-2026-11-12).

## Confirmed scope and open choices

The companion may plan a sustained activity, rest or doing nothing. A model
turn decides intent and reconsideration conditions; deterministic code executes
accepted operations and records their actual progress. A short animation ending
does not end a life activity. Room and Garden must not insert independent goals
between steps of the current plan. Talking with the owner does not discard that
plan, and opening, switching or archiving conversations must not create another
planner or another execution of the same operation.

Desktop is Room's adjunct. While Room is open, Desktop fully mirrors its actual
activity, phase and progress. While Room is closed, Desktop presents the original
accepted plan at its actual progress. Window changes do not reset, duplicate or
reconsider the plan. This presentation relationship does not transfer Body
ownership or require Desktop to be enabled for Room to operate.

The authorized integration preserves incidental owner care without cancelling
accepted work. Temporary inventory-food ownership retains the original operation
for safe return unless cancelled/replaced; unresolved settlement blocks another
meal instead of losing that return. Explicit new instructions still supersede
prior intent. Domain facts use native delivery without forcing a new plan-save
decision. Owner conversations can observe committed facts even with Life off.
Deadline scheduling uses the existing executors and unrounded Body conditions;
the source is verified only by isolated code tests, not an installed owner trial.

Identity, self-description, diary and eligible long-term memory retain their
existing ownership. The current-life plan describes what is happening now and
what remains intended, not another biography or memory bank. Native channels,
speaker attribution and permission boundaries remain authoritative. All
persistent companion data stays in the bound workspace; normal operation must
not depend on the development checkout.

Planning horizon, wake frequency, minimum dwell, interruption thresholds and
the fallback review policy are implementation choices, not fixed product
limits. The current change must not turn illustrative durations into mandatory
cadence or replace rapid automatic motion with a dense permanent task list.
The current tools and existing console snapshot expose the plan. Direct file
editing is not a second executable control path.

## Source findings and reuse

| Existing responsibility | Evidence and selected reuse |
| --- | --- |
| Native Life runtime, home opener and alarms | [Life adapter](../../src/life/plugin.ts), [World life exports](../../src/world/life.ts) and [vendored runtime](../../vendor/dsh-world/lib/life/runtime.js): retain native session execution, alarm delivery, budget and lifecycle handling. |
| Persistent intent adapter | [Current plan implementation](../../src/life/plan.ts): extend the existing Life store instead of creating another plan database or conversation runtime. |
| `plan_next` and `check_alarm` | Keep the existing native wake/alarm capability; persistent intent supplies why and what to resume instead of treating the home chat as the only durable plan. |
| Core shared home and personality records | [Companion foundation](../../src/core/companion-foundation.ts): preserve the shared native opener, SOUL/USER, canonical self/diary locations and scoped prompt replacement. A home session is an execution venue, not the companion's identity. |
| Physical execution | [Behavior](../../src/behavior/plugin.ts) and [Room adapter](../../src/behavior/room.ts): keep one serialized writer for the selected body's movement, action progress and Garden jobs. |
| Home/Garden deterministic mechanisms | [Home state](../../vendor/feiyu-room-template/home-state.js) and [Garden caretaker](../../vendor/feiyu-room-template/src/garden-autonomy.js): reuse pathfinding, physical progression and receipt-bearing jobs; remove independent automatic goal selection from the unified planning path. |
| Current identity projections | [Pet platform](../../src/desktop/platform/plugin.ts) replaces presentation names/personas and routes normal chat to native execution. The upstream default template's existence alone is not proof of ordinary-chat persona contamination. |

The inspected Behavior prompt calls `buildHomePromptLine` without the upstream
`includeIntro` flag. Its dynamic body section previously belonged to enabled
Life. Therefore the useful body/room relationship should be a short Core-owned
section available independently of autonomous Life. It should not blindly turn
on the upstream QQ-specific introduction or add a prohibition on narrative
action descriptions. An actual action requires an execution result regardless
of how the model describes it in prose.

## Module ownership and persistent data

| Module | Responsibility |
| --- | --- |
| Core | Own companion identity, workspace binding, records and scoped context admission. Supply a concise shared body/room relationship and actual state to eligible owner conversations. |
| Life | Own the one current plan, plan revisions, the planning turn, reconsideration reasons and native wake scheduling. Serialize changes for the current companion/workspace. |
| Behavior | Own accepted operation IDs and deterministic Room/Garden execution. Report accepted, moving, active, complete, paused, failed or blocked from actual state. Do not choose replacement life goals. |
| Room/Pet surfaces | Present the same body's state and forward authorized interactions. Desktop fully mirrors actual Room activity while Room is open; when closed, it presents the retained plan/progress. Animation completion is a presentation receipt, not permission to schedule another life goal. |
| Memory and diary | Keep original evidence and meaningful completed experiences through their existing interfaces. Do not independently write current plan state or create another assistant. |

Use the existing `.chatpet/data/life/life.json` as the authoritative current-life
record, with top-level `planRevision` and a versioned `currentPlan`. Preserve
unrelated existing Life fields, including compatible home/alarm metadata. The
selected current-plan shape includes:

- `id`, `revision`, `companionId`, `storageId`, `goal` and `reason`.
- A bounded set of intended activities, their order or conditions, and the
  selected current activity. Rest or an empty future queue is valid.
- `cursor`, stable `operationId`, `execution`, accepted state and actual result.
- A resolved `dispatchUntil` persisted before initial dispatch, so a retry does
  not recalculate a relative activity duration from a later clock value. Body
  pause/resume preserves remaining execution time in its durable receipt.
- Pause, continuation, completion and reconsideration conditions.
- `nextConsiderAt`, `reconsiderWhen`, `triggeredConditions`, `pauseReason`,
  `replanReason`, `createdAt` and `updatedAt`.

The existing console state snapshot and a concise natural-language tool/context
summary are derived from this state. No additional Markdown plan file is
introduced. Model prose does not overwrite executable progress, fabricate
completion or become a parallel memory system. Existing Body/Garden state
remains authoritative for physical facts; Life references its stable receipts
rather than maintaining a second independent body simulation.

The shared Life state has a 64 KiB technical storage boundary, with submission
validation and a write guard. This is an input/storage safeguard, not a product
limit on activity duration, planning horizon, quiet time or model-call frequency.
Room/body operation IDs and labels also have technical validation. A rejected
oversized proposal must leave the previous accepted plan and execution intact.
Routine physical progress updates do not change the intent revision used by
concurrent model submissions; explicit intent changes still require that revision.

## Tool and context interfaces

`life_plan_read` reads the current plan/state; `life_plan_update` submits or
revises intended activities with an expected plan revision; and
`life_activity_control` controls the accepted activity and its pause/continuation
state. The autonomous-continuation follow-up adds `life_plan_keep` to acknowledge
a considered decision to continue or wait without replacing the plan or its
operation receipts. Retain
`plan_next` and `check_alarm` for native wake scheduling. Revisions and stable
operation IDs make retries observable and prevent another conversation from
re-executing an already accepted operation. Tool availability and execution
authorization remain separate from the prompt.

Core obtains `CompanionLife.currentPlanSummary(workspaceId)` synchronously and
read-only, including when autonomous scheduling is disabled. The body summary
is prepared through Behavior's existing snapshot interface before its
synchronous projection. Reading this context must not start Life or make a
model call. Binding and service instances are checked again after asynchronous
preparation so a workspace switch cannot inject stale private state.

Private plan context is limited to eligible, unarchived owner conversations in
the bound native workspace. Guest/channel sessions retain their existing
authorization and privacy projection; a shared companion identity does not
grant groups the owner's plans, USER file or privileged tools. Prompt sections
use the existing native reassembly/replacement mechanism rather than appending
another copy on every turn.

## Planning, execution and recovery flow

1. An authorized planning opportunity or meaningful event resolves the selected
   workspace and reads current plan, actual Body/Garden state and relevant
   existing personality/experience. The native runtime supplies the model turn.
2. The model proposes intent, duration/continuation conditions and the next
   consideration time. Life validates and persists a revision before dispatch.
3. Behavior admits an operation once and returns its stable receipt. Native
   ticks advance movement and work without calling the model for each animation.
4. Completion, failure, owner interruption or a material state change updates
   progress and determines whether the accepted plan can continue or needs a
   later model reconsideration. Ordinary animation endings do not wake it.
5. Owner conversation can inspect and change the same plan through authorized
   tools. It does not implicitly become a new planner or reset accepted progress.
6. A native alarm wakes the planner when due. If it arrives while another turn
   or activity owns execution, preserve pending intent instead of overlapping
   planning turns or dispatching the same work twice.

On a model failure, keep the last accepted plan and receipt. Deterministic work
already accepted may reach its supported safe completion or pause point; no new
goal is generated from the old automatic rules. Preserve the failure and next
eligible retry/reconsideration state. Restart recovery reconciles the plan with
actual operation receipts before scheduling more work. Do not claim universal
exactly-once effects without that reconciliation.

The [offline body policy](autonomous-life-game.md#offline-body-policy) owns the
approved configurable allowance (initially four hours) for additional negative
body changes and the gentle ceiling, without healing pre-existing conditions.
Only real, already accepted recovery work may restore needs for its accepted
duration. Explicit pause freezes passive body/crop time; enabled crop growth uses
its separate elapsed time. Neither elapsed absence nor a restart invents choices
or experiences, and repeated reads do not reset the allowance.

Archiving the execution conversation may require a replacement native venue,
but must not erase the plan, regenerate persona or replay an accepted operation.
Multiple owner conversations observe one plan revision and one execution owner;
they retain their own native histories and channel/speaker boundaries.

## Autonomous-continuation follow-up

The owner authorized continuing repairs after source inspection identified
three gaps: restarting without a plan or configured wake time could leave Life
unstarted; exhausting finite steps without a next consideration did not create
a planning opportunity; and a normal model reply without a saved decision was
treated as successful planning. This follow-up reuses native greetings, alarms,
pending delivery, turn receipts, the existing Life queue and native backoff.
It does not restore the old body/garden goal generators or add another runtime.

- Enabled Life with no plan or pending planning work gets one initial native
  consideration, including after app restart. A saved empty plan is a deliberate
  quiet choice, not a missing bootstrap. Disabled Life never starts itself.
- The final actual operation completion creates one consideration when no
  next time is already chosen. The receipt/cursor transition is persisted with
  that event; it does not repeat on every tick or increase the intent revision.
  Empty plans and indefinite activities do not manufacture completion events.
- Each autonomous native wake is tracked to its actual message admission and
  matching turn end. A reply or read alone is not a saved decision. The model
  may update a plan, explicitly keep the current plan, or pause/cancel it.
  Empty steps with a reason and a null next time explicitly choose waiting.
  `planDecisionRevision` is the explicit saved-decision receipt; alarm edits
  retain their intent revision but do not impersonate that receipt. Technical
  retry projections do not increase the intent revision.
- `life_plan_keep` retains IDs, current operation and physical progress. It
  cannot silently resume a paused plan or certify an unfinished failed/waiting
  operation as continuing. Such work needs explicit recovery or revision.
- Missing decisions receive a bounded correction opportunity using native
  backoff. The budget and recovery status persist in existing Life state;
  exhaustion is visible and retains actual work rather than scheduling forever.
  New owner intent supersedes obsolete recovery. Existing model-selected alarm
  times are preserved. Ordinary model/network errors retain native retry policy.
- The optional portable setting `planningRepairAttempts` accepts a nonnegative
  safe integer; null uses one correction attempt and zero disables automatic
  missing-decision correction. This is a retry guard, not an activity cadence.
  Old four-field Life preferences remain readable without a reset or read-time
  rewrite. No new mandatory wake time, horizon or dwell threshold is introduced.
- Pending planning blocks a second autonomous delivery until its turn receipt
  is settled. Owner interruption, scope/cancellation, newer intent and replaced
  wake identities are checked after entering the existing queue; session events
  do not wait on that queue from native persistence callbacks.

Owner acceptance should additionally cover starting with no activity command;
one finite-plan completion followed by autonomous continuation or explicit
waiting; keeping an activity without resetting its progress; a reply that
omits saving; correction exhaustion and restart; and owner changes while the
old wake is ending. These cases remain owner-run, not source-review acceptance.

## Compatibility and old-rule disposition

Retain physical constraints, body progression, pathfinding, in-flight job
completion and safe interruption mechanisms. Retain explicit owner commands.
Exit the room's idle/time/need-driven goal selection and Garden's independent
success-to-next-job loop from the new unified scheduling path. Do not leave a
legacy fallback that silently resumes continuous dispatch when no plan exists
or the model is unavailable. A missing plan is a valid quiet state until an
authorized planning opportunity occurs.

Adapt compatible old state when the code is installed and explicitly used in a
later authorized step: preserve unknown fields and original physical progress,
introduce only missing technical structure, and reconcile already accepted
work before allowing new dispatch. Do not invent past goals, experiences or
wallet balances. This source task does not run migration against personal data.

## Separately authorized economy extension

The broader goal is a virtual economy supporting farming, sales, purchases,
gifts, persistent belongings and voluntary labor/rest choices. Money, inventory
and trade completion require deterministic validation and accounting. Existing
Garden trade/job capabilities are reuse candidates, not evidence that books,
food storage, gifts and a unified wallet are already complete.

The base installed plan delivery did not introduce these features. The owner
has since approved free basic food/water, optional paid food/readings/supplies
and owner grants/gifts. The latest confirmed target gives new companions no
starting money, gardening supplies or system gifts; the owner supplies starting
funds/items. Target daily income, crop yield and crop buyback prices are not
owner-customizable. Shop goods sold to Xiaoxi may be customized; older purchasing-
power figures are historical calibration rather than fixed goals. Implementation,
recovery and the distinction between earlier delivery and this latest
update belong to the [economic owning plan](economy.md). Real
payments, mandatory earning and scripted harvesting remain outside scope.

## Delivery sequence and owner acceptance

| Stage | Result and acceptance focus |
| --- | --- |
| 1. One durable plan | Plan revision and actual progress survive a conversation switch and restart; no identity/self/diary/Memory reset. |
| 2. One execution schedule | Room and Garden accept work through the same ownership path. Long activities and rest persist after clips end; no idle-gap automatic goal insertion. |
| 3. Native planning and recovery | Reuse native planning turns and alarms, reconcile receipts and support pause/resume/reconsideration. Model unavailability preserves progress. |
| 4. Shared native context | Owner Room/Pet/main conversations read the same current plan/body state; guest and group conversations do not acquire private state or owner tools. |
| Separate economy extension | Owner-approved wallet/items/readings use this same plan, Body and native runtime; see the economy plan. Installed after later owner authorization; functional acceptance remains owner-run. |

The owner can exercise these scenarios in the installed build:

- Ask for a sustained reading/rest activity, keep the room open and observe
  multiple animation clips without a new unrelated activity or model turn.
- Move between Room, Pet and a newly created owner conversation; ask what is in
  progress and resume the same accepted activity, with no duplicated dispatch.
- Interrupt with a message or explicit instruction, then continue; verify that
  the actual receipt and remaining activity match the interruption.
- Finish a Garden job; verify that it does not immediately start another task
  outside the plan and that Room and Garden cannot own conflicting activities.
- Make the model temporarily unavailable; verify no automatic-rule fallback,
  no invented completion, and recovery from the same persisted progress.
- Archive the current planning conversation or restart DSH during movement or a
  job; verify that changing the venue does not replay the accepted operation.
- Submit a conflicting revision from another owner conversation; verify a clear
  stale/reconcile result rather than a second schedule or repeated transaction.
- Open an external guest/group conversation; verify the existing privacy and
  permission boundary with no private current-plan disclosure.

Source inspection, compilation, runtime tests and owner acceptance are distinct
evidence. No stage above is accepted merely because code compiles. The current
source work must report compilation and installation status separately from
functional acceptance. Runtime/model tests and personal-data operations remain
unexecuted.

## Source delivery notes

The owner subsequently authorized a focused repair after installed plan
execution exposed an internal JSON/publication error. It preserves completed
body receipts, reconciles unacknowledged waiting progress by stable operation ID
and clarifies tool parameters using existing execution paths. The repair was
subsequently installed under separate owner authorization; its evidence and
verification limits are in the
[runtime record](../mvp-runtime.md#plan-write-and-room-state-repair-installation-2026-11-13).

The base persistent-plan scope and autonomous-continuation follow-up are
implemented, compiled and installed, with owner acceptance pending. The original
planning tools and read-only Life card are part
of this source delivery. Existing physical incapacity checks remain execution
validation, not a new prescribed schedule. Relative activity duration freezes
while paused; an explicit absolute end time does not move. An expired deadline
that prevented execution produces a failure, not a fabricated completion.

Native failure retry retains the upstream backoff mechanism and persists its
next retry time; its in-memory attempt tier restarts with the process. No model
call, functional test or personal-data migration was performed. Installation
and read-only startup evidence for the current build are in the
[runtime record](../mvp-runtime.md#autonomous-plan-continuation-installation-2026-11-12).

## Review follow-up: serialized intent and deferred garden work

The owner authorized fixing the clean review findings while preserving existing
data and retaining testing/acceptance. Native `plan_next`, `cancel_alarm` and
failed-planning retries must use the same CompanionLife queue as plan changes
and awaited body controls. Their revision checks and mutations occur when the
queued operation runs. Session-event callbacks must not wait on that queue from
a native persistence/startup path. Obsolete retries must not alter or clear a
replacement wake.

`careNow` must reuse a running garden operation before considering interruption.
A paused or queued task is not evidence of currently doing work. Explicit defer
and the existing conflict-timeout default must preserve an identifiable task in
the existing garden queue/receipts, including its original wait dependency. The
request must survive save normalization and restart, must not revive automatic
goal generation, and must not prevent its own prerequisite activity from being
resumed. User-facing acceptance/status follows actual queued/running/paused
state; it must not claim the whole life plan resumed when only a garden action
was requested.

Owner acceptance scenarios for these repairs: concurrent plan replacement and
alarm changes; concurrent pause/resume and alarm cancellation; careNow during
running garden work; careNow with paused garden work; explicit defer, unanswered
conflict timeout and restart while deferred; continuation of the original
activity before deferred garden work. These scenarios are documented, not run.

A new tool-call ID must not prevent a later explicit force request from
reprioritizing the same deferred job. Newly established wait dependencies must
refer to the operation actually owning the blocking route/dwell/sleep, not an
old interrupted plan pointer. A conflict dialog retains its initially verified
prerequisite if that original operation is subsequently paused.
