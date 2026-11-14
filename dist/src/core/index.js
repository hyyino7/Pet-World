import { CoreNative } from './native.js';
import { NativeMemory } from './native-memory.js';
import { CoreWorkspace } from './workspace.js';
import { createPreferences } from './preferences.js';
import { CoreRuntime } from './runtime.js';
import { CoreRecords } from './records.js';
import { initializeMemoryStorage } from '../memory/initialization.js';
import { initializeRecentStorage } from '../emotion/recent.js';
import { memoryDirectory } from '../memory/client.js';
import { join, relative, sep } from 'node:path';
/** One companion's configuration, records and hooks into the native DSH runtime. */
export function createCore(config) {
    const runtime = new CoreRuntime(Object.freeze({ ...config }));
    const workspace = new CoreWorkspace(runtime);
    runtime.files = workspace;
    const native = new CoreNative(runtime), records = new CoreRecords(workspace, native);
    if (config.memory)
        native.memory = new NativeMemory(runtime, config.memory);
    workspace.registerInitializer('recent-experience', target => initializeRecentStorage(target.path), ['data/memory/recent-interactions.sqlite']);
    if (config.memory) {
        const useConfiguredDirectory = () => {
            const owner = runtime.store.meta('memory-configured-directory-owner');
            return !owner || owner.id === workspace.storageId();
        };
        workspace.registerInitializer('memory-bank', target => initializeMemoryStorage(config.memory, target, useConfiguredDirectory()), target => [relative(join(target.path, '.chatpet'), join(memoryDirectory(config.memory, target.path, useConfiguredDirectory()), 'data', 'memory.db')).split(sep).join('/')]);
    }
    runtime.capabilities = () => {
        const rows = runtime.baseCapabilities(), memory = rows.find(row => row.id === 'memory.lifecycle');
        if (native.memory) {
            const ready = native.memory.connection.lifecycle === 'ready';
            Object.assign(memory, { state: !native.memoryEnabledForNewSessions ? 'disabled' : ready ? 'ready' : 'degraded',
                reason: !native.memoryEnabledForNewSessions ? 'Memory is disabled for subsequent turns; native chat remains available' : ready ? 'Shared Bank available for native observation and recall' : `Memory provider ${native.memory.connection.lifecycle}; chat continues without recall on failure`,
                supportedOperations: ready ? ['observe', 'recall', 'correct', 'withdraw', 'validate'] : [] });
        }
        return rows;
    };
    return {
        services: { core: Object.freeze(runtime.core), preferences: createPreferences(runtime), workspace: workspace.port },
        operator: { request: runtime.owner.request },
        observe: (observer) => { runtime.onChange = observer; },
        workspace, native, records,
        close: async () => {
            try {
                await native.close();
            }
            finally {
                try {
                    records.close();
                    await native.memory?.close();
                }
                finally {
                    runtime.close();
                }
            }
        },
    };
}
//# sourceMappingURL=index.js.map