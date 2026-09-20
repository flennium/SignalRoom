import {
  PROTOCOL_VERSION,
  serverEventSchema,
  type PublishEvent,
  type ServerEvent,
} from '@signalroom/protocol';

interface ConnectOptions {
  room: string;
  roomLabel?: string;
  name: string;
  onEvent(event: ServerEvent): void;
  onOffline(message?: string): void;
}

export class RoomClient {
  private socket: WebSocket | null = null;

  connect(options: ConnectOptions) {
    this.disconnect();
    const configuredUrl = import.meta.env.VITE_SIGNALROOM_WS_URL as
      string | undefined;
    if (!configuredUrl && window.location.hostname.endsWith('.github.io')) {
      options.onOffline(
        'This GitHub Pages preview has no live server. Run SignalRoom locally to create a working room.',
      );
      return;
    }

    const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(
      configuredUrl || `${scheme}//${window.location.host}/ws`,
    );
    this.socket = socket;

    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          type: 'join',
          protocol: PROTOCOL_VERSION,
          room: options.room,
          ...(options.roomLabel ? { roomLabel: options.roomLabel } : {}),
          name: options.name,
        }),
      );
    });
    socket.addEventListener('message', (message) => {
      try {
        const result = serverEventSchema.safeParse(
          JSON.parse(String(message.data)),
        );
        if (result.success) options.onEvent(result.data);
        else
          options.onOffline(
            'The server sent an event this client cannot understand.',
          );
      } catch {
        options.onOffline('The server sent unreadable data.');
      }
    });
    socket.addEventListener('error', () => options.onOffline());
    socket.addEventListener('close', (event) => {
      if (this.socket === socket && !event.wasClean) options.onOffline();
    });
  }

  publish(text: string, clientRequestId: string) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    const event: PublishEvent = {
      type: 'publish',
      kind: 'notice',
      text,
      clientRequestId,
    };
    this.socket.send(JSON.stringify(event));
    return true;
  }

  disconnect() {
    if (this.socket) {
      const socket = this.socket;
      this.socket = null;
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close(1000, 'Client left');
      }
    }
  }
}
