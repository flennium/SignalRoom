#!/usr/bin/env node
import { resolve } from 'node:path';
import { Command, InvalidArgumentError } from 'commander';
import { startServer } from '@signalroom/server';

const program = new Command()
  .name('signalroom')
  .description('Run a temporary command room for people and scripts.')
  .version('0.1.0');

program
  .command('start')
  .description('Start the SignalRoom server and web interface.')
  .option('--host <address>', 'network address to bind', '127.0.0.1')
  .option('--port <number>', 'listening port', parsePort, 8080)
  .action(async ({ host, port }: { host: string; port: number }) => {
    const server = await startServer({
      host,
      port,
      staticDir: resolve('apps/web/dist'),
    });
    console.log(`SignalRoom listening on ${server.url}`);
    console.log('Press Ctrl+C to stop gracefully.');

    let closing = false;
    const shutdown = async () => {
      if (closing) return;
      closing = true;
      console.log('\nStopping SignalRoom…');
      await server.close();
    };
    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());
  });

program
  .command('connect')
  .description('Connect an interactive terminal client (planned).')
  .action(() => {
    console.error(
      'signalroom connect is not available in this first vertical slice. Use the web interface.',
    );
    process.exitCode = 2;
  });

await program.parseAsync();

function parsePort(value: string) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new InvalidArgumentError('Port must be an integer from 0 to 65535.');
  }
  return port;
}
