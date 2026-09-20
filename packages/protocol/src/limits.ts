export const PROTOCOL_VERSION = 1 as const;
export const MAX_DISPLAY_NAME_LENGTH = 32;
export const MAX_ROOM_KEY_LENGTH = 64;
export const MAX_ROOM_LABEL_LENGTH = 48;
export const MAX_MESSAGE_LENGTH = 2_000;
export const MAX_FRAME_BYTES = 8 * 1024;
export const HISTORY_LIMIT = 50;

export const ROOM_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
