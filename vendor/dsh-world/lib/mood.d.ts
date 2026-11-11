/** Her mood, kept in her room. The plugin never writes it: it only reads it back to her. */
export declare const MOOD_FILE = "mood.md";
/** Always shown, at 0 when she has not set them, so one snapshot compares with the next. */
export declare const DEFAULT_MOODS: readonly ["开心", "兴奋", "平静", "累", "困", "烦", "难过", "紧张"];
export type Mood = {
    kind: 'none';
} | {
    kind: 'failed';
    message: string;
} | {
    kind: 'mood';
    values: Map<string, number>;
    trivia: string[];
    cut: boolean;
    unread: number;
};
/**
 * One thing per line. A line ending in a number after a space, a full-width space or a colon is a mood `名字 数值`,
 * its value a whole number from 0 to 10; a line ending in anything else is a small thing beside her mood. A later line
 * for the same mood wins. A mood line she got wrong is counted, never taken as a small thing.
 */
export declare function parseMood(text: string): Mood;
/** A missing or blank file is `none`, not every mood at 0; a file that cannot be read is `failed`. */
export declare function readMood(path: string): Mood;
/** Shown once after an earlier snapshot when she has emptied or removed the file, so the old values stop counting. */
export declare const MOOD_CLEARED = "\u3010\u6211\u7684\u5FC3\u60C5\u503C\u3011\u73B0\u5728\u6CA1\u6709\u5FC3\u60C5\u503C\uFF08mood.md \u4E0D\u5728\u6216\u662F\u7A7A\u7684\uFF09\uFF0C\u4E4B\u524D\u90A3\u6761\u4E0D\u518D\u7B97\u6570\u3002";
/** What she reads just before the time block, in her own voice; undefined when there is nothing to show. */
export declare function moodText(mood: Mood): string | undefined;
