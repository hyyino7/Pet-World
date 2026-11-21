import { FACT_DOMAIN_NAMES } from '../../contracts/interaction.js';
/** Materialize original references even when another native consumer has already
 * acknowledged them. Pending discovery and immutable fact reads are distinct. */
export async function readFactReferences(workspaceId, refs, sourceFor, validate) {
    validate();
    const result = new Map();
    await Promise.all(FACT_DOMAIN_NAMES.map(async (domain) => {
        const ids = refs.filter(ref => ref.domain === domain).map(ref => ref.id);
        if (!ids.length)
            return;
        const source = sourceFor(domain);
        if (!source)
            throw Error('原互动事实所属组件暂不可用，保留原编号等待恢复');
        const facts = await source.readFacts(workspaceId, ids);
        validate();
        if (sourceFor(domain) !== source)
            throw Error('原互动事实所属组件已变化');
        for (const fact of facts) {
            if (fact.domain !== domain || !ids.includes(fact.id))
                throw Error('原互动事实引用与所属组件记录不匹配');
            result.set(JSON.stringify([fact.domain, fact.id]), fact);
        }
    }));
    validate();
    return refs.map(ref => {
        const fact = result.get(JSON.stringify([ref.domain, ref.id]));
        if (!fact)
            throw Error('原互动事实未知，保留原编号等待核对');
        return fact;
    });
}
//# sourceMappingURL=facts.js.map