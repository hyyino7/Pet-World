/** A completed native turn is not durable until its original session flushes. */
export async function acknowledgePromptFacts(input) {
    input.validate();
    // The caller supplies the native effective surface, including an unchanged
    // system prompt retained from an earlier turn; removed history is excluded.
    const context = JSON.stringify(input.events().filter(event => event.type === 'system/message'));
    const observed = input.sources.map(source => ({ service: source.service, facts: source.facts.filter(fact => context.includes(fact.id)) }));
    if (!observed.some(source => source.facts.length))
        return;
    const persisted = await input.flush();
    if (persisted !== true)
        throw Error('Native session has no durable persistence participant; interaction facts retained');
    input.validate();
    for (const source of observed) {
        input.validate();
        if (source.facts.length)
            await source.service.acknowledgeFacts(input.workspaceId, source.facts.map(fact => fact.id));
    }
}
//# sourceMappingURL=interaction-context.js.map