import type { AttentionPolicy } from '../contracts/core.js';
import type { CoreRuntime } from './runtime.js';
import type { ServiceCall } from '../contracts/common.js';
import { conversationOptions, type ConversationOptions } from './options.js';
import { check, revision, text } from './storage.js';
import { isAbsolute } from 'node:path';

/** A configured workspace target, not proof of a working native conversation adapter. */
export interface WorkspaceTarget { id: string; path: string; title: string }
export interface CorePreferences {
  revision: number;
  workspace: WorkspaceTarget | null;
  conversation: Readonly<ConversationOptions>;
}
export interface PreferencesService {
  read: ServiceCall<Record<string, never>, CorePreferences>;
  setQuiet: ServiceCall<{ expectedRevision: number; quiet: boolean }, AttentionPolicy>;
  save: ServiceCall<{ expectedRevision: number; workspace: WorkspaceTarget | null; conversation: ConversationOptions }, CorePreferences>;
}
export function preferences(runtime: CoreRuntime): CorePreferences {
  const saved=runtime.store.get<CorePreferences>('preferences','current');
  return saved?{...saved,conversation:conversationOptions(saved.conversation)}:{revision:1,workspace:null,conversation:runtime.defaultConversation};
}
export function createPreferences(runtime: CoreRuntime): PreferencesService {
  return {
    read: runtime.call('preferences.read', false, () => preferences(runtime)),
    setQuiet: runtime.call('preferences.quiet', true, input => {
      const current = runtime.policy(); revision(current.revision, input.expectedRevision);
      check(typeof input.quiet === 'boolean', 'Invalid quiet value');
      const value = { ...current, revision: current.revision + 1, quiet: input.quiet };
      runtime.files?.write('policy', value);
      runtime.store.put('policy', 'current', value); return value;
    }),
    save: runtime.call('preferences.save', true, input => {
      const current = preferences(runtime); revision(current.revision, input.expectedRevision);
      const conversation = conversationOptions(input.conversation);
      check(Object.keys(input.conversation).length === Object.keys(conversation).length, 'Unexpected conversation setting');
      if (input.workspace !== null) {
        check(input.workspace && typeof input.workspace === 'object', 'Invalid workspace');
        text(input.workspace.id, 'workspace id', 256); text(input.workspace.path, 'workspace path', 4096);
        check(typeof input.workspace.title === 'string' && input.workspace.title.length <= 1024, 'Invalid workspace title');
        check(isAbsolute(input.workspace.path), 'Workspace path must be absolute');
      }
      const value: CorePreferences = { revision: current.revision + 1, workspace: input.workspace, conversation };
      runtime.files?.write('preferences', value);
      runtime.store.put('preferences', 'current', value);
      return value;
    }),
  };
}
