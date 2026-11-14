import type { UserMessage } from '@deepseek-ai/dsh-llm';
import type { PetCoreHost } from '../core/index.js';
interface Encoded {
    data: string;
    mediaType: string;
}
interface NativeAttachments {
    admitPromptContent(content: unknown[]): Promise<UserMessage['content']>;
}
/** Keep upload bytes with the portable Repo; native attachment admission owns
 * validation, normalization and all model-facing references on each device. */
export declare class DesktopImages {
    private host;
    private attachments;
    private component;
    private maxEncodedSize;
    private restored?;
    constructor(host: PetCoreHost, attachments: () => NativeAttachments | undefined, component?: 'desktop' | 'room', maxEncodedSize?: number);
    private directory;
    private validate;
    admit(image: Encoded): Promise<UserMessage['content']>;
    restore(): Promise<void>;
}
export {};
