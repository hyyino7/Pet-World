// Adapted from wz20/dsh-dafeiyu-dot lib/session.js projectMessages, ff288f57a2.
// Copyright (c) 2026 dsh-dafeiyu-dot contributors. MIT; see THIRD_PARTY_NOTICES.md.
import type { SessionEvent } from '@deepseek-ai/dsh-session';

/** Project only a successful turn's final non-tool reply, never its intermediate commentary. */
export function finalReply(events: readonly SessionEvent[], turn: number): string {
  const pending: { text: string; tool: boolean }[] = [];
  for (const event of events) {
    if (event.type === 'assistant/message' && event.data.turn === turn) {
      const message = event.data.message;
      pending.push({ text: message.content.filter(block => block.type === 'text').map(block => block.text).join('\n'),
        tool: message.content.some(block => block.type === 'tool-call') });
    }
    if (event.type === 'turn/end' && event.data.turn === turn) {
      if (event.data.reason.kind !== 'completed') return '';
      return pending.filter(row => !row.tool && row.text.trim()).at(-1)?.text ?? '';
    }
  }
  return '';
}
