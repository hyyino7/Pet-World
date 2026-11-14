/** A renderable starting state, not a record of earlier eating or sleeping.
 * Reuse the scene's valid coordinates/pose. Unconsumed numeric needs are only
 * technical simulation baselines; no time-of-day story, route or event is seeded.
 */
export declare function initialBodyState(now?: number): any;
