import { z } from 'zod';
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_ROOM_KEY_LENGTH,
  MAX_ROOM_LABEL_LENGTH,
  PROTOCOL_VERSION,
  ROOM_KEY_PATTERN,
} from './limits.js';

export * from './limits.js';

const nonBlank = (max: number) => z.string().trim().min(1).max(max);
const timestampSchema = z.string().datetime();

export const signalKindSchema = z.literal('notice');

export const participantSchema = z.object({
  id: z.string().uuid(),
  name: nonBlank(MAX_DISPLAY_NAME_LENGTH),
});

export const signalSchema = z.object({
  id: z.string().uuid(),
  room: nonBlank(MAX_ROOM_KEY_LENGTH).regex(ROOM_KEY_PATTERN),
  kind: signalKindSchema,
  text: nonBlank(MAX_MESSAGE_LENGTH),
  sender: participantSchema,
  createdAt: timestampSchema,
  clientRequestId: z.string().uuid(),
});

export const joinEventSchema = z.object({
  type: z.literal('join'),
  protocol: z.literal(PROTOCOL_VERSION),
  room: nonBlank(MAX_ROOM_KEY_LENGTH).regex(ROOM_KEY_PATTERN),
  roomLabel: nonBlank(MAX_ROOM_LABEL_LENGTH).optional(),
  name: nonBlank(MAX_DISPLAY_NAME_LENGTH),
});

export const publishEventSchema = z.object({
  type: z.literal('publish'),
  kind: signalKindSchema,
  text: nonBlank(MAX_MESSAGE_LENGTH),
  clientRequestId: z.string().uuid(),
});

export const pingEventSchema = z.object({ type: z.literal('ping') });

export const clientEventSchema = z.discriminatedUnion('type', [
  joinEventSchema,
  publishEventSchema,
  pingEventSchema,
]);

const serverBaseSchema = z.object({
  protocol: z.literal(PROTOCOL_VERSION),
  serverTime: timestampSchema,
});

export const welcomeEventSchema = serverBaseSchema.extend({
  type: z.literal('welcome'),
  self: participantSchema,
  room: z.object({
    key: nonBlank(MAX_ROOM_KEY_LENGTH).regex(ROOM_KEY_PATTERN),
    label: nonBlank(MAX_ROOM_LABEL_LENGTH),
  }),
});

export const historyEventSchema = serverBaseSchema.extend({
  type: z.literal('history'),
  signals: z.array(signalSchema),
});

export const signalEventSchema = serverBaseSchema.extend({
  type: z.literal('signal'),
  signal: signalSchema,
});

export const presenceEventSchema = serverBaseSchema.extend({
  type: z.literal('presence'),
  participants: z.array(participantSchema),
});

export const errorCodeSchema = z.enum([
  'INVALID_EVENT',
  'NOT_JOINED',
  'ALREADY_JOINED',
  'ROOM_FULL',
  'MESSAGE_TOO_LARGE',
  'JOIN_TIMEOUT',
  'SERVER_SHUTDOWN',
]);

export const errorEventSchema = serverBaseSchema.extend({
  type: z.literal('error'),
  code: errorCodeSchema,
  message: z.string(),
  clientRequestId: z.string().uuid().optional(),
});

export const shutdownEventSchema = serverBaseSchema.extend({
  type: z.literal('shutdown'),
  message: z.string(),
});

export const pongEventSchema = serverBaseSchema.extend({
  type: z.literal('pong'),
});

export const serverEventSchema = z.discriminatedUnion('type', [
  welcomeEventSchema,
  historyEventSchema,
  signalEventSchema,
  presenceEventSchema,
  errorEventSchema,
  shutdownEventSchema,
  pongEventSchema,
]);

export type Participant = z.infer<typeof participantSchema>;
export type Signal = z.infer<typeof signalSchema>;
export type JoinEvent = z.infer<typeof joinEventSchema>;
export type PublishEvent = z.infer<typeof publishEventSchema>;
export type ClientEvent = z.infer<typeof clientEventSchema>;
export type WelcomeEvent = z.infer<typeof welcomeEventSchema>;
export type HistoryEvent = z.infer<typeof historyEventSchema>;
export type SignalEvent = z.infer<typeof signalEventSchema>;
export type PresenceEvent = z.infer<typeof presenceEventSchema>;
export type ErrorEvent = z.infer<typeof errorEventSchema>;
export type ShutdownEvent = z.infer<typeof shutdownEventSchema>;
export type ServerEvent = z.infer<typeof serverEventSchema>;
