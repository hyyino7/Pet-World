/** Keep the complete accepted intent, activity IDs, execution receipt and all
 * remaining steps. Only duplicated storage identity and bookkeeping are omitted. */
export function planOverview(state) {
    if (!state.plan)
        return { ...state, view: 'overview' };
    const { version, companionId, storageId, createdAt, updatedAt, ...plan } = state.plan;
    return { ...state, plan, view: 'overview', details: { tool: 'life_plan_read', view: 'full' } };
}
//# sourceMappingURL=tool-context.js.map