import type {
  ErrorEvent,
  Participant,
  ServerEvent,
  Signal,
} from '@signalroom/protocol';

export interface RoomSummary {
  key: string;
  label: string;
}

export interface RoomState {
  connection: 'connecting' | 'connected' | 'offline';
  self: Participant | null;
  room: RoomSummary | null;
  participants: Participant[];
  signals: Signal[];
  publishingRequestId: string | null;
  publishedRequestId: string | null;
  error: string | null;
}

export const initialRoomState: RoomState = {
  connection: 'connecting',
  self: null,
  room: null,
  participants: [],
  signals: [],
  publishingRequestId: null,
  publishedRequestId: null,
  error: null,
};

export type RoomAction =
  | { type: 'connecting' }
  | { type: 'offline'; message?: string }
  | { type: 'publishing'; requestId: string }
  | { type: 'server'; event: ServerEvent };

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  if (action.type === 'connecting') {
    return { ...state, connection: 'connecting', error: null };
  }
  if (action.type === 'offline') {
    return {
      ...state,
      connection: 'offline',
      publishingRequestId: null,
      error:
        action.message ??
        'Connection lost. Check that the SignalRoom server is running.',
    };
  }
  if (action.type === 'publishing') {
    return {
      ...state,
      publishingRequestId: action.requestId,
      publishedRequestId: null,
      error: null,
    };
  }

  const event = action.event;
  switch (event.type) {
    case 'welcome':
      return {
        ...state,
        connection: 'connected',
        self: event.self,
        room: event.room,
        error: null,
      };
    case 'history':
      return { ...state, signals: deduplicate(event.signals) };
    case 'signal': {
      const confirmsPendingPublish =
        event.signal.clientRequestId === state.publishingRequestId;
      return {
        ...state,
        signals: deduplicate([...state.signals, event.signal]),
        publishingRequestId: confirmsPendingPublish
          ? null
          : state.publishingRequestId,
        publishedRequestId: confirmsPendingPublish
          ? event.signal.clientRequestId
          : state.publishedRequestId,
      };
    }
    case 'presence':
      return { ...state, participants: event.participants };
    case 'error':
      return reduceError(state, event);
    case 'shutdown':
      return {
        ...state,
        connection: 'offline',
        error: event.message,
        publishingRequestId: null,
      };
    case 'pong':
      return state;
  }
}

function reduceError(state: RoomState, event: ErrorEvent): RoomState {
  return {
    ...state,
    error: event.message,
    publishingRequestId:
      !event.clientRequestId ||
      event.clientRequestId === state.publishingRequestId
        ? null
        : state.publishingRequestId,
  };
}

function deduplicate(signals: Signal[]) {
  return [
    ...new Map(signals.map((signal) => [signal.id, signal])).values(),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
