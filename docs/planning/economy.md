# Companion virtual economy

Updated: 2026-11-13. The owner confirmed the initial-resource and economic
boundaries below, then authorized implementation and isolated verification.
The [implementation record](../validation/life-design-implementation-2026-11-14.md)
owns current source checks. Historical candidate `4474a5bc6533` predates this
change and exposes broader controls. No new installation or owner acceptance
is implied.

Historical delivery: the earlier economic baseline was installed as
`b6da9f10be64` after separate owner authorization. Source implementation did not
touch personal data; later activation adopted the retained Garden with identity
preserved. Those installation facts remain unchanged. Functional testing and
acceptance belong to the owner.

The later [autonomous-life integration](autonomous-life-game.md) adds durable
owner transaction facts in the same SQLite commit and read-by-ID/ack services;
already acknowledged facts remain readable by a previously admitted native
batch. Inventory feeding keeps the Body-owned effect fact, not a duplicate
economy event. These source additions and subsequent audit repairs remain
uninstalled; the [current handover](../handover/README.md) owns their candidate
and verification status. The installed baseline above remains unchanged.

## Confirmed product behavior

One companion owns one portable wallet, inventory, reading library and economic
ledger. Free basic meals and drinking water remain available through the shared
Body. Additional meals, articles/books and garden supplies are voluntary
purchases. The owner can give money or items and feed a held food item.
This is an entirely virtual economy; no real payment or external purchase is
authorized or implemented.

A genuinely new companion receives no starting coins, seeds, garden supplies or
system gifts. Startup funds or items come from the owner. This does not remove
free basic food/water, reset an existing companion's holdings or reinterpret
recognized retained items as new gifts.

The companion decides whether and when to plant, water, harvest, sell, buy,
consume or read, using the existing persistent Life plan and native runtime.
Maturity, animation completion and idle time do not create economic goals.
Quiet waiting, saving money and remaining with the same activity are valid.
Long-term life pacing remains configurable; no fixed daily visit or income
requirement is introduced.

The owner cannot customize a target daily income, crop yield or crop buyback
price. Crop returns follow the game's common rules, while actual income comes
from actual production and voluntary sales. There is no salary, guaranteed
income or automatic allowance. The customizable sale resources are **products
the shop sells to the companion**, not the crop-return rules for resources she
sells. Owner money/item gifts remain explicit owner interventions rather than
a configurable daily return.

## Ownership and reuse

| Owner | Responsibility and reused seam |
| --- | --- |
| Core | Existing identity, workspace binding, initialization inventory, native conversation and guest boundaries; records that economic storage has been initialized. |
| Economy (`22-Economy`) | SQLite wallet, every inventory item, complete Garden aggregate, configuration, request archive, ledger, food reservations, reading content and version bookmarks. |
| Behavior | Existing route/dwell/caretaker and body needs. Applies food effects beside the matching durable Body receipt in the same home checkpoint. |
| Life | One cross-conversation plan and stable operation IDs; native alarms and planning turns; explicit economic intent and reading-content continuation. |
| Room and settings | Read projections and call owning services. The settings RPC is owner-only; views do not write a second wallet or start another assistant. |

The original Garden state machine, caretaker and storage adapter remain the
execution path. They now accept portable configuration and a transactional
Economy-backed adapter. All caretaker checkpoints and manual garden actions
share that writer. A generic requested garden visit no longer chooses an
implicit harvest, sale or replacement crop in economic mode. Already accepted
jobs, including paused/deferred requests, retain their original IDs and queues.

## Persistent data and adoption

The bound workspace contains `.chatpet/data/economy/economy.sqlite` and
`storage.json`; SQLite owns the wallet, inventory, garden plots/growth/care jobs,
transaction receipts, complete new request archive, ledger, catalog content,
food reservations, reading offers and bookmarks. `economy.lock` is a temporary
single-process writer lease. Core, Body and Life remain in their current stores.
No persona, self-description, diary or Memory is moved into Economy.

On later activation, schema preparation imports the recognized complete legacy
Garden aggregate once, with its source path/hash. The source JSON stays intact
and stops being a writer. Migration does not invent money, items, experiences
or missing historical receipts. Existing planted crops retain their growth/yield
profile under the earlier adoption contract. The newly confirmed editing
boundary does not authorize rewriting those existing cohorts or balances;
compatibility with future game-owned rules requires an explicit transition.
Unknown nonzero resources, unknown planted crops or incompatible versions reject adoption rather than
silently dropping them. After adoption normal operation no longer reads the
legacy JSON. New companions receive zero coins and zero owned items.

The database identity, storage marker, Core initialized marker and Body authority
marker prevent a missing economic database from silently becoming a blank wallet
or reviving the old JSON writer. Optional Economy loss pauses its work while
free basic body actions and ordinary room/hold activities remain usable.
Failed first adoption is not marked as successful adoption.

Move or restore the complete stopped workspace, including Core, Economy, Body,
Life, SQLite sidecars and content, as one generation. The offline backup path
checks the economic writer lease and already copies the entire `.chatpet` tree.
Do not combine a wallet from one backup with Body food receipts from another.
This is portable single-device ownership, not concurrent multi-device syncing.

## Intent, settlement and recovery

Life adds `economy` steps (`buy`, `sell`, single-item `consume`) and `read`
steps. Existing garden steps continue to express explicit physical care.
Wallet, inventory availability, prices, catalog availability and integer ranges
are verified by code. Repeating a committed request with the same payload
returns its recorded result; changing its payload conflicts. Owner grants,
gifts, content import and configuration changes have no model tool entry.

Food uses reserve → actual Body checkpoint → inventory settlement. The stable
operation ID and fixed reserved effects survive a restart or interruption.
A saved effect permits settlement without eating again. An absent or ambiguous
Body receipt retains the reservation and waits; it is not proof for a refund.
Cancellation releases an item only after a durable no-effect receipt. A known
refusal before any effect fails the intent rather than retrying forever.
Manual feeding preserves an interrupted Life activity and accepted garden jobs.

Buying a reading item gives permanent ownership, not completed reading. The
earlier implementation's catalog includes two actual original short essays and
supports owner-imported plain-text `.txt`/`.md` content with article/book and
per-item pricing. Those are existing baseline capabilities, not a complete
definition of the newly confirmed custom-shop product fields. No imaginary
book text or automatic replenishment of reading products is generated.

`life_read_segment` returns the actual versioned text and stable offer token for
the current plan operation. Only a subsequent `life_read_confirm` acknowledges
the received segment and advances its versioned bookmark. The program cannot
prove comprehension. Animation and elapsed time never advance reading. First
arrival at a read step creates one durable native content-needed event, even
when no future consideration time was chosen; it is not a periodic model call.

## Configurable scope and fixed income boundary

Settings → Life contains the wallet/shop/inventory/ledger and economic settings.
The confirmed target distinguishes these responsibilities:

| Scope | Confirmed product target |
| --- | --- |
| Target daily income | No owner customization; a reference value is not wages or a daily task. |
| Crop yield and crop buyback price | Game-owned return rules, not owner-editable parameters. Generic item-price or fertilizer/yield overrides must not bypass this boundary. |
| Shop products sold to the companion | Customizable. The exact supported product fields, types and any resale rules remain to be specified; this is not permission for arbitrary scripts or new crop-return rules. |
| Other economic balance and life-pacing settings | Remain configurable where they do not override the fixed income boundary. |
| Actual income | Calculated from real production and completed sales, not directly assigned as a configurable income value. Owner gifts remain separately attributed. |

Both shop surfaces should show the same current products and quotes. Stale
configuration edits must preserve the newer choices. Legacy stored data is not rewritten by a read. Income overrides no longer
control current quotes or newly planted cohorts; existing planted profiles and
held balances/items remain intact. An explicit later configuration save writes
the effective supported settings.

### Historical calibration, not newly confirmed product rules

The earlier implementation used a purchasing-power reference of about 50 net
coins per day, a standard reading item at 20 and an improved meal at 10. Its
initial crop durations were 12–23 hours, calibrated to roughly 44–55 coins per
eight plots per 24 hours of continuous mature-cycle use, excluding optional
compost. These are historical tuning/implementation values, not a new income
guarantee, mandatory schedule, accepted balance result or confirmation that
those numbers should be fixed as product rules.

That earlier source exposes broader daily-net-reference, crop-yield, sale-price
and related editing controls. The latest confirmed design supersedes that
editing promise. The authorized implementation now removes those editors and
rejects income-side overrides at the owning service. Historical archives and the
installation remain unchanged; current checks are in the implementation record.

## Native access boundary

The implementation reuses DSH's monotonic tool guard and filesystem/current
directory resolution to prevent known native file tools from directly touching
the economic directory. This is protection against accidental file-tool edits,
not operating-system isolation. The installed DSH 0.2.2-rc.2 sandbox API grants
whole writable roots and has no protected subdirectory exclusion. General
commands, other plugins, hard links or path races remain capable of accessing
files under the same account. No command-string blacklist or claim of absolute
ledger security is introduced. A stronger boundary needs a separate native
capability/OS design; ordinary capabilities have not been silently disabled.

## Future owner acceptance goals (not executed)

These goals describe the newly confirmed target. They do not authorize installation; isolated code/service tests do not establish
owner acceptance against an installed package.

1. Initialize a genuinely new disposable companion. It has no starting coins,
   seeds, garden supplies or system gifts; basic food/water remain free. Give
   startup money or an item from the owner before its first voluntary purchases.
2. Give a chosen amount with a blank optional note. Refresh, reopen and retry
   the original request: money increases once and the ledger shows the grant.
3. At zero coins, use free food/water. Buy a premium meal without enough funds:
   no debt or phantom item appears. Give a meal, use it, and verify one need
   effect and one consumed item, including a restart during settlement.
4. Buy seeds, choose a plant, wait for maturity, and leave it alone. Nothing
   automatically harvests, sells or replants. Ask the companion to plan these
   actions; plots, inventory and money change against actual receipts.
5. Pause/defer a garden job, feed a held meal, then resume the old activity.
   The garden request and its dependency survive instead of being discarded.
6. Buy or gift real reading content. Ownership alone leaves the bookmark
   unchanged; a read step returns text, then confirmation advances its bookmark.
   Switch conversations/restart and continue the same plan, item and version.
7. Customize a supported shop product. Both shop surfaces agree on its current
   content/availability/quote; a downlisted item cannot trade through an older
   entry. The custom product does not provide an override for crop returns.
8. Inspect all editing surfaces: target daily income, crop yield and crop
   buyback prices are not owner-editable, including through generic item-price
   or yield-related controls. Actual sale income matches the game's return
   rules and the real quantity sold. Retained holdings/cohorts are preserved.
9. Disable Economy during work. Economic operations wait on their original IDs;
   free body actions and timed holds still finish. Re-enable it and reconcile.
   A missing authoritative database must report unavailable, not create money
   or an empty replacement wallet. Perform destructive checks only on a copy.

Source delivery/build evidence belongs to the
[runtime record](../mvp-runtime.md#virtual-economy-source-delivery-2026-11-13).
Installation evidence is in the
[installation record](../mvp-runtime.md#virtual-economy-installation-2026-11-13).
Functional acceptance remains owner-run.
