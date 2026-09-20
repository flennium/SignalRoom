import { describe, expect, it } from 'vitest';
import {
  MAX_MESSAGE_LENGTH,
  clientEventSchema,
  joinEventSchema,
  serverEventSchema,
} from './index.js';

describe('protocol schemas', () => {
  it('accepts a valid join event', () => {
    expect(
      joinEventSchema.parse({
        type: 'join',
        protocol: 1,
        room: 'api-rehearsal',
        roomLabel: 'API rehearsal',
        name: 'Lina',
      }),
    ).toMatchObject({ room: 'api-rehearsal', name: 'Lina' });
  });

  it('rejects unknown and wrong-version events', () => {
    expect(clientEventSchema.safeParse({ type: 'dance' }).success).toBe(false);
    expect(
      joinEventSchema.safeParse({
        type: 'join',
        protocol: 2,
        room: 'demo',
        name: 'Sam',
      }).success,
    ).toBe(false);
  });

  it('rejects oversized messages', () => {
    expect(
      clientEventSchema.safeParse({
        type: 'publish',
        kind: 'notice',
        text: 'x'.repeat(MAX_MESSAGE_LENGTH + 1),
        clientRequestId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });

  it('accepts every signal kind and acknowledgements', () => {
    for (const kind of ['notice', 'question', 'decision', 'action']) {
      expect(
        clientEventSchema.safeParse({
          type: 'publish',
          kind,
          text: 'Shared signal',
          clientRequestId: crypto.randomUUID(),
        }).success,
      ).toBe(true);
    }
    expect(
      clientEventSchema.safeParse({
        type: 'ack',
        messageId: crypto.randomUUID(),
      }).success,
    ).toBe(true);
  });

  it('accepts documented server events', () => {
    expect(
      serverEventSchema.safeParse({
        type: 'pong',
        protocol: 1,
        serverTime: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });
});
