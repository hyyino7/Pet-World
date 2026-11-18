import { COMPANION_TOOL_SOURCES, } from '../../contracts/tables.js';
import { RegistrationTable } from './registry.js';
function readDeclaration(value, lease) {
    const { historyOverview } = value;
    if (!historyOverview)
        return { ...value };
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
    register(declaration) {
        const sources = Object.freeze([...declaration.sources]);
        for (const source of sources) {
            if (!COMPANION_TOOL_SOURCES.includes(source))
                throw new Error(`Unknown companion tool source: ${source}`);
        }
        return this.table.register(declaration.name, {
            ...declaration,
            sources,
            historyOverview: declaration.historyOverview?.bind(declaration),
        });
    }
    get(name) {
        const entry = this.table.get(name);
        return entry && readDeclaration(entry.value, entry.lease);
    }
    list(source) {
        return this.table.entries()
            .filter(({ value }) => value.sources.includes(source))
            .map(({ value, lease }) => readDeclaration(value, lease));
    }
}
//# sourceMappingURL=tools.js.map