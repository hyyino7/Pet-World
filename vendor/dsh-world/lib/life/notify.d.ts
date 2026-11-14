import { spawn } from 'node:child_process';
import type { Outlet } from '../ecosystem/shared/outlets.ts';
/** reach_out's channels: the system notification where there is one, then every outlet that takes `reach`. */
export interface Notifier {
    toast?(title: string, body: string): Promise<void>;
    outlets: readonly Outlet[];
}
/** System notifications exist on Windows only (WinRT through PowerShell); elsewhere the channel is simply absent. */
export declare const toastSupported: () => boolean;
/**
 * The DSH desktop's notification identity (AppUserModelID) differs between builds: newer ones register
 * `com.deepseek.dsh`, older ones Electron's default. Tried in this order, then any Start entry named after DSH.
 */
export declare const KNOWN_DSH_APP_IDS: readonly ["com.deepseek.dsh", "electron.app.DeepSeek Harness"];
/**
 * The host runs as plain Node (no Electron Notification), so toasts go through WinRT from PowerShell.
 * PowerShell treats U+2018/2019/201A/201B as single quotes, so no text is ever interpolated: it travels as base64.
 *
 * Windows shows a desktop app's toast only for an identity with a Start menu entry, and for any other identity
 * `Show` still succeeds while nothing appears. So the identity is looked up there (`lookup`), the configured one
 * included, and a missing or switched-off one fails loudly. The identity used is written to stdout.
 */
export declare function toastScript(appId: string | undefined, title: string, body: string, lookup?: boolean): string;
/** `appId` is the configured identity; without one it is found once and reused while it keeps working. */
export declare function windowsToast(appId?: string, spawnImpl?: typeof spawn, timeoutMs?: number): (title: string, body: string) => Promise<void>;
