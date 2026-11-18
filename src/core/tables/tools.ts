import {
  COMPANION_TOOL_SOURCES, type CompanionToolDeclaration, type CompanionToolSource,
  type RegistrationLease, type TableRegistration,
} from '../../contracts/tables.js';
import { RegistrationTable } from './registry.js';

const builtinSources: ReadonlySet<CompanionToolSource> = new Set(COMPANION_TOOL_SOURCES);

interface RegisteredTool {
  readonly declaration: CompanionToolDeclaration;
  readonly sourceLeases: ReadonlyMap<CompanionToolSource, RegistrationLease>;
}

function readDeclaration({ declaration, sourceLeases }: RegisteredTool, lease: RegistrationLease): CompanionToolDeclaration {
  const sources = declaration.sources.filter(source => sourceLeases.get(source)?.isCurrent() ?? true);
  const value = { ...declaration, sources: sources.length === declaration.sources.length
    ? declaration.sources : Object.freeze(sources) };
  const { historyOverview } = value;
  if (!historyOverview) return value;
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
  private readonly table = new RegistrationTable<RegisteredTool>();
  private readonly extensions = new RegistrationTable<true>();

  /** Register an extension before registering tools that grant access to it. */
  registerSource(source: Exclude<CompanionToolSource, typeof COMPANION_TOOL_SOURCES[number]>): TableRegistration {
    if (builtinSources.has(source)) throw new Error(`Duplicate registration: ${source}`);
    return this.extensions.register(source, true);
  }

  /** Built-in sources have no lease; an absent extension has no admission. */
  sourceLease(source: CompanionToolSource): RegistrationLease | null | undefined {
    return builtinSources.has(source) ? null : this.extensions.get(source)?.lease;
  }

  register(declaration: CompanionToolDeclaration): TableRegistration {
    const sources = Object.freeze([...declaration.sources]);
    const sourceLeases = new Map<CompanionToolSource, RegistrationLease>();
    for (const source of sources) {
      const lease = this.sourceLease(source);
      if (lease === undefined) throw new Error(`Unknown companion tool source: ${source}`);
      if (lease) sourceLeases.set(source, lease);
    }
    return this.table.register(declaration.name, {
      declaration: { ...declaration, sources, historyOverview: declaration.historyOverview?.bind(declaration) },
      sourceLeases,
    });
  }

  get(name: string): CompanionToolDeclaration | undefined {
    return this.getRegistration(name)?.declaration;
  }

  getRegistration(name: string): { declaration: CompanionToolDeclaration; lease: RegistrationLease } | undefined {
    const entry = this.table.get(name);
    return entry && { declaration: readDeclaration(entry.value, entry.lease), lease: entry.lease };
  }

  list(source: CompanionToolSource): CompanionToolDeclaration[] {
    return this.table.entries()
      .filter(({ value }) => value.declaration.sources.includes(source) && (value.sourceLeases.get(source)?.isCurrent() ?? true))
      .map(({ value, lease }) => readDeclaration(value, lease));
  }
}
