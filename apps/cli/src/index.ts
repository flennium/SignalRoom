#!/usr/bin/env node
import { resolve } from 'node:path';
import { Command, InvalidArgumentError } from 'commander';
import { startServer } from '@signalroom/server';
import { runInteractiveClient } from './client.js';

const program = new Command()
  .name('signalroom')
  .description('Run a temporary command room for people and scripts.')
  .version('0.1.0');

program
  .command('start')
  .description('Start the SignalRoom server and web interface.')
  .option(
    '--host <address>',
    'network address to bind',
    process.env.SIGNALROOM_HOST ?? '127.0.0.1',
  )
  .option(
    '--port <number>',
    'listening port',
    parsePort,
    parsePort(process.env.SIGNALROOM_PORT ?? process.env.PORT ?? '8080'),
  )
  .option(
    '--history <count>',
    'signals retained per room',
    parsePositiveInteger,
    parsePositiveInteger(process.env.SIGNALROOM_HISTORY ?? '50'),
  )
  .option(
    '--max-clients <count>',
    'server-wide connection limit',
    parsePositiveInteger,
    parsePositiveInteger(process.env.SIGNALROOM_MAX_CLIENTS ?? '100'),
  )
  .option(
    '--allowed-origin <origin>',
    'additional browser origin (repeatable)',
    collect,
    parseOrigins(process.env.SIGNALROOM_ALLOWED_ORIGIN),
  )
  .action(
    async ({
      host,
      port,
      history,
      maxClients,
      allowedOrigin,
    }: StartOptions) => {
      const server = await startServer({
        host,
        port,
        historyLimit: history,
        maxClients,
        allowedOrigins: allowedOrigin,
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
    },
  );

program
  .command('connect')
  .description('Connect an interactive terminal client.')
  .option(
    '--url <websocket-url>',
    'server WebSocket endpoint',
    'ws://127.0.0.1:8080/ws',
  )
  .option('--room <key>', 'room key', 'lobby')
  .requiredOption('--name <display-name>', 'name shown to other participants')
  .option('--no-reconnect', 'do not reconnect after an interruption')
  .action(
    async (options: {
      url: string;
      room: string;
      name: string;
      reconnect: boolean;
    }) => {
      await runInteractiveClient(options);
    },
  );

await program.parseAsync();

function parsePort(value: string) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new InvalidArgumentError('Port must be an integer from 0 to 65535.');
  }
  return port;
}

function parsePositiveInteger(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new InvalidArgumentError('Value must be a positive integer.');
  }
  return parsed;
}

function collect(value: string, previous: string[]) {
  return [...previous, value];
}

function parseOrigins(value: string | undefined) {
  return value
    ? value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];
}

interface StartOptions {
  host: string;
  port: number;
  history: number;
  maxClients: number;
  allowedOrigin: string[];
}
