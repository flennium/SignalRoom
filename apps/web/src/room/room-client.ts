import {
  PROTOCOL_VERSION,
  serverEventSchema,
  type PublishEvent,
  type ServerEvent,
  type SignalKind,
} from '@signalroom/protocol';

interface ConnectOptions {
  room: string;
  roomLabel?: string;
  name: string;
  onEvent(event: ServerEvent): void;
  onOffline(message?: string): void;
  onReconnecting(attempt: number): void;
}

export class RoomClient {
  private socket: WebSocket | null = null;
  private options: ConnectOptions | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private intentionallyClosed = false;

  connect(options: ConnectOptions) {
    this.disconnect(false);
    this.options = options;
    this.intentionallyClosed = false;
    this.open();
  }

  private open() {
    const options = this.options;
    if (!options) return;
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
      this.reconnectAttempt = 0;
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
    socket.addEventListener('error', () => undefined);
    socket.addEventListener('close', (event) => {
      if (this.socket !== socket || this.intentionallyClosed) return;
      this.socket = null;
      if (event.code === 1008 || event.code === 1003) {
        options.onOffline(
          event.reason || 'The server rejected this connection.',
        );
        return;
      }
      this.reconnectAttempt += 1;
      options.onReconnecting(this.reconnectAttempt);
      const delay = Math.min(15_000, 500 * 2 ** (this.reconnectAttempt - 1));
      const jitteredDelay = Math.round(delay * (0.8 + Math.random() * 0.4));
      this.reconnectTimer = window.setTimeout(() => this.open(), jitteredDelay);
    });
  }

  publish(kind: SignalKind, text: string, clientRequestId: string) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    const event: PublishEvent = {
      type: 'publish',
      kind,
      text,
      clientRequestId,
    };
    this.socket.send(JSON.stringify(event));
    return true;
  }

  acknowledge(messageId: string) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify({ type: 'ack', messageId }));
    return true;
  }

  disconnect(intentional = true) {
    this.intentionallyClosed = intentional;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
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
