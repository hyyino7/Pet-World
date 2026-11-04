import type { ModulePort } from './common.js';
import type { CoreService } from './core.js';
import type { ExecutionPort } from './execution.js';
import type { MemoryService } from './memory.js';
import type { LifeService } from './life.js';
import type { DesktopService, RoomViewService } from './desktop.js';
import type { QQService } from './channels.js';
import type { BilibiliService } from './bilibili.js';
import type { ConsoleService } from './console.js';
import type { ResourceService } from './resources.js';
import type { MaintenanceService } from './maintenance.js';

/** Product aliases only. Native service keys and provider binding require V1. */
export interface ProductServiceMap {
  core: CoreService & ModulePort;
  execution: ExecutionPort;
  resources: ResourceService;
  maintenance: MaintenanceService;
  memory: MemoryService & ModulePort;
  life: LifeService & ModulePort;
  desktop: DesktopService & ModulePort;
  room: RoomViewService;
  qq: QQService & ModulePort;
  bilibili: BilibiliService & ModulePort;
  console: ConsoleService & ModulePort;
}
