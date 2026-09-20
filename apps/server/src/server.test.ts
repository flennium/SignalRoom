import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { ServerEvent } from '@signalroom/protocol';
import { startServer, type RunningServer } from './server.js';

let server: RunningServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

function connect(url: string) {
  const socket = new WebSocket(url.replace('http', 'ws') + '/ws');
  const events: ServerEvent[] = [];
  socket.on('message', (data) =>
    events.push(JSON.parse(data.toString()) as ServerEvent),
  );
  return new Promise<{ socket: WebSocket; events: ServerEvent[] }>(
    (resolve, reject) => {
      socket.once('open', () => resolve({ socket, events }));
      socket.once('error', reject);
    },
  );
}

function waitFor(predicate: () => boolean, timeoutMs = 1_000) {
  return new Promise<void>((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Timed out waiting for WebSocket event.'));
      }
    }, 5);
  });
}

describe('SignalRoom server', () => {
  it('serves health and broadcasts between real clients', async () => {
    server = await startServer({ port: 0, joinTimeoutMs: 500 });
    expect(
      await fetch(`${server.url}/health`).then((response) => response.json()),
    ).toEqual({
      status: 'ok',
    });

    const sam = await connect(server.url);
    const lina = await connect(server.url);
    sam.socket.send(
      JSON.stringify({
        type: 'join',
        protocol: 1,
        room: 'demo',
        roomLabel: 'Demo',
        name: 'Sam',
      }),
    );
    lina.socket.send(
      JSON.stringify({ type: 'join', protocol: 1, room: 'demo', name: 'Lina' }),
    );
    await waitFor(() => sam.events.some((event) => event.type === 'presence'));

    sam.socket.send(
      JSON.stringify({
        type: 'publish',
        kind: 'notice',
        text: 'Ready',
        clientRequestId: crypto.randomUUID(),
      }),
    );
    await waitFor(() =>
      [sam, lina].every(({ events }) =>
        events.some((event) => event.type === 'signal'),
      ),
    );
    expect(sam.events.filter((event) => event.type === 'signal')).toHaveLength(
      1,
    );
    expect(lina.events.filter((event) => event.type === 'signal')).toHaveLength(
      1,
    );

    sam.socket.close();
    lina.socket.close();
  });

  it('rejects publishing before join without closing the server', async () => {
    server = await startServer({ port: 0, joinTimeoutMs: 500 });
    const client = await connect(server.url);
    client.socket.send(
      JSON.stringify({
        type: 'publish',
        kind: 'notice',
        text: 'Too early',
        clientRequestId: crypto.randomUUID(),
      }),
    );
    await waitFor(() => client.events.some((event) => event.type === 'error'));
    expect(client.events.find((event) => event.type === 'error')).toMatchObject(
      {
        code: 'NOT_JOINED',
      },
    );
    client.socket.close();
  });
});
