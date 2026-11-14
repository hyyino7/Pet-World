import type { BehaviorPresentation, CompanionExpression } from '../contracts/behavior.js';
/** Shared semantic names; displays choose their own existing assets. */
export declare const companionFeelings: readonly ["happy", "calm", "sweet", "heartache", "worry", "sad", "jealous", "anger", "boredom"];
export declare const feelingLabels: Record<typeof companionFeelings[number], string>;
export declare function behaviorPresentation(home: any, expression?: CompanionExpression): BehaviorPresentation;
