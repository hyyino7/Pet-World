/** Project only a successful turn's final non-tool reply, never its intermediate commentary. */
export function finalReply(events, turn) {
    const pending = [];
    for (const event of events) {
        if (event.type === 'assistant/message' && event.data.turn === turn) {
            const message = event.data.message;
            pending.push({ text: message.content.filter(block => block.type === 'text').map(block => block.text).join('\n'),
                tool: message.content.some(block => block.type === 'tool-call') });
        }
        if (event.type === 'turn/end' && event.data.turn === turn) {
            if (event.data.reason.kind !== 'completed')
                return '';
            return pending.filter(row => !row.tool && row.text.trim()).at(-1)?.text ?? '';
        }
    }
    return '';
}
//# sourceMappingURL=messages.js.map