import {Context, FiberState, type Fiber} from '@deepseek-ai/cordis';
import type {PetCoreHost} from '../core/index.js';
import {RegistrationTable} from '../core/tables/registry.js';
import type {RegistrationLease, TableRegistration} from '../contracts/tables.js';
import type {CompanionBehavior} from './body/plugin.js';
import type {CompanionLife} from './plan/plugin.js';
import type {CompanionEconomy} from './economy/plugin.js';

interface Areas {body: CompanionBehavior; plan: CompanionLife; economy: CompanionEconomy}
type Area = keyof Areas;
const bodyService = 'petBehavior', lifeService = 'petLife', economyService = 'petEconomy';
const services = {body: bodyService, plan: lifeService, economy: economyService};
type Labels = Record<Area, symbol>;
interface Slot<T> {
  table: RegistrationTable<{value: T; fiber: Fiber}>;
  generation?: symbol;
}
type Slots<T> = Map<symbol, Slot<T>>;
interface Domain {
  worlds: Set<LivingWorld>;
  slots: {[K in Area]: Slots<Areas[K]>};
}
const domains = new WeakMap<Context, WeakMap<PetCoreHost, Domain>>();

function labelsOf(contextScope: Context): Labels {
  const defaults = contextScope.root[Context.isolate], visible = contextScope[Context.isolate];
  const label = (name: string) => {
    defaults[name] ??= Symbol(name);
    return visible[name];
  };
  return {body: label(services.body), plan: label(services.plan), economy: label(services.economy)};
}

export interface AreaReference<T> {
  readonly value: T;
  isCurrent(): boolean;
}

export class LivingWorld {
  private entries = 0;

  private constructor(private readonly domain: Domain, private readonly labels: Labels) {}

  private static matching(domain: Domain, labels: Labels) {
    return [...domain.worlds].find(world => world.labels.body === labels.body &&
      world.labels.plan === labels.plan && world.labels.economy === labels.economy);
  }

  static find(ctx: Context, host: PetCoreHost) {
    const domain = domains.get(ctx.root)?.get(host);
    return domain && this.matching(domain, labelsOf(ctx));
  }

  static retain(ctx: Context, host: PetCoreHost, area: Area) {
    const root = ctx.root;
    let hosts = domains.get(root);
    if (!hosts) domains.set(root, hosts = new WeakMap());
    let domain = hosts.get(host);
    if (!domain) {
      domain = {worlds: new Set(), slots: {body: new Map(), plan: new Map(), economy: new Map()}};
      hosts.set(host, domain);
    }
    const labels = labelsOf(ctx);
    const world = this.matching(domain, labels) ?? new LivingWorld(domain, labels);
    domain.worlds.add(world);
    world.entries++;
    return {world, release: (generation?: symbol) => {
      const slots = domain.slots[area], label = labels[area];
      const slot = slots.get(label);
      if (slot && slot.generation === generation && !slot.table.get(area)) slots.delete(label);
      if (--world.entries === 0) domain.worlds.delete(world);
      if (!domain.worlds.size) hosts.delete(host);
    }};
  }

  register<K extends Area>(area: K, value: Areas[K], fiber: Fiber) {
    const slots: Slots<Areas[K]> = this.domain.slots[area], label = this.labels[area];
    let slot = slots.get(label);
    if (!slot) slots.set(label, slot = {table: new RegistrationTable()});
    const registration = slot.table.register(area, {value, fiber});
    const {generation} = registration.lease;
    slot.generation = generation;
    // Revocation hides the area immediately. A replacement also fences its draining writes.
    return {...registration, isLatestGeneration: () => slot.generation === generation};
  }

  lookup<K extends Area>(area: K): (AreaReference<Areas[K]> & {lease: RegistrationLease}) | undefined {
    const slots: Slots<Areas[K]> = this.domain.slots[area];
    const entry = slots.get(this.labels[area])?.table.get(area);
    if (!entry) return;
    const {lease, value: {value, fiber}} = entry;
    const isCurrent = () => lease.isCurrent() && fiber.state === FiberState.ACTIVE;
    if (isCurrent()) return {value, lease, isCurrent};
  }
}

type AreaPorts = {[K in Area]?: () => Areas[K] | undefined};
export type LivingPorts = AreaPorts & {observe?: boolean};

export class LivingView {
  constructor(private readonly ports: LivingPorts = {}, readonly isCurrent = () => true,
    private readonly world?: LivingWorld, readonly isLatestGeneration = isCurrent) {}

  lookup<K extends Area>(area: K): AreaReference<Areas[K]> | undefined {
    if (this.world) return this.world.lookup(area);
    const ports: AreaPorts = this.ports;
    const read = ports[area], value = read?.();
    if (value) return {value, isCurrent: () => read?.() === value};
  }

  get<K extends Area>(area: K): Areas[K] | undefined { return this.lookup(area)?.value; }

  watch<K extends Area>(ctx: Context, area: K,
    notify: (area: AreaReference<Areas[K]> | undefined, isObserved: () => boolean) => void): () => void {
    if (!this.world && !this.ports.observe) return () => {};
    let current: AreaReference<Areas[K]> | undefined;
    let observation: symbol | undefined;
    const update = () => {
      if (!this.isCurrent()) return;
      const next = this.lookup(area);
      if (current?.value === next?.value && (!current || current.isCurrent())) return;
      const tell = (ref?: AreaReference<Areas[K]>) => {
        const generation = observation = Symbol(area);
        notify(ref, () => observation === generation);
      };
      if (current) tell();
      current = next;
      if (next) tell(next);
    };
    const stop = ctx.on('internal/status', update);
    try { update(); }
    catch (error) { stop(); throw error; }
    return () => { observation = undefined; stop(); };
  }
}

export async function settleCleanup(...steps: (() => void | Promise<void>)[]) {
  const settled = await Promise.allSettled(steps.map(async step => step()));
  const errors = settled.flatMap(result => result.status === 'rejected' ? [result.reason] : []);
  if (errors.length) throw new AggregateError(errors, 'Living area cleanup failed');
}

export function mountLivingArea<K extends Area>(ctx: Context, host: PetCoreHost, area: K,
  create: (view: LivingView) => Areas[K], start: (value: Areas[K]) => void,
  close: (value: Areas[K]) => void | Promise<void> = value => value.close()) {
  const {world, release} = LivingWorld.retain(ctx, host, area);
  let registration: (TableRegistration & {isLatestGeneration(): boolean}) | undefined;
  let value: Areas[K] | undefined, cleanup: Promise<void> | undefined;
  const dispose = () => cleanup ??= settleCleanup(
    () => registration?.revoke(),
    () => {if(value) return close(value);},
  ).finally(() => release(registration?.lease.generation));
  try {
    ctx.effect(() => dispose);
    const view = new LivingView({}, () => registration?.lease.isCurrent() === true &&
      (ctx.fiber.state === FiberState.LOADING || ctx.fiber.state === FiberState.ACTIVE), world,
      () => registration?.isLatestGeneration() === true);
    value = create(view);
    registration = world.register(area, value, ctx.fiber);
    start(value);
  } catch (error) {
    // Cordis joins this cleanup through the effect when synchronous apply fails.
    void dispose().catch(() => {});
    throw error;
  }
}

// Handoff only during the synchronous call into a queue. The receiving queue
// keeps its guard across awaits without leaking it to later events or timers.
let callerGuard: (() => void) | undefined;
export const livingCaller = () => callerGuard;
export function withLivingCaller<T>(validate: () => void, call: () => T): T {
  validate();
  const previous = callerGuard;
  callerGuard = validate;
  try { return call(); }
  finally { callerGuard = previous; }
}

export class InFlight {
  private readonly work = new Set<Promise<unknown>>();

  run<T>(start: () => Promise<T>): Promise<T> {
    const task = start();
    this.work.add(task);
    const done = () => { this.work.delete(task); };
    void task.then(done, done);
    return task;
  }

  async settled() { await Promise.allSettled(this.work); }
}
