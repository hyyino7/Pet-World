// 行为清单唯一的源码适配入口；重写时在此接上新的公开面。
import {readFileSync} from 'node:fs';

// 从 dist/tests/behavior-list/ 的编译产物定位呈现端源码，供现有 vm 夹具读取。
export const readHearControlSource = () => readFileSync(new URL('../../../src/desktop/platform/client.js', import.meta.url), 'utf8');

export * as corePlugin from '../../src/core/plugin.js';
export * as consolePlugin from '../../src/console/plugin.js';
export * as behaviorPlugin from '../../src/living/body/plugin.js';
export * as economyPlugin from '../../src/living/economy/plugin.js';
export * as lifePlugin from '../../src/living/plan/plugin.js';
export * as channelsPlugin from '../../src/channels/plugin.js';
export * as voicePlugin from '../../src/voice/plugin.js';
export * as memoryPlugin from '../../src/memory/plugin.js';
export * as roomPlugin from '../../src/room/plugin.js';
export * as desktopPlugin from '../../src/desktop/plugin.js';
export * as platformPlugin from '../../src/desktop/platform/plugin.js';
export * as emotionPlugin from '../../src/emotion/plugin.js';
export * as guestPreset from '../../src/channels/guest.js';
export { resolveCompanionHome } from '../../src/core/companion-foundation.js';
