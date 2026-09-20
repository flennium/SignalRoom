import { describe, expect, it, vi } from 'vitest';
import type { ServerEvent } from '@signalroom/protocol';
import { Hub, type HubClient } from './hub.js';

function client() {
  const events: ServerEvent[] = [];
  const peer: HubClient = {
    id: crypto.randomUUID(),
    send: (event) => events.push(event),
  };
  return { peer, events };
}

describe('Hub', () => {
  it('broadcasts to the sender and peers while isolating rooms', () => {
    const hub = new Hub();
    const sam = client();
    const lina = client();
    const noor = client();
    hub.join(sam.peer, 'demo', 'Demo', 'Sam');
    hub.join(lina.peer, 'demo', undefined, 'Lina');
    hub.join(noor.peer, 'other', 'Other', 'Noor');

    hub.publish(sam.peer, 'The API is ready.', crypto.randomUUID());

    expect(sam.events.filter((event) => event.type === 'signal')).toHaveLength(
      1,
    );
    expect(lina.events.filter((event) => event.type === 'signal')).toHaveLength(
      1,
    );
    expect(noor.events.filter((event) => event.type === 'signal')).toHaveLength(
      0,
    );
  });

  it('caps and orders recent history', () => {
    const hub = new Hub({ historyLimit: 2 });
    const sam = client();
    hub.join(sam.peer, 'demo', 'Demo', 'Sam');
    for (const text of ['one', 'two', 'three']) {
      hub.publish(sam.peer, text, crypto.randomUUID());
    }
    const lina = client();
    hub.join(lina.peer, 'demo', undefined, 'Lina');

    const history = lina.events.find((event) => event.type === 'history');
    expect(
      history?.type === 'history'
        ? history.signals.map((signal) => signal.text)
        : [],
    ).toEqual(['two', 'three']);
  });

  it('broadcasts presence after a disconnect and deletes an empty room later', () => {
    vi.useFakeTimers();
    const hub = new Hub({ emptyRoomGraceMs: 100 });
    const sam = client();
    const lina = client();
    hub.join(sam.peer, 'demo', 'Demo', 'Sam');
    hub.join(lina.peer, 'demo', undefined, 'Lina');

    hub.leave(lina.peer.id);
    const presence = sam.events
      .filter((event) => event.type === 'presence')
      .at(-1);
    expect(
      presence?.type === 'presence' ? presence.participants : [],
    ).toHaveLength(1);

    hub.leave(sam.peer.id);
    expect(hub.roomCount()).toBe(1);
    vi.advanceTimersByTime(100);
    expect(hub.roomCount()).toBe(0);
    vi.useRealTimers();
  });
});
