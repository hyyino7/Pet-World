import { RegistrationTable } from './registry.js';
const capabilityIds = {
    'core.conversation': true,
    'memory.lifecycle': true,
    'life.pursuits': true,
    'life.economy': true,
    'emotion.expression': true,
    'desktop.presentation': true,
    'desktop.body': true,
    'desktop.room': true,
    'channel.qq': true,
    'content.bilibili': true,
    'voice.speech': true,
    'console.operations': true,
};
const moduleIds = {
    core: true,
    emotion: true,
    memory: true,
    life: true,
    desktop: true,
    qq: true,
    bilibili: true,
    voice: true,
    console: true,
};
export class CapabilityTable {
    table = new RegistrationTable({ order: row => row.order });
    register(row) {
        if (!Object.hasOwn(capabilityIds, row.id))
            throw new Error(`Unknown capability id: ${row.id}`);
        if (!Object.hasOwn(moduleIds, row.owner))
            throw new Error(`Unknown capability owner: ${row.owner}`);
        return this.table.register(row.id, { ...row, status: row.status.bind(row) });
    }
    list() {
        return this.table.entries().map(({ value, lease }) => ({
            ...value,
            status: lease.guard(() => {
                const status = value.status();
                lease.assertCurrent();
                return status;
            }),
        }));
    }
}
//# sourceMappingURL=capabilities.js.map