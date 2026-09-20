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

  it('safely rejects randomized JSON-shaped input', () => {
    let seed = 0x51_67_6e_61;
    const random = () => {
      seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
      return seed / 2 ** 32;
    };
    const value = (depth = 0): unknown => {
      const choice = Math.floor(random() * (depth > 2 ? 5 : 7));
      if (choice === 0) return null;
      if (choice === 1) return random() > 0.5;
      if (choice === 2) return (random() - 0.5) * Number.MAX_SAFE_INTEGER;
      if (choice === 3)
        return String.fromCodePoint(Math.floor(random() * 0x80));
      if (choice === 4) return 'x'.repeat(Math.floor(random() * 10_000));
      if (choice === 5)
        return Array.from({ length: Math.floor(random() * 8) }, () =>
          value(depth + 1),
        );
      return Object.fromEntries(
        Array.from({ length: Math.floor(random() * 8) }, (_, index) => [
          `key-${index}`,
          value(depth + 1),
        ]),
      );
    };

    for (let index = 0; index < 1_000; index += 1) {
      expect(() => clientEventSchema.safeParse(value())).not.toThrow();
    }
  });
});
