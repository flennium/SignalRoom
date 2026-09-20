import { randomUUID } from 'node:crypto';
import {
  HISTORY_LIMIT,
  PROTOCOL_VERSION,
  type Participant,
  type ServerEvent,
  type Signal,
} from '@signalroom/protocol';

export interface HubClient {
  id: string;
  send(event: ServerEvent): void;
}

interface JoinedClient {
  peer: HubClient;
  participant: Participant;
}

interface Room {
  key: string;
  label: string;
  clients: Map<string, JoinedClient>;
  history: Signal[];
  deletionTimer: ReturnType<typeof setTimeout> | undefined;
}

export interface HubOptions {
  historyLimit?: number;
  emptyRoomGraceMs?: number;
  maxClients?: number;
}

const now = () => new Date().toISOString();

export class Hub {
  private readonly rooms = new Map<string, Room>();
  private readonly clientRooms = new Map<string, string>();
  private readonly historyLimit: number;
  private readonly emptyRoomGraceMs: number;
  private readonly maxClients: number;

  constructor(options: HubOptions = {}) {
    this.historyLimit = options.historyLimit ?? HISTORY_LIMIT;
    this.emptyRoomGraceMs = options.emptyRoomGraceMs ?? 5 * 60_000;
    this.maxClients = options.maxClients ?? 100;
  }

  join(
    peer: HubClient,
    roomKey: string,
    requestedLabel: string | undefined,
    name: string,
  ) {
    if (this.clientRooms.has(peer.id)) {
      throw new HubError(
        'ALREADY_JOINED',
        'This connection already joined a room.',
      );
    }

    const totalClients = [...this.rooms.values()].reduce(
      (sum, room) => sum + room.clients.size,
      0,
    );
    if (totalClients >= this.maxClients) {
      throw new HubError(
        'ROOM_FULL',
        'The server has reached its participant limit.',
      );
    }

    let room = this.rooms.get(roomKey);
    if (!room) {
      room = {
        key: roomKey,
        label: requestedLabel?.trim() || 'Untitled session',
        clients: new Map(),
        history: [],
        deletionTimer: undefined,
      };
      this.rooms.set(roomKey, room);
    }

    if (room.deletionTimer) {
      clearTimeout(room.deletionTimer);
      room.deletionTimer = undefined;
    }

    const participant = { id: peer.id, name: name.trim() };
    room.clients.set(peer.id, { peer, participant });
    this.clientRooms.set(peer.id, roomKey);

    peer.send({
      type: 'welcome',
      protocol: PROTOCOL_VERSION,
      serverTime: now(),
      self: participant,
      room: { key: room.key, label: room.label },
    });
    peer.send({
      type: 'history',
      protocol: PROTOCOL_VERSION,
      serverTime: now(),
      signals: [...room.history],
    });
    this.broadcastPresence(room);

    return participant;
  }

  publish(peer: HubClient, text: string, clientRequestId: string) {
    const room = this.getJoinedRoom(peer.id);
    const joinedClient = room.clients.get(peer.id);
    if (!joinedClient) {
      throw new HubError('NOT_JOINED', 'Join a room before publishing.');
    }

    const signal: Signal = {
      id: randomUUID(),
      room: room.key,
      kind: 'notice',
      text: text.trim(),
      sender: joinedClient.participant,
      createdAt: now(),
      clientRequestId,
    };

    room.history.push(signal);
    if (room.history.length > this.historyLimit) {
      room.history.splice(0, room.history.length - this.historyLimit);
    }

    this.broadcast(room, {
      type: 'signal',
      protocol: PROTOCOL_VERSION,
      serverTime: now(),
      signal,
    });
    return signal;
  }

  leave(clientId: string) {
    const roomKey = this.clientRooms.get(clientId);
    if (!roomKey) return;

    const room = this.rooms.get(roomKey);
    this.clientRooms.delete(clientId);
    if (!room) return;

    room.clients.delete(clientId);
    if (room.clients.size > 0) {
      this.broadcastPresence(room);
      return;
    }

    room.deletionTimer = setTimeout(() => {
      if (room.clients.size === 0) this.rooms.delete(room.key);
    }, this.emptyRoomGraceMs);
    room.deletionTimer.unref?.();
  }

  hasJoined(clientId: string) {
    return this.clientRooms.has(clientId);
  }

  roomCount() {
    return this.rooms.size;
  }

  close() {
    for (const room of this.rooms.values()) {
      if (room.deletionTimer) clearTimeout(room.deletionTimer);
    }
    this.rooms.clear();
    this.clientRooms.clear();
  }

  private getJoinedRoom(clientId: string) {
    const roomKey = this.clientRooms.get(clientId);
    const room = roomKey ? this.rooms.get(roomKey) : undefined;
    if (!room)
      throw new HubError('NOT_JOINED', 'Join a room before publishing.');
    return room;
  }

  private broadcastPresence(room: Room) {
    const participants = [...room.clients.values()]
      .map(({ participant }) => participant)
      .sort((a, b) => a.name.localeCompare(b.name));
    this.broadcast(room, {
      type: 'presence',
      protocol: PROTOCOL_VERSION,
      serverTime: now(),
      participants,
    });
  }

  private broadcast(room: Room, event: ServerEvent) {
    for (const { peer } of room.clients.values()) peer.send(event);
  }
}

export class HubError extends Error {
  constructor(
    readonly code: 'NOT_JOINED' | 'ALREADY_JOINED' | 'ROOM_FULL',
    message: string,
  ) {
    super(message);
  }
}
