import { useState, type FormEvent } from 'react';
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_ROOM_LABEL_LENGTH,
  ROOM_KEY_PATTERN,
} from '@signalroom/protocol';
import { appPath } from '../base-path.js';

const DISPLAY_NAME_KEY = 'signalroom.displayName';

function createRoomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24)}`;
}

function saveAndOpen(roomKey: string, displayName: string, roomLabel?: string) {
  localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim());
  if (roomLabel)
    sessionStorage.setItem(`signalroom.roomLabel.${roomKey}`, roomLabel.trim());
  window.location.assign(appPath(`r/${encodeURIComponent(roomKey)}`));
}

export function HomePage() {
  const [createName, setCreateName] = useState(
    () => localStorage.getItem(DISPLAY_NAME_KEY) ?? '',
  );
  const [roomLabel, setRoomLabel] = useState('');
  const [joinName, setJoinName] = useState(
    () => localStorage.getItem(DISPLAY_NAME_KEY) ?? '',
  );
  const [joinKey, setJoinKey] = useState('');
  const [joinError, setJoinError] = useState('');

  function createRoom(event: FormEvent) {
    event.preventDefault();
    if (!createName.trim()) return;
    saveAndOpen(createRoomKey(), createName, roomLabel || 'Untitled session');
  }

  function joinRoom(event: FormEvent) {
    event.preventDefault();
    const normalizedKey = joinKey.trim().toLowerCase();
    if (!ROOM_KEY_PATTERN.test(normalizedKey)) {
      setJoinError(
        'Enter the room key exactly as it appears in the invitation.',
      );
      return;
    }
    setJoinError('');
    if (joinName.trim()) saveAndOpen(normalizedKey, joinName);
  }

  return (
    <div className="home-shell">
      <header className="site-header">
        <a className="wordmark" href={appPath()} aria-label="SignalRoom home">
          <span className="wordmark-mark" aria-hidden="true" />
          SignalRoom
        </a>
        <a className="text-link" href="#how-it-works">
          How it works
        </a>
      </header>

      <main className="home-main">
        <section className="hero-copy" aria-labelledby="hero-title">
          <p className="status-line">
            <span aria-hidden="true" /> Built for temporary groups
          </p>
          <h1 id="hero-title">Make the next instruction visible.</h1>
          <p className="hero-lede">
            Start a temporary room for notices, decisions, and actions people
            can acknowledge.
          </p>

          <div className="home-forms">
            <form onSubmit={createRoom} className="room-form">
              <h2>Create a room</h2>
              <label>
                Room label
                <input
                  value={roomLabel}
                  onChange={(event) => setRoomLabel(event.target.value)}
                  maxLength={MAX_ROOM_LABEL_LENGTH}
                  placeholder="API rehearsal"
                />
              </label>
              <label>
                Your name
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  required
                  placeholder="Lina"
                  autoComplete="name"
                />
              </label>
              <button className="button button-primary" type="submit">
                Create room
              </button>
            </form>

            <form onSubmit={joinRoom} className="room-form room-form-secondary">
              <h2>Join a room</h2>
              <label>
                Room key
                <input
                  value={joinKey}
                  onChange={(event) => setJoinKey(event.target.value)}
                  aria-describedby={joinError ? 'join-error' : undefined}
                  aria-invalid={Boolean(joinError)}
                  placeholder="p7km-4rdq"
                  required
                  className="mono-input"
                />
              </label>
              <label>
                Your name
                <input
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  required
                  placeholder="Sam"
                  autoComplete="name"
                />
              </label>
              {joinError && (
                <p className="field-error" id="join-error">
                  {joinError}
                </p>
              )}
              <button className="button button-secondary" type="submit">
                Join with a key
              </button>
            </form>
          </div>
        </section>

        <section className="specimen" aria-label="Example live room">
          <div className="specimen-header">
            <div>
              <p>API rehearsal</p>
              <span>
                <i /> 9 online
              </span>
            </div>
            <span className="live-label">Live room</span>
          </div>
          <div className="specimen-stream">
            <article className="sample-signal">
              <span className="rail-marker marker-notice" aria-hidden="true" />
              <p className="signal-meta">Notice · Lina · 14:08</p>
              <p>The API is available again.</p>
            </article>
            <article className="sample-signal sample-action">
              <span className="rail-marker marker-action" aria-hidden="true" />
              <p className="signal-meta action-meta">Action · Sam · 14:12</p>
              <p>Restart your test client before 14:20.</p>
              <div className="sample-ack">
                <span>Acknowledged</span>
                <strong>7 of 9</strong>
              </div>
            </article>
          </div>
        </section>

        <section
          className="how-it-works"
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <h2 id="how-title">One live channel. Clear intent.</h2>
          <p>
            Create a temporary room, share its link, and publish the information
            your group needs now. The room history disappears when the server
            stops.
          </p>
        </section>
      </main>

      <footer className="home-footer">
        <span>Temporary by design</span>
        <span>No account required</span>
        <span>No analytics or cookies</span>
      </footer>
    </div>
  );
}
