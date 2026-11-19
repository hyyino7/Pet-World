import { Context } from '@deepseek-ai/cordis';
import { RegistrationTable } from '../core/tables/registry.js';
const bodyService = 'petBehavior', lifeService = 'petLife', economyService = 'petEconomy';
const services = { body: bodyService, plan: lifeService, economy: economyService };
const domains = new WeakMap();
function labelsOf(contextScope) {
    const defaults = contextScope.root[Context.isolate], visible = contextScope[Context.isolate];
    const label = (name) => {
        defaults[name] ??= Symbol(name);
        return visible[name];
    };
    return { body: label(services.body), plan: label(services.plan), economy: label(services.economy) };
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
        return { world, release: () => {
                const slots = domain.slots[area], label = labels[area];
                if (!slots.get(label)?.get(area))
                    slots.delete(label);
                if (--world.entries === 0)
                    domain.worlds.delete(world);
                if (!domain.worlds.size)
                    hosts.delete(host);
            } };
    }
    register(area, value, fiber) {
        const slots = this.domain.slots[area], label = this.labels[area];
        let table = slots.get(label);
        if (!table)
            slots.set(label, table = new RegistrationTable());
        return table.register(area, { value, fiber });
    }
    lookup(area) {
        const slots = this.domain.slots[area];
        const entry = slots.get(this.labels[area])?.get(area);
        if (!entry)
            return;
        const { lease, value: { value, fiber } } = entry;
        const isCurrent = () => lease.isCurrent() && fiber.state === 2 /* FiberState.ACTIVE */;
        if (isCurrent())
            return { value, lease, isCurrent };
    }
}
export class LivingView {
    ports;
    isCurrent;
    world;
    constructor(ports = {}, isCurrent = () => true, world) {
        this.ports = ports;
        this.isCurrent = isCurrent;
        this.world = world;
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
    let registration, value, cleanup;
    const dispose = () => cleanup ??= settleCleanup(() => registration?.revoke(), () => { if (value)
        return close(value); }).finally(release);
    try {
        ctx.effect(() => dispose);
        const view = new LivingView({}, () => registration?.lease.isCurrent() === true &&
            (ctx.fiber.state === 1 /* FiberState.LOADING */ || ctx.fiber.state === 2 /* FiberState.ACTIVE */), world);
        value = create(view);
        registration = world.register(area, value, ctx.fiber);
        start(value);
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