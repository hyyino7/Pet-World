import type { Session } from '@deepseek-ai/dsh-session';
import type { PetCoreHost } from '../../core/index.js';
import { type CompanionWritingScope } from '../../core/companion-writing.js';
/** Verify the original native receipt and the canonical file, never reply text.
 * An already existing dated record closes a stale retry without rewriting it. */
export declare function reviewDiaryStatus(host: Pick<PetCoreHost, 'workspace'>, scope: CompanionWritingScope, day: string, session: Session, messageId: string): 'written' | 'existing' | 'missing';
