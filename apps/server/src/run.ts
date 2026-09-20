import { resolve } from 'node:path';
import { startServer } from './server.js';

const staticDir =
  process.env.NODE_ENV === 'production' ? resolve('apps/web/dist') : undefined;
const server = await startServer({
  ...(process.env.SIGNALROOM_HOST ? { host: process.env.SIGNALROOM_HOST } : {}),
  ...(process.env.SIGNALROOM_PORT
    ? { port: Number(process.env.SIGNALROOM_PORT) }
    : {}),
  ...(staticDir ? { staticDir } : {}),
});

console.log(`SignalRoom listening on ${server.url}`);

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  console.log('Stopping SignalRoom…');
  await server.close();
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
