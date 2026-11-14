import type { Alarm, Review } from './types.ts';
import { type AlarmMessages } from './messages.ts';
/** The local time of her evening look back unless the console sets another. */
export declare const DEFAULT_REVIEW_TIME = "23:00";
/** A local time of day, HH:MM on the 24-hour clock. */
export declare const CLOCK_TIME: RegExp;
export declare const validClockTime: (value: unknown) => value is string;
export declare function resolveAlarmTime(input: {
    at?: string;
    after_minutes?: number;
}, now: Date, timeZone?: string): Date;
/** The first instant strictly after `now` whose local time in `timeZone` is hhmm:00; a time skipped by a DST gap lands on the first instant after the gap. */
export declare function nextLocalTime(now: Date, hhmm: string, timeZone: string): Date;
export declare function formatDuration(ms: number): string;
/**
 * What she hears when an alarm rings. The wording comes from the alarm template (`extra` carries her
 * names for templates that use them, plus `did` — one line about what she actually did since she set the
 * alarm, so the promise and the record arrive together); the 【我的时间】 mark is always the plugin's own.
 */
export declare function wakeText(alarm: Alarm, now: Date, timeZone: string, fallbackWakeTime: string, messages?: AlarmMessages, extra?: Record<string, string>): string;
/** What a new home says the moment it is built, or her home when her world starts again. */
export declare function greetingText(kind: 'arrival' | 'return', timeZone: string, fallbackWakeTime: string, messages?: AlarmMessages, extra?: Record<string, string>): string;
/** The next look back after `now` at local `time`, and the day it looks back on: one before noon looks back on the day before. */
export declare function nextReview(now: Date, timeZone: string, time?: string): Review;
/**
 * The look back on `day` once its time has changed to `time`: no day is looked back on twice or skipped. Moved
 * earlier than now, the day's look back is due at once.
 */
export declare function reviewOf(day: string, now: Date, timeZone: string, time: string): Review;
/** Where her day is written down; a file that does not exist is left out. */
export interface ReviewFiles {
    conversations?: string;
    activity?: string;
    diaryDir: string;
    selfFile: string;
    snapshot?: string;
}
/** The evening look back: the day, where to read it, and her 我是谁 to rewrite if she has changed. */
export declare function reviewText(review: Review, now: Date, files: ReviewFiles, timeZone: string, fallbackWakeTime: string, messages?: AlarmMessages, extra?: Record<string, string>): string;
/** What she hears when a home turn stops well before the time she said she would keep at it. */
export declare function earlyStopText(alarm: Alarm, now: Date, timeZone: string, messages?: AlarmMessages, extra?: Record<string, string>): string;
/** plan_next's answer. Replacing her own plan says what it carried, while she can still copy it over; the plugin's own alarms are replaced silently. */
export declare function planReply(at: Date, replaced: Alarm | undefined, timeZone: string): string;
export declare function checkReply(alarm: Alarm | undefined, now: Date, timeZone: string): string;
export declare function cancelReply(cancelled: Alarm | undefined, next: Alarm | undefined, timeZone: string): string;
/** Told once a day, when her home has spent past the daily budget. */
export declare function budgetText(spent: number, budget: number, messages?: AlarmMessages, extra?: Record<string, string>): string;
