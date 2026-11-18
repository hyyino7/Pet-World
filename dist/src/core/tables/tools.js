import { COMPANION_TOOL_SOURCES, } from '../../contracts/tables.js';
import { RegistrationTable } from './registry.js';
const builtinSources = new Set(COMPANION_TOOL_SOURCES);
function readDeclaration({ declaration, sourceLeases }, lease) {
    const sources = declaration.sources.filter(source => sourceLeases.get(source)?.isCurrent() ?? true);
    const value = { ...declaration, sources: sources.length === declaration.sources.length
            ? declaration.sources : Object.freeze(sources) };
    const { historyOverview } = value;
    if (!historyOverview)
        return value;
    return {
        ...value,
        historyOverview: lease.guard((args, result) => {
            const overview = historyOverview(args, result);
            lease.assertCurrent();
            return overview;
        }),
    };
}
export class CompanionToolTable {
    table = new RegistrationTable();
    extensions = new RegistrationTable();
    /** Register an extension before registering tools that grant access to it. */
    registerSource(source) {
        if (builtinSources.has(source))
            throw new Error(`Duplicate registration: ${source}`);
        return this.extensions.register(source, true);
    }
    /** Built-in sources have no lease; an absent extension has no admission. */
    sourceLease(source) {
        return builtinSources.has(source) ? null : this.extensions.get(source)?.lease;
    }
    register(declaration) {
        const sources = Object.freeze([...declaration.sources]);
        const sourceLeases = new Map();
        for (const source of sources) {
            const lease = this.sourceLease(source);
            if (lease === undefined)
                throw new Error(`Unknown companion tool source: ${source}`);
            if (lease)
                sourceLeases.set(source, lease);
        }
        return this.table.register(declaration.name, {
            declaration: { ...declaration, sources, historyOverview: declaration.historyOverview?.bind(declaration) },
            sourceLeases,
        });
    }
    get(name) {
        return this.getRegistration(name)?.declaration;
    }
    getRegistration(name) {
        const entry = this.table.get(name);
        return entry && { declaration: readDeclaration(entry.value, entry.lease), lease: entry.lease };
    }
    list(source) {
        return this.table.entries()
            .filter(({ value }) => value.declaration.sources.includes(source) && (value.sourceLeases.get(source)?.isCurrent() ?? true))
            .map(({ value, lease }) => readDeclaration(value, lease));
    }
}
//# sourceMappingURL=tools.js.map