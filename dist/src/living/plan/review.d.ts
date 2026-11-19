import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../../core/index.js';
import type { ReviewScope } from './review-writing.js';
import type { InFlight } from '../index.js';
export { readLifeWriting, type ReviewScope } from './review-writing.js';
export declare const REVIEW_ALARM_FILE: string;
export declare function installLifeReview(ctx: Context, host: PetCoreHost, getScope: () => ReviewScope | undefined, inFlight: InFlight): void;
