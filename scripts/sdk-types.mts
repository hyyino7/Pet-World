// Compile-time check of the installed SDK entry points; no DSH runtime is started.
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { defineTool } from '@deepseek-ai/dsh-tools';

export type InstalledHostContext = Context;
export type InstalledAgentStatus = Agent['status'];
export type InstalledToolFactory = typeof defineTool;
