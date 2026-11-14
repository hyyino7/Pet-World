// Scripted model protocol fixtures only. These never classify production user text.
import { randomUUID } from 'node:crypto';

export async function* say(text) {
  yield { type: 'block-start', index: 0, blockType: 'text' };
  yield { type: 'text-delta', index: 0, text };
  yield { type: 'block-end', index: 0, block: { type: 'text', text } };
  yield { type: 'finish', reason: { kind: 'stop' } };
}
export async function* call(name, args) {
  // Deliberate commentary must never be concatenated into the final delivered reply.
  yield { type: 'block-start', index: 0, blockType: 'text' };
  yield { type: 'text-delta', index: 0, text: 'INTERNAL_FIXTURE_COMMENTARY' };
  yield { type: 'block-end', index: 0, block: { type: 'text', text: 'INTERNAL_FIXTURE_COMMENTARY' } };
  const block = { type: 'tool-call', id: randomUUID(), name, arguments: JSON.stringify(args) };
  yield { type: 'block-start', index: 1, blockType: 'tool-call' };
  yield { type: 'tool-call-delta', index: 1, id: block.id, name, argumentsDelta: block.arguments };
  yield { type: 'block-end', index: 1, block };
  yield { type: 'finish', reason: { kind: 'tool-calls' } };
}
