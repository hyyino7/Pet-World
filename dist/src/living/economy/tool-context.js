/** All catalog choices remain discoverable, including descriptions, prices,
 * effects and disabled items. Empty stock and duplicate configuration/history
 * are available through full/paged queries, never removed from the owner. */
export function economyOverview(state) {
    const { configuration, migration, ledger, inventory, ...current } = state;
    return { ...current, view: 'overview', configurationRevision: configuration.revision,
        inventory: inventory.filter(item => item.quantity !== 0 || item.reserved !== 0 || item.available !== 0),
        stockNote: 'Unlisted catalog items have zero stock. Read view=full for the complete original snapshot.',
        ledgerCount: ledger.length, details: { tool: 'pet_economy_state', view: 'full' } };
}
export function economyPage(state, section, offset = 0, limit = 20) {
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 80)
        throw Error('Expected offset >= 0 and limit from 1 to 80');
    const rows = state[section];
    return { revision: state.revision, section, items: rows.slice(offset, offset + limit),
        nextOffset: offset + limit < rows.length ? offset + limit : null, total: rows.length };
}
//# sourceMappingURL=tool-context.js.map