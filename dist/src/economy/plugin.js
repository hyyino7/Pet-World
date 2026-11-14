import { defineTool } from '@deepseek-ai/dsh-tools';
import { lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { bytesDigest, canonical, check, digest, integer } from '../core/storage.js';
import { registerWorldPrompt } from '../core/world-prompt.js';
import { EconomyStore } from './store.js';
import { installEconomyAccessGuard } from './access.js';
const inventoryFiles = ['data/economy/', 'data/economy/economy.sqlite', 'data/economy/storage.json'];
const access = { mode: 'bounded', detail: '余额与物品由程序结算。原生文件工具防误改；同一系统账户的命令和其他插件仍可访问文件。' };
function localFile(path) {
    const stat = lstatSync(path, { throwIfNoEntry: false });
    check(!stat || stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Invalid retained garden file');
    return stat;
}
/** One synchronous ledger per active Core binding. Body owns effect receipts;
 * this service owns money/items and never creates another assistant runtime. */
export class CompanionEconomy {
    ctx;
    host;
    current;
    closed = false;
    constructor(ctx, host) {
        this.ctx = ctx;
        this.host = host;
    }
    protectedDirectory() {
        const status = this.host.workspace.status();
        return status.target ? join(status.target.path, '.chatpet', 'data', 'economy') : undefined;
    }
    retainedGarden(target, file) {
        const managed = join(target.path, '.chatpet', 'data');
        const life = join(managed, 'life'), behavior = join(managed, 'behavior');
        const owner = localFile(join(life, 'home.json')) || localFile(join(life, 'garden.json')) ? life : behavior;
        const sourcePath = join(owner, 'garden.json');
        if (file)
            check(resolve(file) === sourcePath, 'Garden authority path does not match the current Body owner');
        const home = join(owner, 'home.json'), database = join(managed, 'economy', 'economy.sqlite');
        const stat = localFile(home);
        if (stat) {
            check(stat.size <= 32 * 1024 * 1024, 'Body checkpoint is too large');
            const saved = JSON.parse(readFileSync(home, 'utf8'));
            if (saved.economyGardenAuthority === true)
                check(localFile(database), 'The authoritative economy database is missing; restore it before continuing');
        }
        const old = localFile(sourcePath);
        if (!old)
            return;
        check(old.size <= 32 * 1024 * 1024, 'Retained garden file is too large');
        const bytes = readFileSync(sourcePath);
        return { state: JSON.parse(bytes.toString('utf8')), sourcePath, sourceHash: bytesDigest(bytes) };
    }
    bodyRequiresDatabase(target) {
        const data = join(target.path, '.chatpet', 'data'), life = join(data, 'life');
        const owner = localFile(join(life, 'home.json')) || localFile(join(life, 'garden.json')) ? life : join(data, 'behavior');
        const home = join(owner, 'home.json'), stat = localFile(home);
        if (!stat)
            return false;
        check(stat.size <= 32 * 1024 * 1024, 'Body checkpoint is too large');
        return JSON.parse(readFileSync(home, 'utf8')).economyGardenAuthority === true;
    }
    /** Initialization is schema preparation only: no allowance, gifts or goals. */
    prepare(target, legacyFile, initializing = false) {
        check(!this.closed, 'Economy is stopped');
        const storageId = this.host.workspace.storageId(), companionId = this.host.workspace.runtime.config.companionId;
        const key = canonical({ path: target.path, storageId, companionId });
        if (this.current?.key === key) {
            this.current.store.validate();
            // Core initialization can roll back after this separate schema committed.
            // A same-process retry must restore the Core inventory/authority marker.
            if (!this.host.workspace.runtime.store.meta(`economy.initialized:${storageId}`)) {
                const remember = () => this.host.workspace.runtime.store.setMeta(`economy.initialized:${storageId}`, { companionId, path: target.path });
                if (initializing)
                    remember();
                else
                    this.host.workspace.runtime.store.transaction(remember);
            }
            return this.current.store;
        }
        this.current?.store.close();
        this.current = undefined;
        const metadata = this.host.workspace.runtime.store;
        // Inspect this independent authority evidence BEFORE SQLite can create a
        // new empty file. A partial Core/marker restore cannot revive old money.
        const expectedInitialized = !!metadata.meta(`economy.initialized:${storageId}`) || this.bodyRequiresDatabase(target);
        const store = new EconomyStore({ workspacePath: target.path, storageId, companionId, expectedInitialized,
            loadLegacyGarden: () => this.retainedGarden(target, legacyFile),
            guard: () => {
                check(!this.closed, 'Economy is stopped');
                check(metadata.persisted(), 'Core database is absent or moved');
                check(this.host.workspace.storageId() === storageId, 'Economy binding changed');
            } });
        const remember = () => metadata.setMeta(`economy.initialized:${storageId}`, { companionId, path: target.path });
        try {
            if (initializing)
                remember();
            else
                metadata.transaction(remember);
        }
        catch (error) {
            store.close();
            throw error;
        }
        this.current = { key, target, store };
        return store;
    }
    bound(workspaceId) {
        check(!this.closed, 'Economy is stopped');
        const status = this.host.workspace.status();
        check(status.state === 'ready' && status.target?.id === workspaceId, 'Economy requires the current bound workspace');
        return this.prepare(status.target);
    }
    use(store, row) {
        const item = store.catalog().find(item => item.id === row.itemId);
        const saved = row;
        return { ...row, effects: saved.effects ?? item?.effects ?? {}, label: saved.label ?? item?.name ?? row.itemId, ...(item?.presentationSlot ? { presentationSlot: item.presentationSlot } : {}) };
    }
    gardenPort(workspaceId, legacyFile) {
        const store = this.bound(workspaceId);
        if (legacyFile) {
            const root = join(this.current.target.path, '.chatpet', 'data');
            check([join(root, 'life', 'garden.json'), join(root, 'behavior', 'garden.json')].includes(resolve(legacyFile)), 'Garden authority path is outside the bound Body');
        }
        const checked = () => { check(this.bound(workspaceId) === store, 'Economy binding changed'); return store; };
        return {
            loadGarden: (now, passive) => checked().readGarden(now, passive),
            saveGarden: (state, _now) => checked().writeGarden(state, state.economyRevision),
            actGarden: (input, now, passive) => checked().applyGarden(input, typeof input.requestId === 'string' ? input.requestId : `owner-garden:${randomUUID()}`, now, passive),
            gardenRules: () => checked().readGarden().economyConfig,
            transaction: (operationId, input) => {
                const s = checked();
                // A deterministic refusal is an intent failure, not an unknown payment.
                try {
                    if (input.type === 'buy')
                        s.purchase(operationId, input.itemId, input.quantity);
                    else
                        s.sell(operationId, input.itemId, input.quantity);
                    return { status: 'completed' };
                }
                catch (error) {
                    const detail = error?.detail;
                    if (detail && ['INVALID_ARGUMENT', 'NOT_FOUND', 'INELIGIBLE', 'LIMIT_REACHED', 'CONFLICT', 'DISABLED'].includes(detail.code ?? ''))
                        return { status: 'failed', message: error.message };
                    throw error;
                }
            },
            preflightFood: itemId => {
                const s = checked(), item = s.catalog().find(row => row.id === itemId);
                check(item?.kind === 'food' && item.effects, 'The selected item is not usable food');
                check(s.snapshot().inventory.some(row => row.itemId === itemId && row.available >= 1), 'No available food remains in inventory');
            },
            foodPresentation: itemId => { const item = checked().catalog().find(row => row.id === itemId); return item?.kind === 'food' ? item.presentationSlot : undefined; },
            reserveFood: (operationId, itemId) => this.use(checked(), checked().beginUse(operationId, itemId)),
            finishFood: (operationId, proof) => this.use(checked(), checked().finishUse(operationId, proof)),
            inspectUse: operationId => { const s = checked(), row = s.itemUse(operationId); return row && this.use(s, row); },
            // A missing Body result is never proof of no effect. Body supplies explicit
            // cancellation proof through its own no-effect receipt, not this shortcut.
            cancelUse: (operationId, proof) => { const s = checked(), row = s.itemUse(operationId); return row && this.use(s, s.cancelUse(operationId, proof)); },
            readSegment: (operationId, input) => checked().readOffer(operationId, input),
            confirmRead: (operationId, token) => checked().confirmReading(operationId, token),
            readingStatus: (operationId, input) => checked().readingStatus(operationId, input),
        };
    }
    async snapshot(workspaceId, validate = () => { }) {
        validate();
        const store = this.bound(workspaceId), snapshot = store.snapshot();
        validate();
        return { ...snapshot, workspaceId, ledger: store.ledger({ limit: 80 }).items, configurationVersion: String(snapshot.configuration.revision), access };
    }
    async pendingFacts(workspaceId) { return this.bound(workspaceId).pendingFacts(); }
    async readFacts(workspaceId, ids) {
        const store = this.bound(workspaceId), facts = store.readFacts(ids);
        check(this.bound(workspaceId) === store, 'Economy binding changed');
        return facts;
    }
    async acknowledgeFacts(workspaceId, ids) {
        const store = this.bound(workspaceId);
        store.acknowledgeFacts(ids);
        check(this.bound(workspaceId) === store, 'Economy binding changed');
    }
    notifyFacts(workspaceId) {
        // Publication is a hint. A committed fact remains available to Life after
        // listener failure, unload or restart; notification cannot undo settlement.
        try {
            this.ctx.emit('pet/economy.fact', workspaceId);
        }
        catch (error) {
            try {
                this.ctx.logger('chatpet-economy').warn('Committed economic facts await delivery', error);
            }
            catch { }
        }
    }
    async ownerAction(workspaceId, action, requestId, signal, validate = () => { }, trustedActor) {
        const guard = () => { signal.throwIfAborted(); validate(); };
        guard();
        const store = this.bound(workspaceId);
        check(action && typeof action === 'object' && !Array.isArray(action), 'Invalid economic action');
        const actor = trustedActor ?? { kind: 'owner', id: this.host.workspace.runtime.config.ownerActorId, channel: 'settings' };
        check(actor.kind === 'owner' && actor.id === this.host.workspace.runtime.config.ownerActorId, 'Economic owner actions require the trusted owner');
        const quantity = action.quantity ?? 1;
        let execution;
        switch (action.kind) {
            case 'grant':
                store.grantMoney(requestId, action.amount, typeof action.note === 'string' && action.note.trim() ? action.note : undefined, actor);
                break;
            case 'gift':
                store.giftItem(requestId, action.itemId, quantity, typeof action.note === 'string' && action.note.trim() ? action.note : undefined, actor);
                break;
            case 'buy':
                store.purchase(requestId, action.itemId, quantity, actor);
                break;
            case 'sell':
                store.sell(requestId, action.itemId, quantity, actor);
                break;
            case 'importReading': {
                const sourceName = action.source?.name;
                check(typeof sourceName === 'string' && sourceName.length > 0 && sourceName.length <= 200, 'Invalid reading source');
                store.importBook(requestId, { itemId: `reading:owner-${digest(requestId).slice(7, 39)}`, title: action.title, text: action.content, ...(action.format === undefined ? {} : { format: action.format }), source: { kind: 'owner-import', name: sourceName } }, actor);
                break;
            }
            case 'feed': {
                integer(quantity, 'food quantity', 1, 1);
                const body = this.ctx.get('petBehavior');
                check(body, 'The shared Body is unavailable');
                execution = await body.consumeFood(workspaceId, { operationId: `owner-food:${digest(requestId).slice(7, 55)}`, itemId: action.itemId, interaction: { requestId, actor } }, guard);
                break;
            }
            default: throw Error('Unknown economic action');
        }
        if (action.kind !== 'feed')
            this.notifyFacts(workspaceId);
        guard();
        check(this.bound(workspaceId) === store, 'Economy binding changed');
        const snapshot = await this.snapshot(workspaceId, guard);
        return { ...snapshot, ...(execution ? { execution } : {}) };
    }
    async settings(workspaceId, expectedVersion, next, requestId, signal, validate = () => { }) {
        signal.throwIfAborted();
        validate();
        const store = this.bound(workspaceId);
        const version = Number(expectedVersion);
        integer(version, 'configuration version', 1);
        // UI may send the complete edited configuration. Schema/revision are CAS
        // metadata rather than user-editable economic values.
        const { version: _schema, revision: _revision, ...patch } = next;
        // The public Body snapshot serializes its physical checkpoint. Settings
        // must use the same passive admission rather than catch up disabled time.
        const passive = (await this.ctx.get('petBehavior')?.snapshot(workspaceId))?.autonomyEnabled ?? false;
        signal.throwIfAborted();
        validate();
        check(this.bound(workspaceId) === store, 'Economy binding changed');
        store.configure(requestId, patch, version, passive);
        signal.throwIfAborted();
        validate();
        return this.snapshot(workspaceId, validate);
    }
    close() { this.closed = true; this.current?.store.close(); this.current = undefined; }
}
export const name = '22-Economy';
export const inject = ['petCore', 'petWorld', 'tools', 'systemPrompt', 'agents'];
export function apply(ctx) {
    const host = ctx.petCore, service = new CompanionEconomy(ctx, host);
    // Adopt an existing ready workspace before registering required schema paths.
    // Failed adoption leaves the original JSON and all unrelated records intact.
    const status = host.workspace.status();
    if (status.state === 'ready' && status.target)
        try {
            service.prepare(status.target);
        }
        catch (error) {
            ctx.logger('chatpet-economy').warn('Economy is unavailable; retained files were not replaced', error);
        }
    const stopInitializer = host.workspace.registerInitializer('economy', target => { service.prepare(target, undefined, true); }, target => {
        const path = join(target.path, '.chatpet', 'data/economy/storage.json');
        return localFile(path) || host.workspace.runtime.store.meta(`economy.initialized:${host.workspace.storageId()}`) ? inventoryFiles : [];
    });
    ctx.provide('petEconomy', service);
    const stopAccess = installEconomyAccessGuard(ctx, () => service.protectedDirectory());
    const scope = (agent) => {
        if (!agent || agent.session.header.agentPreset === 'chatpet-channel-guest' || host.native.channelBoundary?.guest(agent.id) || !host.native.manages(agent.id))
            return;
        const bound = ctx.petWorld.sessionStatus(agent.session), current = host.workspace.status();
        if (bound?.state !== 'ready' || current.state !== 'ready' || !current.target || bound.target?.id !== current.target.id)
            return;
        return current.target.id;
    };
    const output = { schema: { type: 'string' }, render: (_, value) => [{ type: 'text', text: value }] };
    ctx.tools.register(defineTool({ name: 'pet_economy_state', description: '读取同一伙伴的真实钱包、库存、商店目录、读物与书签、待确认消费及近期流水。基础餐食和饮水免费。种植、收获、出售和消费由你明确选择并写入持久生活计划，不会自动派工、发工资或凭文字增加物品。', parameters: {}, output,
        execute: async (_args, exec) => {
            const id = scope(exec.agent);
            check(id, 'Economy requires an admitted owner conversation');
            const validate = () => { exec.signal.throwIfAborted(); check(scope(exec.agent) === id, 'Economy conversation admission changed'); host.native.validate(exec.agent.id); };
            return JSON.stringify(await service.snapshot(id, validate));
        } }), { when: ({ agent }) => !!scope(agent) });
    registerWorldPrompt(ctx, 'chatpet.economy', 35, agent => {
        const id = scope(agent);
        if (!id)
            return '';
        try {
            const snapshot = service.gardenPort(id).loadGarden(Date.now());
            return `生活经济：基础餐食、饮水免费，额外食物、读物与园艺用品使用游戏金币。收菜、出售、补种与消费由你决定，用生活计划明确安排，成熟和动画结束不会自动执行。钱物以程序流水为准；买到读物不等于读过，实际片段返回并确认后才保存书签。用 pet_economy_state 查询目录、库存与价格。当前金币 ${snapshot.coins}。这是持续的同一份钱包，换对话不重置。`;
        }
        catch {
            return '生活经济暂不可用。保留现有计划与未决操作，勿假设交易成功或另建钱包；基础餐食与饮水仍免费。';
        }
    });
    ctx.effect(() => () => { stopAccess(); stopInitializer(); service.close(); });
}
//# sourceMappingURL=plugin.js.map