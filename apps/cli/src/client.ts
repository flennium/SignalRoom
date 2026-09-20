import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  PROTOCOL_VERSION,
  serverEventSchema,
  type Participant,
  type Signal,
  type SignalKind,
} from '@signalroom/protocol';
import WebSocket from 'ws';

export interface InteractiveClientOptions {
  url: string;
  room: string;
  name: string;
  reconnect: boolean;
}

export async function runInteractiveClient(options: InteractiveClientOptions) {
  const readline = createInterface({ input: stdin, output: stdout });
  const signals = new Map<string, Signal>();
  let participants: Participant[] = [];
  let socket: WebSocket | null = null;
  let quitting = false;
  let reconnectAttempt = 0;

  console.log(`Connecting to ${options.url} as ${options.name}…`);
  console.log(
    'Commands: /notice /question /decision /action /ack /who /help /quit',
  );

  const connectionLoop = async () => {
    while (!quitting) {
      try {
        socket = await openSocket(options.url);
        reconnectAttempt = 0;
        socket.send(
          JSON.stringify({
            type: 'join',
            protocol: PROTOCOL_VERSION,
            room: options.room,
            name: options.name,
          }),
        );
        await new Promise<void>((resolve) => {
          socket?.on('message', (data) => {
            const result = serverEventSchema.safeParse(
              JSON.parse(data.toString()),
            );
            if (!result.success) {
              console.error(
                '\nThe server sent an event this client cannot understand.',
              );
              return;
            }
            const event = result.data;
            if (event.type === 'welcome') {
              console.log(
                `\nConnected to room "${event.room.label}" as ${event.self.name}.`,
              );
            } else if (event.type === 'history') {
              for (const signal of event.signals) {
                signals.set(signal.id, signal);
                renderSignal(signal);
              }
            } else if (event.type === 'signal') {
              signals.set(event.signal.id, event.signal);
              renderSignal(event.signal);
            } else if (event.type === 'presence') {
              participants = event.participants;
              console.log(
                `\n${participants.length} participant${participants.length === 1 ? '' : 's'} online.`,
              );
            } else if (event.type === 'acknowledged') {
              const signal = signals.get(event.messageId);
              if (signal) signal.acknowledgedBy = event.acknowledgedBy;
              console.log(
                `\n[${event.messageId.slice(0, 8)}] acknowledged by ${event.acknowledgedBy.map((person) => person.name).join(', ') || 'nobody'}`,
              );
            } else if (event.type === 'error') {
              console.error(`\n${event.code}: ${event.message}`);
            } else if (event.type === 'shutdown') {
              console.log(`\n${event.message}`);
            }
          });
          socket?.once('close', resolve);
          socket?.once('error', resolve);
        });
      } catch (error) {
        console.error(
          `\nConnection failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        socket = null;
      }

      if (quitting || !options.reconnect) break;
      reconnectAttempt += 1;
      const waitMs = Math.min(15_000, 500 * 2 ** (reconnectAttempt - 1));
      console.log(`Reconnecting in ${Math.ceil(waitMs / 1_000)}s…`);
      await wait(waitMs);
    }
  };

  const inputLoop = async () => {
    while (!quitting) {
      const input = (await readline.question('> ')).trim();
      if (!input) continue;
      if (input === '/quit') {
        quitting = true;
        socket?.close(1000, 'Client left');
        break;
      }
      if (input === '/help') {
        console.log(
          '/notice <text>  /question <text>  /decision <text>  /action <text>',
        );
        console.log('/ack <message-id>  /who  /quit');
        continue;
      }
      if (input === '/who') {
        console.log(
          participants.map((person) => person.name).join(', ') ||
            'Nobody is online.',
        );
        continue;
      }
      if (input.startsWith('/ack ')) {
        const prefix = input.slice(5).trim();
        const matches = [...signals.keys()].filter((id) =>
          id.startsWith(prefix),
        );
        if (matches.length !== 1) {
          console.error(
            matches.length
              ? 'That ID prefix matches more than one signal.'
              : 'No visible signal matches that ID.',
          );
          continue;
        }
        send(socket, { type: 'ack', messageId: matches[0] });
        continue;
      }

      const command = input.match(
        /^\/(notice|question|decision|action)\s+(.+)$/s,
      );
      const kind = (command?.[1] ?? 'notice') as SignalKind;
      const text = command?.[2] ?? input;
      send(socket, {
        type: 'publish',
        kind,
        text,
        clientRequestId: crypto.randomUUID(),
      });
    }
  };

  await Promise.all([connectionLoop(), inputLoop()]);
  readline.close();
}

function openSocket(url: string) {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function send(socket: WebSocket | null, event: object) {
  if (socket?.readyState !== WebSocket.OPEN) {
    console.error('Not connected. Wait for the server before sending.');
    return;
  }
  socket.send(JSON.stringify(event));
}

function renderSignal(signal: Signal) {
  console.log(
    `\n[${signal.id.slice(0, 8)}] ${signal.sender.name} · ${signal.kind.toUpperCase()} · ${signal.text}`,
  );
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
