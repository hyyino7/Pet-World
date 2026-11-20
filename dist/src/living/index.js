import { Context } from '@deepseek-ai/cordis';
import { RegistrationTable } from '../core/tables/registry.js';
import { activityReader } from './plan/activity-reader.js';
import { installLivingPrompt } from './prompt-context.js';
const bodyService = 'petBehavior', lifeService = 'petLife', economyService = 'petEconomy';
const services = { body: bodyService, plan: lifeService, economy: economyService };
const domains = new WeakMap();
export function serviceLabel(contextScope, name) {
    const defaults = contextScope.root[Context.isolate];
    defaults[name] ??= Symbol(name);
    return contextScope[Context.isolate][name];
}
function labelsOf(contextScope) {
    const label = (name) => serviceLabel(contextScope, name);
    return { body: label(services.body), plan: label(services.plan), economy: label(services.economy) };
}
function currentArea(slot, area) {
    const entry = slot?.table.get(area);
    if (!entry)
        return;
    const { lease, value: { value, fiber } } = entry;
    const isCurrent = () => lease.isCurrent() && fiber.state === 2 /* FiberState.ACTIVE */;
    if (isCurrent())
        return { value, lease, isCurrent };
}
export class LivingWorld {
    domain;
    labels;
    entries = 0;
    constructor(domain, labels) {
        this.domain = domain;
        this.labels = labels;
    }
    static matching(domain, labels) {
        return [...domain.worlds].find(world => world.labels.body === labels.body &&
            world.labels.plan === labels.plan && world.labels.economy === labels.economy);
    }
    static find(ctx, host) {
        const domain = domains.get(ctx.root)?.get(host);
        return domain && this.matching(domain, labelsOf(ctx));
    }
    static lookupPlan(ctx, host) {
        const domain = domains.get(ctx.root)?.get(host);
        return domain && currentArea(domain.slots.plan.get(serviceLabel(ctx, lifeService)), 'plan')?.value;
    }
    static retain(ctx, host, area) {
        const root = ctx.root;
        let hosts = domains.get(root);
        if (!hosts)
            domains.set(root, hosts = new WeakMap());
        let domain = hosts.get(host);
        if (!domain) {
            domain = { worlds: new Set(), slots: { body: new Map(), plan: new Map(), economy: new Map() } };
            hosts.set(host, domain);
        }
        const labels = labelsOf(ctx);
        const world = this.matching(domain, labels) ?? new LivingWorld(domain, labels);
        domain.worlds.add(world);
        world.entries++;
        return { world, release: (generation) => {
                const slots = domain.slots[area], label = labels[area];
                const slot = slots.get(label);
                if (slot && slot.generation === generation && !slot.table.get(area))
                    slots.delete(label);
                if (--world.entries === 0)
                    domain.worlds.delete(world);
                if (!domain.worlds.size)
                    hosts.delete(host);
            } };
    }
    retainCore(ctx, host, area) {
        const ports = host.native?.companionPorts;
        if (!ports)
            return;
        const scope = ports.scopeFor(ctx, services[area]);
        if (!scope)
            return;
        if (!this.domain.core) {
            const labels = labelsOf(scope.ctx);
            const world = LivingWorld.matching(this.domain, labels) ?? new LivingWorld(this.domain, labels);
            const visible = () => world.lookup('body') || world.lookup('plan') || world.lookup('economy');
            const dispose = scope.ctx.effect(() => {
                const activity = ports.register('activities', {
                    activityDays: binding => visible() ? activityReader.activityDays(binding) : [],
                    activity: (binding, day) => visible() ? activityReader.activity(binding, day) : [],
                });
                try {
                    const stopPrompt = installLivingPrompt(scope.ctx, host, world, scope.ownerScope);
                    return () => settleCleanup(activity.revoke, stopPrompt);
                }
                catch (error) {
                    void activity.revoke();
                    throw error;
                }
            });
            this.domain.core = { areas: 0, dispose };
        }
        const core = this.domain.core;
        core.areas++;
        return () => {
            if (--core.areas)
                return;
            this.domain.core = undefined;
            return core.dispose();
        };
    }
    register(area, value, fiber) {
        const slots = this.domain.slots[area], label = this.labels[area];
        let slot = slots.get(label);
        if (!slot)
            slots.set(label, slot = { table: new RegistrationTable() });
        const registration = slot.table.register(area, { value, fiber });
        const { generation } = registration.lease;
        slot.generation = generation;
        // Revocation hides the area immediately. A replacement also fences its draining writes.
        return { ...registration, isLatestGeneration: () => slot.generation === generation };
    }
    lookup(area) {
        return currentArea(this.domain.slots[area].get(this.labels[area]), area);
    }
}
export class LivingView {
    ports;
    isCurrent;
    world;
    isLatestGeneration;
    constructor(ports = {}, isCurrent = () => true, world, isLatestGeneration = isCurrent) {
        this.ports = ports;
        this.isCurrent = isCurrent;
        this.world = world;
        this.isLatestGeneration = isLatestGeneration;
    }
    lookup(area) {
        if (this.world)
            return this.world.lookup(area);
        const ports = this.ports;
        const read = ports[area], value = read?.();
        if (value)
            return { value, isCurrent: () => read?.() === value };
    }
    get(area) { return this.lookup(area)?.value; }
    watch(ctx, area, notify) {
        if (!this.world && !this.ports.observe)
            return () => { };
        let current;
        let observation;
        const update = () => {
            if (!this.isCurrent())
                return;
            const next = this.lookup(area);
            if (current?.value === next?.value && (!current || current.isCurrent()))
                return;
            const tell = (ref) => {
                const generation = observation = Symbol(area);
                notify(ref, () => observation === generation);
            };
            if (current)
                tell();
            current = next;
            if (next)
                tell(next);
        };
        const stop = ctx.on('internal/status', update);
        try {
            update();
        }
        catch (error) {
            stop();
            throw error;
        }
        return () => { observation = undefined; stop(); };
    }
}
export async function settleCleanup(...steps) {
    const settled = await Promise.allSettled(steps.map(async (step) => step()));
    const errors = settled.flatMap(result => result.status === 'rejected' ? [result.reason] : []);
    if (errors.length)
        throw new AggregateError(errors, 'Living area cleanup failed');
}
export function mountLivingArea(ctx, host, area, create, start, close = value => value.close()) {
    const { world, release } = LivingWorld.retain(ctx, host, area);
    let registration;
    let stopPort, stopCore;
    let value, cleanup;
    const dispose = () => cleanup ??= settleCleanup(() => registration?.revoke(), () => stopPort?.(), () => stopCore?.(), () => { if (value)
        return close(value); }).finally(() => release(registration?.lease.generation));
    try {
        ctx.effect(() => dispose);
        const view = new LivingView({}, () => registration?.lease.isCurrent() === true &&
            (ctx.fiber.state === 1 /* FiberState.LOADING */ || ctx.fiber.state === 2 /* FiberState.ACTIVE */), world, () => registration?.isLatestGeneration() === true);
        value = create(view);
        registration = world.register(area, value, ctx.fiber);
        stopPort = start(value, view);
        stopCore = world.retainCore(ctx, host, area);
    }
    catch (error) {
        // Cordis joins this cleanup through the effect when synchronous apply fails.
        void dispose().catch(() => { });
        throw error;
    }
}
// Handoff only during the synchronous call into a queue. The receiving queue
// keeps its guard across awaits without leaking it to later events or timers.
let callerGuard;
export const livingCaller = () => callerGuard;
export function withLivingCaller(validate, call) {
    validate();
    const previous = callerGuard;
    callerGuard = validate;
    try {
        return call();
    }
    finally {
        callerGuard = previous;
    }
}
export class InFlight {
    work = new Set();
    run(start) {
        const task = start();
        this.work.add(task);
        const done = () => { this.work.delete(task); };
        void task.then(done, done);
        return task;
    }
    async settled() { await Promise.allSettled(this.work); }
}
//# sourceMappingURL=index.js.map