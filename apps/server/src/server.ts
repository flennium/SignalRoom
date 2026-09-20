import { createReadStream, existsSync, statSync } from 'node:fs';
import {
  createServer,
  type Server as HttpServer,
  type ServerResponse,
} from 'node:http';
import { extname, join, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  MAX_FRAME_BYTES,
  PROTOCOL_VERSION,
  clientEventSchema,
  type ErrorEvent,
  type ServerEvent,
} from '@signalroom/protocol';
import { WebSocket, WebSocketServer } from 'ws';
import { Hub, HubError, type HubOptions } from './hub.js';

export interface ServerOptions extends HubOptions {
  host?: string;
  port?: number;
  staticDir?: string;
  joinTimeoutMs?: number;
  heartbeatMs?: number;
  allowedOrigins?: string[];
}

export interface RunningServer {
  host: string;
  port: number;
  url: string;
  hub: Hub;
  close(): Promise<void>;
}

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const serverEvent = (
  event: Omit<ErrorEvent, 'protocol' | 'serverTime'>,
): ErrorEvent => ({
  ...event,
  protocol: PROTOCOL_VERSION,
  serverTime: new Date().toISOString(),
});

export async function startServer(
  options: ServerOptions = {},
): Promise<RunningServer> {
  const host = options.host ?? '127.0.0.1';
  const requestedPort = options.port ?? 8080;
  const joinTimeoutMs = options.joinTimeoutMs ?? 5_000;
  const heartbeatMs = options.heartbeatMs ?? 30_000;
  const hub = new Hub(options);

  const httpServer = createServer((request, response) => {
    const requestUrl = new URL(
      request.url ?? '/',
      `http://${request.headers.host ?? 'localhost'}`,
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; connect-src 'self' ws: wss:; font-src 'self'; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'",
    );

    if (requestUrl.pathname === '/health') {
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify({ status: 'ok', version: '0.1.0' }));
      return;
    }

    if (
      options.staticDir &&
      serveStatic(options.staticDir, requestUrl.pathname, response)
    )
      return;

    response.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify({ error: 'Not found' }));
  });

  const websocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_FRAME_BYTES,
  });

  httpServer.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(
      request.url ?? '/',
      `http://${request.headers.host ?? 'localhost'}`,
    );
    if (requestUrl.pathname !== '/ws') {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    const origin = request.headers.origin;
    const sameOrigin = !origin || new URL(origin).host === request.headers.host;
    if (!sameOrigin && !options.allowedOrigins?.includes(origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit('connection', websocket, request);
    });
  });

  websocketServer.on('connection', (socket) =>
    configureConnection(socket, hub, joinTimeoutMs),
  );

  const heartbeat = setInterval(() => {
    for (const socket of websocketServer.clients) {
      const tracked = socket as TrackedSocket;
      if (!tracked.isAlive) {
        socket.terminate();
        continue;
      }
      tracked.isAlive = false;
      socket.ping();
    }
  }, heartbeatMs);
  heartbeat.unref();

  await listen(httpServer, host, requestedPort);
  const address = httpServer.address();
  if (!address || typeof address === 'string')
    throw new Error('Could not determine server address.');
  const port = address.port;

  return {
    host,
    port,
    url: `http://${host}:${port}`,
    hub,
    async close() {
      clearInterval(heartbeat);
      const shutdown: ServerEvent = {
        type: 'shutdown',
        protocol: PROTOCOL_VERSION,
        serverTime: new Date().toISOString(),
        message: 'This SignalRoom server stopped.',
      };
      for (const socket of websocketServer.clients) {
        if (socket.readyState === WebSocket.OPEN)
          socket.send(JSON.stringify(shutdown));
        socket.close(1001, 'Server shutdown');
      }
      hub.close();
      await new Promise<void>((resolve, reject) => {
        websocketServer.close(() => {
          httpServer.close((error) => (error ? reject(error) : resolve()));
        });
      });
    },
  };
}

interface TrackedSocket extends WebSocket {
  isAlive?: boolean;
}

function configureConnection(
  socket: WebSocket,
  hub: Hub,
  joinTimeoutMs: number,
) {
  const id = randomUUID();
  const tracked = socket as TrackedSocket;
  tracked.isAlive = true;

  const peer = {
    id,
    send(event: ServerEvent) {
      if (socket.bufferedAmount > 256 * 1024) {
        socket.close(1013, 'Client is not reading messages quickly enough');
        return;
      }
      if (socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify(event));
    },
  };
  const publishTimes: number[] = [];

  const joinTimer = setTimeout(() => {
    if (hub.hasJoined(id)) return;
    peer.send(
      serverEvent({
        type: 'error',
        code: 'JOIN_TIMEOUT',
        message: 'Join a room within five seconds of connecting.',
      }),
    );
    socket.close(1008, 'Join timeout');
  }, joinTimeoutMs);
  joinTimer.unref();

  socket.on('pong', () => {
    tracked.isAlive = true;
  });

  socket.on('message', (data, isBinary) => {
    if (isBinary) {
      peer.send(
        serverEvent({
          type: 'error',
          code: 'INVALID_EVENT',
          message: 'SignalRoom accepts text JSON events only.',
        }),
      );
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(data.toString());
    } catch {
      peer.send(
        serverEvent({
          type: 'error',
          code: 'INVALID_EVENT',
          message: 'Send a valid JSON event.',
        }),
      );
      return;
    }

    const result = clientEventSchema.safeParse(parsedJson);
    if (!result.success) {
      peer.send(
        serverEvent({
          type: 'error',
          code: 'INVALID_EVENT',
          message: 'The event does not match protocol version 1.',
        }),
      );
      return;
    }

    const event = result.data;
    try {
      if (event.type === 'join') {
        hub.join(peer, event.room, event.roomLabel, event.name);
        clearTimeout(joinTimer);
      } else if (event.type === 'publish') {
        const cutoff = Date.now() - 5_000;
        while (publishTimes[0] && publishTimes[0] < cutoff)
          publishTimes.shift();
        if (publishTimes.length >= 10) {
          peer.send(
            serverEvent({
              type: 'error',
              code: 'RATE_LIMITED',
              message: 'You can publish again in a few seconds.',
              clientRequestId: event.clientRequestId,
            }),
          );
          return;
        }
        publishTimes.push(Date.now());
        hub.publish(peer, event.kind, event.text, event.clientRequestId);
      } else if (event.type === 'ack') {
        hub.acknowledge(peer, event.messageId);
      } else {
        peer.send({
          type: 'pong',
          protocol: PROTOCOL_VERSION,
          serverTime: new Date().toISOString(),
        });
      }
    } catch (error) {
      if (error instanceof HubError) {
        peer.send(
          serverEvent({
            type: 'error',
            code: error.code,
            message: error.message,
            ...(event.type === 'publish'
              ? { clientRequestId: event.clientRequestId }
              : {}),
          }),
        );
        return;
      }
      throw error;
    }
  });

  socket.on('close', () => {
    clearTimeout(joinTimer);
    hub.leave(id);
  });
}

function listen(server: HttpServer, host: string, port: number) {
  return new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function serveStatic(
  staticDir: string,
  pathname: string,
  response: ServerResponse,
) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
  let filePath = join(staticDir, safePath);

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(staticDir, 'index.html');
  }
  if (!existsSync(filePath)) return false;

  response.writeHead(200, {
    'Content-Type':
      contentTypes[extname(filePath)] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
  return true;
}
