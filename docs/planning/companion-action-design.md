# Companion action vocabulary

Updated: 2026-11-14. Status: **design proposal, not an approved complete asset list**.
The owner requested detailed action distinctions while the common playback logic
is being implemented. Individual performances, visual quality, accepted variants
and production order remain to be reviewed. This document does not prescribe
schedules, new body effects, emotion scores or automatic life goals.

The owner subsequently directed a name-only, reuse-first asset allocation. The
[current name map](companion-animation-map.md) and its
[exact ID/file data](companion-animation-map.json) now assign every registered
movie and sticker, including combined/proxy uses and remaining dedicated gaps.
The owner approved implementing the reuse-first assignments in the shared
registry. The [delivery record](../validation/mapped-playback-2026-11-14.md)
distinguishes supported runtime selection, remaining dedicated/conditional gaps
and code verification from visual acceptance. Asset names can guide matching;
they do not establish what food/event actually occurred in the world.

The [life plan](autonomous-life-game.md#presentation-contract) retains the
confirmed one-companion, activity/phase/progress and low-power requirements.
The [asset inventory](../../.cache/asset-inventory-20261114/README.md) is local
investigation evidence, not a dependency shipped to the installed program.

## Dimensions and boundaries

Describe the actual activity, physical phase, object/container/tool, posture,
current companion emotion and interaction result separately. Different object
names do not always need different body motion: two cup drinks can share a sip
but carry different cups/content, whereas noodles, soup and a handheld apple
need different eating motions. Current whole-character WebMs are not modular
face/hand rigs; layered reuse is a design opportunity, not an existing capability.

Emotion may change compatible expression or motion, without changing the current
activity. Multiple feelings may coexist. Do not invent a fixed priority among
feelings, infer consent from an emotion, or call a model for every frame/tap.
An accepted compatible portrayal can continue until an actual relevant change.
Fallbacks preserve the real activity and report unavailable portrayal.

Missing authoritative object/temperature/intent metadata is a gap: do not infer
it from chat prose, an item name or the currently available video. Unknown food
may use an explicitly generic portrayal, not a false specific food. Receiving a
care fact and agreeing to a new activity remain distinct. Completed physical effects remain facts and cannot be undone or settled twice
by animation. The companion can still dislike what happened, move away, or
decline continued contact; occurrence and willingness are distinct.

## Movement

| Phase/context | Proposed visible action | Constraint |
| --- | --- | --- |
| Departure | Look toward destination, adjust weight, first step | Starts with actual accepted movement |
| Steady relaxed walk | Ordinary steps, natural arms | Progress matches actual route |
| Cheerful walk | Lighter steps, modest lively expression | Does not turn travel into dancing |
| Hurried travel | Forward intention, faster-looking cadence | Actual route/speed remains executor-owned |
| Sad/quiet travel | Lower gaze, restrained arms | Does not stop or create another destination |
| Tired travel | Smaller effort, subdued posture | Requires real fatigue; emotion alone does not fabricate exhaustion |
| Turn/corner | Left/right direction change | Follows route, not an independent random turn |
| Carrying | Cup/book/basket-compatible arms | Only a real held item; do not fabricate inventory |
| Arrival | Decelerate/stop, orient toward the real target | Starts activity only after actual arrival |
| Brief interruption/return | Safe pause, resume same route segment | No restart, teleport or new goal |

Front/side/back variants, start/steady/stop and carrying compatibility need review.
Existing walk/run/turn clips are reused only for the actual route. An admitted
right-turn hint mirrors the named left-turn clip on all managed surfaces; no
new pathfinding, held-item layer or arbitrary turn animation is claimed.

## Drinking

The general sequence is approach (if needed), take/receive the real container,
raise, drink, lower/return, then continue. No dedicated entry/exit clip is required
when an honest natural cut suffices.

| Object/context | Proposed distinction |
| --- | --- |
| Ordinary cup water | Hold cup, raise, sip, swallow, lower |
| Very thirsty | More intent/continuous drinking if actually chosen; no extra consumption per loop |
| Hot drink | Check/blow/wait before sipping only when real temperature is known |
| Straw container | Hold container and drink through straw |
| Bottle | Actual cap handling, tilt and lower when the item supports it |
| Owner-assisted water | Look toward source/receive, short drinking or acknowledgement, return |
| Already drinking/finished | Continue or acknowledge actual result; do not restart consumption |

The new drink clip is provisional. Old breakfast includes bread and cannot
silently stand for pure water. Drink temperature/container variants are proposals,
not an instruction to add new goods or a temperature simulator now.

## Eating

Owner-confirmed sleep boundary: feed/water while actually asleep preserves
sleep, changes no food/body effect, and asks to wake first. Wake is an explicit
separate operation. Trips to bed and quiet waits are not evidence of sleep entry
or waking; presentation follows the actual physical phase.

The common phases are receive/inspect, prepare the right utensil, bite/sip,
chew/swallow, brief pause, finish/put down. Prolonged activity uses a sustainable
middle rather than repeatedly receiving a fresh meal.

| Food form | Distinct motion/prop | Existing candidate |
| --- | --- | --- |
| Bowl rice/meal | Hold bowl and use appropriate utensil | 吃白饭, 吃午餐, 吃晚餐 |
| Noodles | Lift noodles, bring to mouth | 吃长寿面 |
| Porridge/soup | Spoon, small sips | 吃腊八粥; bowl alternatives require full review |
| Bread | Hold and bite | 吃早餐 as a name-based proxy; a dedicated bread-only motion is not established by its title |
| Rice ball/pastry | Handheld small bites | 吃饭团 requires separate food prop; 吃年糕/吃重阳糕 candidates |
| Dumplings/rice balls | Bowl/utensil and individual bites | 吃饺子, 吃汤圆 |
| Wrapped food | Unwrap, then eat actual contents | 吃粽子; full sequence still to review |
| Fruit | Hold or fork compatible with actual form | 吃西瓜; other fruit forms unverified |
| Packaged snack | Take from packet, bite, chew | 大口吃零食 |
| Ice cream | Hold cone/cup, lick/scoop | 吃冰淇淋融化; melting should match actual chosen portrayal |
| Skewer | Hold stick and take bites | 吃糖葫芦 |
| Festival food | Retain correct specific food/prop | 中秋赏月吃月饼, 吃青团, 吃重阳糕 |
| Shared pot meal | Pick up/cool/eat, retain scene compatibility | 涮火锅; optional richer activity |
| Crab/other special meal | Food-specific handling | 吃大闸蟹; optional richer activity |

Specific pictures must not assert possession of a different food. Shop visual
classification is separate from price, yield, effects and income settings.
The current Economy catalog does not yet carry this complete visual vocabulary.

## Rest by current emotion

| Emotion | Posture and sustained detail | Boundary |
| --- | --- | --- |
| Happy | Relaxed posture, soft smile, occasional gentle hum | Still resting, no automatic dance |
| Calm | Even breathing, blink, slow glance, stable pose | Long stillness is valid |
| Sweet | Warm gaze, small smile, brief shy glance | Affection remains contextual |
| Heartache | Gentle downcast gaze, lightly joined hands, quiet presence | Not physical pain |
| Worry | Slight brow tension, clasp/release fingers, look up | No invented emergency/search task |
| Sad | Lower gaze, restrained shoulders, slower quiet response | No endless crying or new punishment |
| Jealous | Slightly turned head, brief sidelong look, restrained pout | No automatic conflict |
| Anger | Tense brow, withdrawn arms, avert gaze, settle breathing | No automatic aggression or departure |
| Boredom | Look around, shift weight or rest chin, stare quietly | No random new game/task |

Standing, sitting and awake lying are separate posture variants. Napping is a
sleep activity, not an interchangeable awake-rest clip. Original idle/hum/look
are reusable bases. Under the owner's name-only reuse direction, the work-status
sigh can be a labelled one-shot dejection proxy alongside quiet rest. It does
not establish a dedicated sad-rest loop or a failed task; see the current map.

## Head touch by current emotion

All rows distinguish sensing, a willing response or declining further contact,
ending and returning. A sustained touch response requires actual continuing
contact and willingness; a single click never invents prolonged contact.
The currently chosen intent/activity constrains a full-body interruption.

| Emotion | First response | If willing | Ending / refusal |
| --- | --- | --- | --- |
| Happy | Look up | Smile, slight voluntary lean, brief cheerful response | Relax and return; may still decline when busy |
| Calm | Look toward touch | Blink/relax, retain pose | Quiet return or move head away |
| Sweet | Small shy pause | Voluntary lean/closed eyes | Retract naturally; shyness is not consent |
| Heartache | Refocus toward owner | Nod or quietly lean if desired | Remain quiet; may request space |
| Worry | Alert glance | Gradually soften without erasing concern | Return to actual concern or decline |
| Sad | Pause, raise gaze | Gently accept without forced smiling | Slow return, or turn aside |
| Jealous | Sidelong glance | Expression softens while remaining nuanced | Return; no instant emotion reset |
| Anger | Tense attentive look | Slight voluntary relaxation | Clear turn-away/stop gesture when declining |
| Boredom | Notice owner, curious glance | Short interest/smile | Return to current rest; no automatic play plan |

Sleeping touch may have a minimal response; only real waking starts wake motion.
During drinking/eating/tool use, feedback must fit occupied hands/body. Repeated
clicks coalesce rather than queue unbounded performances, force acceptance or add
punishment. A posted/completed touch fact is retained regardless of language reply.
A larger voluntary action/replan remains with the existing Life/Body authority.

Original happy/shy/pout/startle clips and stickers are candidates for compatible
short feedback, not proof of dedicated sensing/acceptance/refusal/touch loops.

## Other existing life families

- Reading: obtain actual text, hold/read, a compatible page/attention movement,
  bookmark at the actual receipt, put down and return after an interruption.
- Sleep: real bed arrival, entry, sustained sleep, small sleep response, actual
  waking and getting up. No new dream/offline experience from animation.
- Gardening: inspect target, position, tool preparation, the five distinct work
  motions, tool cleanup and the real receipt. Crop geometry is not decorative
  replacement for real plots; character tools have one owner per presentation.
- Trading/gifts: inspect/offer or receive goods, confirmed transfer, acknowledge,
  put away. Counting coins/displaying a basket is not a transaction receipt.
- Conversation: notice/listen/speak/brief response/return, compatible with the
  current posture and held objects. Opening a chat window is not a body command.

## Phase details for the other families

| Family | Preparation | Sustainable middle | Ending / interruption |
| --- | --- | --- | --- |
| Paper reading | Real text ready, take/open the matching book | Hold, scan, compatible page turn | Put down when actually interrupted; advance bookmarks only under real content confirmation; return to the same accepted reading |
| Note taking | Actual note-writing activity and materials ready | Look, write, pause to think | Put pen down; do not count this as reading completion |
| Bed sleep | Actual bed arrival, sit/lie/settle | Sleep breathing/pose, minimal compatible response | Actual waking, open eyes, sit/get up; no replay after old sleep already ended |
| Nap | Actual accepted nap at current location | Compact dozing posture | Wake/refocus; distinguish awake lying from sleep |
| Tilling | Position at real plot, prepare hoe | Raise/lower tool and work soil | Stop/store tool; real job receipt governs plot change |
| Planting | Position at plot, prepare matching seeds | Place seeds and cover actual target | Clear hand/tool; no new seed use per visual loop |
| Watering | Prepare actual can | Aim and pour toward plot | Upright/put away; water result from executor |
| Fertilizing | Prepare correct supply | Measure/sprinkle over target | Put supply away; effect once per real operation |
| Root harvest | Position with basket/tool | Pull or dig compatible crop | Put actual harvest in basket |
| Leaf harvest | Position with basket | Pick/cut matching leafy plant | Collect actual yield |
| Fruit/berry harvest | Reach matching height | Pick matching fruit | Put actual harvest in basket |
| Corn harvest | Reach actual stalk | Take matching cob | Collect; no root-pulling substitute |
| Sale | Inspect selected real goods | Offer/arrange/hand over | Confirmed transaction then acknowledge |
| Purchase | Inspect selected real good | Choose/pay when actual order allows | Confirmed receipt then receive/put away |
| Gift | Notice actually received item | Look/examine; unwrap only when appropriate | Acknowledge/put away, keep inventory authoritative |
| Conversation | Notice and orient if compatible | Listen/speak/brief facial feedback | Return to same valid activity |
| TV, if retained | Reach actual viewing position and sit | Attend to genuinely available playback/content | Pause/stop actual playback and leave; game footage is not a TV substitute |
| Phone, if retained | Take actual device | Look/scroll only for the actual supported activity | Put away; do not invent messages, calls or outside contacts |
| Bath, if retained | Reach bathroom, prepare and use an appropriate screen/occlusion | Indicate actual bathing with suitable scene details | Finish and tidy; brushing teeth is a different activity |
| Toilet, if retained | Reach the actual location and use appropriate occlusion | Indicate occupied activity without unrelated play | Finish, tidy and return |
| Laundry, if retained | Prepare actual chosen laundry | Wash/rinse/hang only as the accepted operation allows | Put away; do not invent clothes, weather or persistent results |

All these rows remain proposals. Happy/sad/quiet variants may modify compatible
expression, without replacing occupied hands or declaring different object use.
A character video containing a table/plant/cup cannot be assumed to fit every
scene. Movement, item, tool and emotion compatibility must be evaluated together.

## Delivery separation

The common playback code owns same-key continuity, phase selection, media timing,
once holding, stale-load rejection and visibility recovery. The existing domains
retain body effects, plan interruption/return, items, reading, Economy and Memory.
This proposal adds no second runtime or memory bank. Detailed variants need
accepted semantic metadata and asset review before claiming complete coverage.

Code tests verify continuity, routing and invariants with disposable data/fake
media/clock boundaries. Full artistic motion, installed synchronization and power
acceptance remain with the owner. No production, installation or personal-workspace
change is authorized merely by this vocabulary document.
