import { check, integer } from './storage.js';
import { parseDesktopAppearance } from '../desktop/appearance.js';

export const DEFAULT_COMPANION_SETTINGS = Object.freeze({
  desktopSize: 232,
  desktopFixed: false,
  desktopConfineToScreen: false,
  desktopClickSound: true,
  desktopReplyBubble: true,
  desktopWhisperEnabled: false,
  desktopWhisperImageEnabled: true,
  desktopSleepTalkSeconds: 60,
  desktopWorkStatusEnabled: true,
  desktopTrayEnabled: true,
  desktopAppearance: {} as Record<string, unknown>,
  desktopBalanceEnabled: false,
  desktopBalanceMinutes: 30,
  desktopWhisperMinutes: 5,
  desktopBubbleSeconds: 10,
  workAnimationDelaySeconds: 5,
  stickerProbabilityPercent: 35,
  recentActionCount: 10,
  recentActionMinutes: 30,
  recentMoodCount: 3,
  recentMoodHours: 24,
  memorySummaryTurns: 10,
  memorySummaryIdleMinutes: 10,
  memorySummaryMinimumMinutes: 5,
  memoryRecallCount: 8,
  memoryRecallBlockChars: 600,
  memoryColdHours: 24,
});
export type CompanionSettings = { -readonly [K in keyof typeof DEFAULT_COMPANION_SETTINGS]: K extends 'desktopAppearance' ? Record<string, unknown> : (typeof DEFAULT_COMPANION_SETTINGS)[K] extends boolean ? boolean : number };

export function parseCompanionSettings(raw: unknown): CompanionSettings {
  check(raw && typeof raw === 'object' && !Array.isArray(raw), 'Invalid companion settings');
  check(['workAnimationDelaySeconds','stickerProbabilityPercent','recentActionCount','recentActionMinutes','recentMoodCount','recentMoodHours']
    .every(key => Object.hasOwn(raw, key)), 'Missing companion setting');
  check(Object.keys(raw).every(key => Object.hasOwn(DEFAULT_COMPANION_SETTINGS, key)), 'Unexpected companion setting');
  const settings = { ...DEFAULT_COMPANION_SETTINGS, ...raw } as CompanionSettings;
  settings.desktopAppearance = parseDesktopAppearance(settings.desktopAppearance);
  for (const key of ['desktopClickSound', 'desktopReplyBubble', 'desktopWhisperEnabled', 'desktopWhisperImageEnabled', 'desktopWorkStatusEnabled', 'desktopTrayEnabled', 'desktopBalanceEnabled', 'desktopFixed', 'desktopConfineToScreen'] as const) check(typeof settings[key] === 'boolean', 'Invalid Desktop switch');
  integer(settings.desktopSleepTalkSeconds, 'Sleep talk interval', 1, 86400);
  integer(settings.desktopSize, 'Desktop size', 96, 512);
  integer(settings.desktopBalanceMinutes, 'Balance interval', 1, 1440);
  integer(settings.desktopWhisperMinutes, 'Whisper interval', 1, 1440);
  integer(settings.desktopBubbleSeconds, 'Bubble duration', 1, 300);
  integer(settings.workAnimationDelaySeconds, 'Work animation delay', 0, 3600);
  integer(settings.stickerProbabilityPercent, 'Sticker probability', 0, 100);
  integer(settings.recentActionCount, 'Recent action count', 0, 500);
  integer(settings.recentActionMinutes, 'Recent action age', 0, 10080);
  integer(settings.recentMoodCount, 'Recent mood count', 0, 100);
  integer(settings.recentMoodHours, 'Recent mood age', 0, 720);
  integer(settings.memorySummaryTurns, 'Summary turns', 1, 200);
  integer(settings.memorySummaryIdleMinutes, 'Summary idle minutes', 1, 1440);
  integer(settings.memorySummaryMinimumMinutes, 'Minimum summary interval', 0, 1440);
  integer(settings.memoryRecallCount, 'Recall count', 1, 50);
  integer(settings.memoryRecallBlockChars, 'Recall block characters', 128, 4000);
  integer(settings.memoryColdHours, 'Cold session hours', 1, 720);
  return { ...settings };
}
