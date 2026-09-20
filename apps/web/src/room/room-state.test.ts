import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION, type Signal } from '@signalroom/protocol';
import { initialRoomState, roomReducer } from './room-state.js';

const signal: Signal = {
  id: crypto.randomUUID(),
  room: 'demo',
  kind: 'notice',
  text: 'Ready',
  sender: { id: crypto.randomUUID(), name: 'Sam' },
  createdAt: new Date().toISOString(),
  clientRequestId: crypto.randomUUID(),
  acknowledgedBy: [],
};

describe('roomReducer', () => {
  it('connects from a welcome event', () => {
    const state = roomReducer(initialRoomState, {
      type: 'server',
      event: {
        type: 'welcome',
        protocol: PROTOCOL_VERSION,
        serverTime: new Date().toISOString(),
        self: signal.sender,
        room: { key: 'demo', label: 'Demo' },
      },
    });
    expect(state.connection).toBe('connected');
    expect(state.room?.label).toBe('Demo');
  });

  it('deduplicates signals and resolves an authoritative publish', () => {
    const publishing = roomReducer(initialRoomState, {
      type: 'publishing',
      requestId: signal.clientRequestId,
    });
    const once = roomReducer(publishing, {
      type: 'server',
      event: {
        type: 'signal',
        protocol: PROTOCOL_VERSION,
        serverTime: new Date().toISOString(),
        signal,
      },
    });
    const twice = roomReducer(once, {
      type: 'server',
      event: {
        type: 'history',
        protocol: PROTOCOL_VERSION,
        serverTime: new Date().toISOString(),
        signals: [signal],
      },
    });
    expect(twice.signals).toHaveLength(1);
    expect(once.publishingRequestId).toBeNull();
    expect(once.publishedRequestId).toBe(signal.clientRequestId);
  });

  it('applies authoritative acknowledgement state', () => {
    const state = { ...initialRoomState, signals: [signal] };
    const acknowledgedBy = [{ id: crypto.randomUUID(), name: 'Lina' }];
    const next = roomReducer(state, {
      type: 'server',
      event: {
        type: 'acknowledged',
        protocol: PROTOCOL_VERSION,
        serverTime: new Date().toISOString(),
        messageId: signal.id,
        acknowledgedBy,
      },
    });
    expect(next.signals[0]?.acknowledgedBy).toEqual(acknowledgedBy);
  });
});
