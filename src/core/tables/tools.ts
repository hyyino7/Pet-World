import {
  COMPANION_TOOL_SOURCES, type CompanionToolDeclaration, type CompanionToolSource,
  type RegistrationLease, type TableRegistration,
} from '../../contracts/tables.js';
import { RegistrationTable } from './registry.js';

function readDeclaration(value: CompanionToolDeclaration, lease: RegistrationLease): CompanionToolDeclaration {
  const { historyOverview } = value;
  if (!historyOverview) return { ...value };
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
  private readonly table = new RegistrationTable<CompanionToolDeclaration>();

  register(declaration: CompanionToolDeclaration): TableRegistration {
    const sources = Object.freeze([...declaration.sources]);
    for (const source of sources) {
      if (!COMPANION_TOOL_SOURCES.includes(source)) throw new Error(`Unknown companion tool source: ${source}`);
    }
    return this.table.register(declaration.name, {
      ...declaration,
      sources,
      historyOverview: declaration.historyOverview?.bind(declaration),
    });
  }

  get(name: string): CompanionToolDeclaration | undefined {
    const entry = this.table.get(name);
    return entry && readDeclaration(entry.value, entry.lease);
  }

  list(source: CompanionToolSource): CompanionToolDeclaration[] {
    return this.table.entries()
      .filter(({ value }) => value.sources.includes(source))
      .map(({ value, lease }) => readDeclaration(value, lease));
  }
}
