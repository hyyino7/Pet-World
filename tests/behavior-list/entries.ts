// 行为清单唯一的源码适配入口；重写时在此接上新的公开面。
export {createCore} from '../../src/core/index.js';
export * as corePlugin from '../../src/core/plugin.js';
export * as behaviorPlugin from '../../src/behavior/plugin.js';
export * as economyPlugin from '../../src/economy/plugin.js';
export * as lifePlugin from '../../src/life/plugin.js';
export * as channelsPlugin from '../../src/channels/plugin.js';
export * as voicePlugin from '../../src/voice/plugin.js';
export * as memoryPlugin from '../../src/memory/plugin.js';
