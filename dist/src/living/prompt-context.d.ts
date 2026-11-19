import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { PetCoreHost } from '../core/index.js';
import type { CompanionBinding } from '../core/tables/companion-ports.js';
import { type LivingWorld } from './index.js';
export declare function installLivingPrompt(ctx: Context, host: PetCoreHost, world: LivingWorld, ownerScope: (agent: Agent) => CompanionBinding | undefined): () => void;
