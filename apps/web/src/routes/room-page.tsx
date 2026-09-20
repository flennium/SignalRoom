import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_MESSAGE_LENGTH,
  ROOM_KEY_PATTERN,
  type SignalKind,
} from '@signalroom/protocol';
import { RoomClient } from '../room/room-client.js';
import { initialRoomState, roomReducer } from '../room/room-state.js';
import { appPath } from '../base-path.js';
import { BrandMark } from '../components/brand-mark.js';

const DISPLAY_NAME_KEY = 'signalroom.displayName';

export function RoomPage({ roomKey }: { roomKey: string }) {
  const validRoomKey = ROOM_KEY_PATTERN.test(roomKey);
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(DISPLAY_NAME_KEY) ?? '',
  );
  const [draftName, setDraftName] = useState(displayName);
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<SignalKind>(
    () =>
      (localStorage.getItem('signalroom.lastKind') as SignalKind | null) ??
      'notice',
  );
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const client = useMemo(() => new RoomClient(), []);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const roomLabel =
    sessionStorage.getItem(`signalroom.roomLabel.${roomKey}`) ?? undefined;

  useEffect(() => {
    if (!validRoomKey || !displayName) return;
    dispatch({ type: 'connecting' });
    client.connect({
      room: roomKey,
      ...(roomLabel ? { roomLabel } : {}),
      name: displayName,
      onEvent: (event) => dispatch({ type: 'server', event }),
      onOffline: (message) =>
        dispatch({ type: 'offline', ...(message ? { message } : {}) }),
      onReconnecting: (attempt) => dispatch({ type: 'reconnecting', attempt }),
    });
    return () => client.disconnect();
  }, [client, displayName, roomKey, roomLabel, validRoomKey]);

  useEffect(() => {
    if (state.connection === 'connected') headingRef.current?.focus();
  }, [state.connection]);

  useEffect(() => {
    if (state.publishedRequestId) setDraft('');
  }, [state.publishedRequestId]);

  if (!validRoomKey) {
    return (
      <main className="centered-page">
        <section className="join-panel">
          <a className="wordmark" href={appPath()}>
            <BrandMark />
            SignalRoom
          </a>
          <h1>This room link is not valid.</h1>
          <p>Check the invitation or create a new room.</p>
          <a className="button button-primary" href={appPath()}>
            Create a room
          </a>
        </section>
      </main>
    );
  }

  if (!displayName) {
    return (
      <main className="centered-page">
        <form
          className="join-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const name = draftName.trim();
            if (!name) return;
            localStorage.setItem(DISPLAY_NAME_KEY, name);
            setDisplayName(name);
          }}
        >
          <a className="wordmark" href={appPath()}>
            <BrandMark />
            SignalRoom
          </a>
          <h1>Join this room</h1>
          <p>
            This room is temporary. Its recent history clears when the server
            stops.
          </p>
          <label>
            Your name
            <input
              autoFocus
              autoComplete="name"
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Lina"
              required
            />
          </label>
          <button className="button button-primary" type="submit">
            Join room
          </button>
          <p className="room-key-line">
            Room key <code>{roomKey}</code>
          </p>
        </form>
      </main>
    );
  }

  function publish(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || state.connection !== 'connected' || state.publishingRequestId)
      return;
    const requestId = crypto.randomUUID();
    if (client.publish(kind, text, requestId)) {
      localStorage.setItem('signalroom.lastKind', kind);
      dispatch({ type: 'publishing', requestId });
    }
  }

  const canPublish =
    Boolean(draft.trim()) &&
    draft.length <= MAX_MESSAGE_LENGTH &&
    state.connection === 'connected' &&
    !state.publishingRequestId;

  return (
    <div className="room-shell">
      <a className="skip-link" href="#signal-stream">
        Skip to signal stream
      </a>
      <header className="room-header">
        <a className="wordmark" href={appPath()}>
          <BrandMark />
          SignalRoom
        </a>
        <div className="room-title-block">
          <h1 ref={headingRef} tabIndex={-1}>
            {state.room?.label ?? roomLabel ?? 'SignalRoom'}
          </h1>
          <ConnectionStatus status={state.connection} />
        </div>
        <div className="room-actions">
          <button
            className="button button-quiet copy-button"
            onClick={async (event) => {
              await navigator.clipboard.writeText(window.location.href);
              const button = event.currentTarget;
              button.textContent = 'Link copied';
              window.setTimeout(
                () => (button.textContent = 'Copy link'),
                2_000,
              );
            }}
          >
            Copy link
          </button>
          <button
            className="button button-quiet participant-toggle"
            aria-expanded={participantsOpen}
            onClick={() => setParticipantsOpen((open) => !open)}
          >
            {state.participants.length} online
          </button>
        </div>
      </header>

      <div className="room-layout">
        <main className="stream-column" id="signal-stream">
          {state.error && (
            <div className="connection-alert" role="alert">
              {state.error}
            </div>
          )}
          <div className="stream-heading">
            <span>Today</span>
          </div>
          <section className="signal-stream" aria-label="Room signals">
            {state.signals.length === 0 ? (
              <div className="empty-stream">
                <span className="empty-marker" aria-hidden="true" />
                <h2>No signals yet</h2>
                <p>Publish a notice to begin this room.</p>
              </div>
            ) : (
              state.signals.map((signal) => {
                const acknowledged = signal.acknowledgedBy.some(
                  (participant) => participant.id === state.self?.id,
                );
                const onlineAcknowledgements = signal.acknowledgedBy.filter(
                  (acknowledger) =>
                    state.participants.some(
                      (participant) => participant.id === acknowledger.id,
                    ),
                ).length;
                return (
                  <article
                    className={`signal-item signal-${signal.kind}`}
                    key={signal.id}
                  >
                    <span
                      className={`rail-marker marker-${signal.kind}`}
                      aria-hidden="true"
                    />
                    <p className="signal-meta">
                      {kindLabel(signal.kind)} ·{' '}
                      {signal.sender.id === state.self?.id
                        ? 'You'
                        : signal.sender.name}{' '}
                      ·{' '}
                      <time
                        dateTime={signal.createdAt}
                        title={new Date(signal.createdAt).toLocaleString()}
                      >
                        {new Intl.DateTimeFormat(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(signal.createdAt))}
                      </time>
                    </p>
                    <p className="signal-body">{signal.text}</p>
                    <div className="acknowledgement-row">
                      <button
                        className={`acknowledge-button ${acknowledged ? 'acknowledged' : ''}`}
                        type="button"
                        disabled={
                          state.connection !== 'connected' || acknowledged
                        }
                        onClick={() => client.acknowledge(signal.id)}
                      >
                        {acknowledged
                          ? 'Acknowledged'
                          : signal.kind === 'action'
                            ? 'Acknowledge action'
                            : 'Acknowledge'}
                      </button>
                      <span
                        title={signal.acknowledgedBy
                          .map((participant) => participant.name)
                          .join(', ')}
                      >
                        {signal.kind === 'action'
                          ? `${onlineAcknowledgements} of ${state.participants.length} online acknowledged`
                          : `Acknowledged by ${signal.acknowledgedBy.length}`}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <form className="composer" onSubmit={publish}>
            <label className="composer-kind">
              <span
                className={`kind-dot kind-dot-${kind}`}
                aria-hidden="true"
              />
              <span className="visually-hidden">Signal kind</span>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as SignalKind)}
              >
                <option value="notice">Notice</option>
                <option value="question">Question</option>
                <option value="decision">Decision</option>
                <option value="action">Action</option>
              </select>
            </label>
            <label className="visually-hidden" htmlFor="signal-draft">
              Write a notice
            </label>
            <textarea
              id="signal-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Write a notice…"
              disabled={state.connection !== 'connected'}
            />
            <div className="composer-footer">
              <span>
                {draft.length}/{MAX_MESSAGE_LENGTH}
              </span>
              <button
                className="button button-primary"
                type="submit"
                disabled={!canPublish}
              >
                {state.publishingRequestId ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </form>
        </main>

        <aside
          className={`participant-rail ${participantsOpen ? 'participant-rail-open' : ''}`}
        >
          <div className="participant-heading">
            <h2>Participants</h2>
            <button
              className="drawer-close"
              onClick={() => setParticipantsOpen(false)}
              aria-label="Close participants"
            >
              ×
            </button>
          </div>
          <ul className="participant-list">
            {[...state.participants]
              .sort((a, b) =>
                a.id === state.self?.id
                  ? -1
                  : b.id === state.self?.id
                    ? 1
                    : a.name.localeCompare(b.name),
              )
              .map((participant) => (
                <li key={participant.id}>
                  <span className="presence-dot" aria-hidden="true" />
                  {participant.name}
                  {participant.id === state.self?.id ? ' (you)' : ''}
                </li>
              ))}
          </ul>
          <div className="room-details">
            <h2>Room</h2>
            <p>
              Key <code>{roomKey}</code>
            </p>
            <p>History clears when the server stops.</p>
          </div>
        </aside>
      </div>

      {participantsOpen && (
        <button
          className="drawer-backdrop"
          aria-label="Close participants"
          onClick={() => setParticipantsOpen(false)}
        />
      )}
      <div className="visually-hidden" aria-live="polite">
        {state.connection === 'connected'
          ? 'Connected to room.'
          : (state.error ?? 'Connecting to room.')}
      </div>
    </div>
  );
}

function ConnectionStatus({
  status,
}: {
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline';
}) {
  const label =
    status === 'connected'
      ? 'Connected'
      : status === 'connecting'
        ? 'Connecting'
        : status === 'reconnecting'
          ? 'Reconnecting'
          : 'Offline';
  return (
    <span className={`connection-status connection-${status}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}

function kindLabel(kind: SignalKind) {
  return `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}
