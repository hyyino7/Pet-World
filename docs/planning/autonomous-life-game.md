# Autonomous companion life

Updated: 2026-11-13, Asia/Ho_Chi_Minh. Status: the earlier integration is source
implemented; integration and audit-repair candidates remain uninstalled, with
owner acceptance not run. The owner has now authorized implementing the update
below and repairing the two remaining P2 findings. Source/code evidence belongs
to the [implementation record](../validation/life-design-implementation-2026-11-14.md).
Supplementary drinking, reading, gardening and trade clips now use the existing
asset pipeline; [media evidence](../validation/life-media-2026-11-14.md) separates
code/media delivery from installed visual acceptance. No installation is implied.
The owner selected supplementary desktop animation assets through the existing
asset pipeline, rather than replacing Desktop with Room-character rendering.
Eight new clips and their photo fallbacks share one installed asset set between
Desktop and Room 2D. Optional 3D/custom-pack appearance remains separate acceptance.
The [current handover](../handover/README.md) owns the candidate and verification
status rather than a historical checkpoint in this plan.
This is the integration plan for the discussion and execution plan
in this chat. No new engine, assistant runtime or memory bank is introduced.

## Outcome and accepted boundaries

One Xiaoxi owns the same identity, memory, body, possessions and current life
across native conversations, Desktop and Room. The LLM chooses intentions and
reconsideration; the existing deterministic executors implement accepted work.
Long activities, rest and an explicitly empty plan remain valid. Animation,
arrival and ordinary waiting do not request model decisions. Reading requires
actual versioned text; no elapsed-time or animation-based reading completion.

The [persistent plan](persistent-life-plan.md), [economy](economy.md) and
[portability](../portability.md) retain their respective responsibilities.
This plan owns interaction delivery, interruption continuity, lightweight native
planning and low-power integration; it does not replace those domain plans.

The owner authorized implementation after reviewing execution plan v1.0.
Development verification is limited to source/type/build checks and isolated
code tests with disposable data, fake clocks, model adapters and display APIs.
Do not launch DSH/Electron windows, use real model accounts, exercise the personal
workspace, install, commit or publish as a test. Actual installed functionality,
model understanding, platform behavior and power acceptance belong to the owner.

## Owner-confirmed design update

These decisions replace the former open choices. Source progress and code
checks are separate from complete visual delivery and installed acceptance.

| Area | Confirmed goal | Owning detail |
| --- | --- | --- |
| Room and Desktop | Desktop is Room's adjunct. While Room is open it mirrors the actual Room activity, phase and progress completely; when Room is closed it presents the same accepted plan and actual progress. | [Presentation contract](#presentation-contract) |
| Starting resources | No starting coins, gardening resources or system gifts. The owner supplies starting funds/items; free basic food and water remain available. Existing saves are preserved. | [Initialization](initialization-and-companion-identity.md), [economy](economy.md) |
| Offline body | Bound additional negative body changes by a configurable allowance, initially four hours. Confirmed configurable gentle defaults: hunger/thirst/bladder at most 70%, energy at least 35%; never heal a worse pre-existing state or invent offline experiences. | [Offline body policy](#offline-body-policy) |
| Economic settings | Target daily income, crop yield and crop buyback prices are not owner-customizable. Shop goods sold to Xiaoxi may be customized. Life rhythm and device resource budgets remain configurable. | [Economy](economy.md) |

## Work packages and dependency order

| Package | Outcome | Dependencies |
| --- | --- | --- |
| P0 | Reuse inspection, fact/delivery/interruption/time contracts and test boundary | Existing sources |
| P1 | Domain-owned durable interaction facts and idempotent requests | P0 |
| P2 | Native fact delivery and receipt reconciliation | P1 |
| P3 | Incidental reactions preserve activities; temporary ownership returns safely | P0/P1, integrate P2 |
| P4 | Scoped native tools/context for autonomous decisions | P0/P2 |
| P5 | Correct delayed deterministic phases, then deadline/event scheduling | P0/P3 |
| P6 | Presentation visibility lifecycle and bounded rendering | P0, parallel |
| P7 | Isolated composition, fault and compatibility tests | P1–P6 |
| P8 | Reviewed source, package, evidence and owner acceptance handoff | P7 |

## Fact and delivery contract

Body effects and their facts share the existing atomic home checkpoint.
Economy facts share its existing SQLite transaction, request receipt and ledger.
Each fact retains a stable domain/id/request, actual actor/channel, occurrence
time and result. An observation delivered by the system is not an owner message
and cannot grant owner permissions. Repeated requests reuse their receipt; changed
payloads conflict. Legacy ambiguous events are never promoted to known owner acts.

Native Life reuses its pending/steer/step/reconcile path. The pending record owns
only bounded fact references and delivery coordination; domain facts remain the
authority. Facts are not invalidated by a new plan revision and do not force a
plan-save decision. Native step admission, successful model processing, language
response and long-term Memory admission are distinct. Undelivered facts cannot
expire with a display-summary TTL. Owner native prompts can read committed facts
even with autonomous Life disabled. Original native roles, channels, histories
and permission checks remain in force.

Core registers both original interaction facts and their native system-envelope
ancestors with the existing Memory observation queue. Complete ancestry is
required for derived replies/summaries; system observations retain system
authority. Desktop automatic inference checks enabled Life intent independently
of native-runner readiness, so unavailable inference cannot admit a parallel
thought chain. The [cross-module verification](../validation/autonomous-life-integration-2026-11-13.md)
records these repairs and the code/owner test split.

## Activity and time contract

Incidental care does not cancel an accepted route/dwell/read/garden operation.
Temporary inventory-food ownership retains the prior operation for a return
only if it remains valid, is not cancelled/replaced and its dependencies permit.
Relative durations freeze while paused; absolute deadlines do not move.

The owner confirmed on 2026-11-14: attempted feeding or water while actually
asleep preserves sleep and asks for an explicit wake first. It performs no
eating/drinking effect or consumption and does not wake automatically. A
repeated rejected request remains the same unchanged result; a later new request
after waking can be accepted through the existing care path.

Actual sleep starts on arrival/entry into sleep, not the request or trip to bed.
A wait/hold is not an implicit wake operation. Relative-duration pause/resume also
preserves the corresponding active presentation progress; it cannot spend the
paused interval on intro movies while freezing the activity's own duration.

Delayed progression follows existing accepted route/arrival/dwell boundaries,
including awake/sleeping body-rate segments. Do not replay every elapsed second
or fabricate unissued jobs, reading, conversations or new goals. The confirmed
offline body policy below replaces the former open cap decision. Model alarms and
backoff remain native; physical boundary scheduling does not share model retry
semantics. Body owns the need formulas. Life registers the current persisted
plan's conditions instead of implementing another needs simulator.

Persisted enabled clock intent survives restart independently of model/native
readiness. Accepted work can advance while inference is unavailable. Explicit
disable/re-enable freezes paused need time rather than treating it as offline
living; neither transition creates new intentions or experiences.

### Offline body policy

The owner approved this policy and subsequently authorized its implementation.
Code verification is recorded separately; installed acceptance remains pending.
Closing or hiding a presentation does not itself make Life offline or paused;
the one enabled background life continues independently of drawing.

- Additional negative body change during an offline absence, such as hunger,
  thirst or fatigue, counts at most a configurable elapsed-time allowance. Its
  initial setting is **four hours**, not a fixed product limit.
- A separate gentle severity bound prevents a long absence alone from creating
  urgent maintenance or new lasting penalties. The owner confirmed adjustable
  initial values of **70% maximum hunger, thirst and bladder need**, and **35%
  minimum energy**. These bound new deterioration; they never heal or clear a
  worse condition already present before the absence and do not add pain penalties.
- An already accepted sleep or other activity with a real recovery effect may
  recover for its actual accepted duration, stopping at the activity's endpoint
  or normal body maximum. Rest/idle animation alone does not grant recovery, and
  elapsed absence does not extend a completed activity or invent another one.
- Explicit Life pause freezes passive body consumption and crop time; re-enable
  does not catch up the paused interval. Manual accepted work retains its existing
  semantics. Model/network unavailability preserves accepted safe work and waits
  when a new choice is needed; it does not authorize substitute goals.
- Crops separately advance through real elapsed, enabled-life time up to maturity
  or water exhaustion. The four-hour negative-body allowance does not limit crop
  growth. Elapsed time alone never orders harvest, sale, replanting or rewards;
  previously accepted valid work may reconcile once.
- Do not fabricate offline food, drinking, reading, conversations, decisions or
  diaries. Reopening a window or rereading state cannot grant a fresh allowance
  for the same absence.

## Presentation contract

Desktop is an adjunct presentation of Room's companion. When Room is open, Desktop
must **100% mirror its actual activity, phase and progress**; it cannot start a
conflicting idle, random, emotional or work action. When Room is closed, Desktop
plays the activity from the same retained plan and actual progress. Opening,
closing or switching windows does not create a new plan or restart an activity.
Missing activity media, including a neutral pose with an accurate label, remains
a presentation gap rather than fulfillment of this mirroring goal.
The confirmed remedy is to supplement the corresponding desktop animations,
reusing the existing asset pipeline and companion identity. Selecting this route
does not mean the assets have already shipped or passed visual acceptance.

This product relationship does not transfer Body authority or require Room to
depend on an enabled Desktop component. Room remains independently usable.
The source implementation retains the same activity selection while hidden or
minimized, suspends drawing/media and joins the latest shared phase on display
recovery. This does not make the window a life clock. See the
[playback verification](../validation/playback-logic-2026-11-14.md) for code evidence
and the remaining installed/asset acceptance boundary.

Room closure terminates its presentation process. Hidden/minimized/locked
presentations stop business drawing, display polling and unnecessary media work.
Resume obtains the newest authoritative snapshot and rejects stale revisions.
Visible moving and quiet scenes use different rendering rates; these are
technical presentation controls, not life schedules. Native change notifications
remain primary. Preserve necessary transparent-window input/platform protections.
Neither Desktop nor Room starts a second world or settles business effects.

### Detailed action vocabulary under review

The owner subsequently requested a finer distinction between movement phases,
drink containers, food forms, emotional rest and head-touch responses. The
[action vocabulary proposal](companion-action-design.md) records these variants
as proposals and reuse candidates, not an accepted full asset-production list.
Common playback logic is being implemented first. Its code checks do not accept
the current media, establish all variants or authorize installation. Missing
object/intent/emotion metadata must not be fabricated to choose a specific clip.

## Code verification and owner acceptance

Code verification covers request replay/conflict, transactional failure,
post-commit notification failure, native delivery/restart/ack races, coalescing,
actor/privacy boundaries, temporary return/cancellation, clock jumps, sparse
scheduling, hidden/resume/disposal, real text/reading versions and economic
reservation settlement. Tests use actual domain code and storage with injected
external boundaries, not duplicated implementations as expected results.

Owner acceptance after installation covers: shared identity across surfaces;
long activities and quiet plans; accurate immediate feeding perception;
continuous interactions; interruption/return; grounded reading and bookmarks;
free basics and voluntary economic choices; unavailable models; restart;
hidden/lock/sleep recovery; transparent input and fullscreen; complete workspace
continuity. Destructive fault cases stay on disposable code fixtures.

Measure DSH baseline, background-only, Desktop idle/moving, Room idle/moving,
hidden/resume and both surfaces on the same device/display/power conditions.
Observe full related process trees, CPU average/p95, steady memory, GPU activity,
wakeups and model call reasons/tokens. Initial discussion budgets (background
CPU <=1% of one core and incremental memory <=250 MiB; visible idle <=3%/500 MiB;
moving Room <=10%/500 MiB) are candidates, not measured results or accepted limits.
Freeze actual budgets only from the owner's device evidence. Device resource
budgets and life-rhythm controls remain configurable; technical settings do not
impose a daily activity schedule or income quota.

## Preservation, release and open product choices

The dirty baseline is retained under `.cache/autonomous-life-game/baseline/`.
Preserve unrelated changes and existing personal data. Missing authoritative
stores must not become fresh blank stores. Program rollback must respect schema
compatibility and must not overwrite later personal facts with older data.

The owner confirmed adjustable initial gentle bounds of 70% for negative needs
and 35% minimum energy, alongside the configurable four-hour initial allowance.
They are initial settings, not immutable balance rules. Remaining details include fine action/asset variants, supported shop
customization fields and measured device budgets. Hidden/minimized code behavior
is recorded in the presentation contract and still needs installed acceptance. These do not reopen the four confirmed decisions above. Do not
add wages, starter gifts, travel-time rules or new need penalties implicitly.

Delivery evidence belongs to [runtime records](../mvp-runtime.md); current status
belongs to [handover](../handover/README.md). Source checks and a package do not
establish installed integration or owner acceptance.

The earlier source delivery completed P0–P8 to the code/package handoff boundary;
that evidence predates the owner-confirmed design update above. The
[owner trial](../handover/autonomous-life-owner-trial.md) contains the detailed
functional and resource acceptance steps. Technical defaults are a 400 ms fact
coalescing window, a 16-fact native batch, moving Room <=30 FPS and quiet animated
Room <=6 FPS; static scenes can render on demand. These implementation controls
do not choose life activities or fix model wake frequency. Store failures retain
the overdue physical boundary and wait for a genuine recovery event or explicit
read rather than hot retrying. Body conditions use unrounded authoritative needs.
