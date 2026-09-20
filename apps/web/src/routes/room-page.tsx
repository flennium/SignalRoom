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
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  Copy,
  Gavel,
  HelpCircle,
  ListChecks,
  Radio,
  Send,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { RoomClient } from '../room/room-client.js';
import { initialRoomState, roomReducer } from '../room/room-state.js';
import { appPath } from '../base-path.js';
import { BrandMark } from '../components/brand-mark.js';
import { Button } from '../components/ui/button.js';
import { cn } from '../lib/cn.js';

const DISPLAY_NAME_KEY = 'signalroom.displayName';
const SIGNAL_KINDS: SignalKind[] = ['notice', 'question', 'decision', 'action'];
const kindMeta = {
  notice: {
    icon: Bell,
    accent: 'text-sky',
    border: 'border-l-sky',
    bg: 'bg-sky/8',
  },
  question: {
    icon: HelpCircle,
    accent: 'text-violet',
    border: 'border-l-violet',
    bg: 'bg-violet/8',
  },
  decision: {
    icon: Gavel,
    accent: 'text-success',
    border: 'border-l-success',
    bg: 'bg-success/8',
  },
  action: {
    icon: ListChecks,
    accent: 'text-amber',
    border: 'border-l-amber',
    bg: 'bg-amber/8',
  },
} as const;

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
  const [copied, setCopied] = useState(false);
  const client = useMemo(() => new RoomClient(), []);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
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
    if (state.publishedRequestId) {
      setDraft('');
      composerRef.current?.focus();
    }
  }, [state.publishedRequestId]);
  useEffect(() => {
    if (!participantsOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setParticipantsOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [participantsOpen]);

  if (!validRoomKey)
    return (
      <CenteredState
        title="This room link is not valid."
        copy="Check the invitation or create a new room."
        action="Create a room"
      />
    );

  if (!displayName) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas p-5">
        <form
          className="w-full max-w-md border border-line bg-white p-7 shadow-xl shadow-ink/5 sm:p-9"
          onSubmit={(event) => {
            event.preventDefault();
            const name = draftName.trim();
            if (!name) return;
            localStorage.setItem(DISPLAY_NAME_KEY, name);
            setDisplayName(name);
          }}
        >
          <a
            className="flex items-center gap-2 text-lg font-semibold"
            href={appPath()}
          >
            <BrandMark className="size-7" />
            SignalRoom
          </a>
          <p className="mt-10 font-mono text-xs uppercase tracking-[0.18em] text-pulse">
            Room invitation
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Join this room
          </h1>
          <p className="mt-3 leading-6 text-muted">
            Enter the name other participants will see. No account is required.
          </p>
          <label className="mt-7 block text-sm font-semibold">
            Your name
            <input
              className="mt-2 h-12 w-full rounded-lg border border-line px-4 outline-none focus:border-pulse focus:ring-4 focus:ring-pulse/10"
              autoFocus
              autoComplete="name"
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Lina"
              required
            />
          </label>
          <Button className="mt-5 w-full" type="submit">
            Join room <ArrowLeft className="size-4 rotate-180" />
          </Button>
          <p className="mt-7 border-t border-line pt-5 font-mono text-xs text-muted">
            Room · {roomKey}
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
  const title = state.room?.label ?? roomLabel ?? 'SignalRoom';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        className="fixed left-3 top-3 z-50 -translate-y-24 bg-ink px-4 py-2 text-sm text-white focus:translate-y-0"
        href="#signal-stream"
      >
        Skip to signal stream
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-18 max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <a
            className="flex shrink-0 items-center gap-2 font-semibold"
            href={appPath()}
            aria-label="SignalRoom home"
          >
            <BrandMark className="size-7" />
            <span className="hidden sm:inline">SignalRoom</span>
          </a>
          <div className="mx-1 h-7 w-px bg-line sm:mx-3" />
          <div className="min-w-0 flex-1">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="truncate text-base font-semibold outline-none sm:text-lg"
            >
              {title}
            </h1>
            <ConnectionStatus
              status={state.connection}
              attempt={state.reconnectAttempt}
            />
          </div>
          <Button
            variant="quiet"
            size="compact"
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? (
              <Check className="size-4 text-success" />
            ) : (
              <Copy className="size-4" />
            )}
            <span className="hidden sm:inline">
              {copied ? 'Copied' : 'Copy invite'}
            </span>
          </Button>
          <Button
            variant="secondary"
            size="compact"
            className="lg:hidden"
            aria-expanded={participantsOpen}
            onClick={() => setParticipantsOpen(true)}
          >
            <Users className="size-4" />
            {state.participants.length} online
          </Button>
        </div>
      </header>

      {state.error && (
        <div className="border-b border-danger/20 bg-danger/8" role="alert">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 text-sm text-danger sm:px-6 lg:px-8">
            <AlertTriangle className="size-4 shrink-0" />
            {state.error}
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 border-line lg:border-r" id="signal-stream">
          <div className="mx-auto max-w-4xl px-4 py-7 sm:px-7 sm:py-10">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pulse">
                  Live signal board
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  What the room needs now
                </h2>
              </div>
              <span className="shrink-0 text-sm text-muted">
                {state.signals.length}{' '}
                {state.signals.length === 1 ? 'signal' : 'signals'}
              </span>
            </div>

            <section className="space-y-3" aria-label="Room signals">
              {state.signals.length === 0 ? (
                <div className="grid min-h-64 place-items-center border border-dashed border-line bg-white/45 px-6 text-center">
                  <div>
                    <Radio className="mx-auto size-7 text-pulse" />
                    <h3 className="mt-4 text-lg font-semibold">
                      The board is clear
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                      Publish the first signal so everyone in the room knows
                      what needs attention.
                    </p>
                    <button
                      className="mt-5 text-sm font-semibold text-pulse hover:underline"
                      onClick={() => composerRef.current?.focus()}
                    >
                      Write the first signal
                    </button>
                  </div>
                </div>
              ) : (
                state.signals.map((signal) => {
                  const meta = kindMeta[signal.kind];
                  const Icon = meta.icon;
                  const acknowledged = signal.acknowledgedBy.some(
                    (person) => person.id === state.self?.id,
                  );
                  const onlineAcknowledgements = signal.acknowledgedBy.filter(
                    (ack) =>
                      state.participants.some((person) => person.id === ack.id),
                  ).length;
                  return (
                    <article
                      className={cn(
                        'border border-line border-l-4 bg-white p-4 shadow-sm shadow-ink/[0.025] sm:p-5',
                        meta.border,
                      )}
                      key={signal.id}
                    >
                      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em]',
                            meta.accent,
                          )}
                        >
                          <Icon className="size-3.5" />
                          {kindLabel(signal.kind)}
                        </span>
                        <span className="text-sm font-medium">
                          {signal.sender.id === state.self?.id
                            ? 'You'
                            : signal.sender.name}
                        </span>
                        <time
                          className="ml-auto font-mono text-[11px] text-muted"
                          dateTime={signal.createdAt}
                          title={new Date(signal.createdAt).toLocaleString()}
                        >
                          {new Intl.DateTimeFormat(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(signal.createdAt))}
                        </time>
                      </header>
                      <p className="mt-4 whitespace-pre-wrap break-words text-[17px] leading-7">
                        {signal.text}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line-light pt-4">
                        <Button
                          variant="quiet"
                          size="compact"
                          disabled={
                            state.connection !== 'connected' || acknowledged
                          }
                          onClick={() => client.acknowledge(signal.id)}
                        >
                          {acknowledged ? (
                            <CheckCheck className="size-4 text-success" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          {acknowledged
                            ? 'Acknowledged'
                            : signal.kind === 'action'
                              ? 'Acknowledge action'
                              : 'Acknowledge'}
                        </Button>
                        <span
                          className="text-xs text-muted"
                          title={signal.acknowledgedBy
                            .map((person) => person.name)
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

            <form
              className="sticky bottom-3 z-20 mt-7 border border-line bg-white p-3 shadow-[0_18px_55px_-20px_rgba(23,33,43,0.35)] sm:p-4"
              onSubmit={publish}
            >
              <fieldset>
                <legend className="sr-only">Signal type</legend>
                <div className="grid grid-cols-4 gap-1 rounded-lg bg-fog p-1">
                  {SIGNAL_KINDS.map((option) => {
                    const Icon = kindMeta[option].icon;
                    return (
                      <label key={option} className="cursor-pointer">
                        <input
                          className="peer sr-only"
                          type="radio"
                          name="signal-kind"
                          value={option}
                          checked={kind === option}
                          onChange={() => setKind(option)}
                        />
                        <span className="flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold capitalize text-muted transition peer-checked:bg-white peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-pulse">
                          <Icon className="size-3.5" />
                          <span className="hidden min-[470px]:inline">
                            {kindLabel(option)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <label className="sr-only" htmlFor="signal-draft">
                Write a signal
              </label>
              <textarea
                ref={composerRef}
                id="signal-draft"
                className="mt-3 min-h-20 w-full resize-none bg-transparent px-2 py-1 text-[16px] leading-6 outline-none placeholder:text-muted/65 disabled:cursor-not-allowed"
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
                placeholder={`Write a ${kind}…`}
                disabled={state.connection !== 'connected'}
              />
              <div className="mt-2 flex items-center justify-between border-t border-line-light pt-3">
                <span className="font-mono text-[11px] text-muted">
                  <span className="hidden sm:inline">
                    Enter to publish · Shift+Enter for a new line ·{' '}
                  </span>
                  {draft.length}/{MAX_MESSAGE_LENGTH}
                </span>
                <Button type="submit" size="compact" disabled={!canPublish}>
                  {state.publishingRequestId ? 'Publishing…' : 'Publish'}
                  <Send className="size-4" />
                </Button>
              </div>
            </form>
          </div>
        </main>

        <ParticipantPanel
          open={participantsOpen}
          close={() => setParticipantsOpen(false)}
          roomKey={roomKey}
          title={title}
          participants={state.participants}
          {...(state.self?.id ? { selfId: state.self.id } : {})}
        />
      </div>
      {participantsOpen && (
        <button
          className="fixed inset-0 z-30 bg-ink/45 backdrop-blur-[1px] lg:hidden"
          aria-label="Close participants"
          onClick={() => setParticipantsOpen(false)}
        />
      )}
      <div className="sr-only" aria-live="polite">
        {state.connection === 'connected'
          ? 'Connected to room.'
          : (state.error ?? 'Connecting to room.')}
      </div>
    </div>
  );
}

function ParticipantPanel({
  open,
  close,
  roomKey,
  title,
  participants,
  selfId,
}: {
  open: boolean;
  close: () => void;
  roomKey: string;
  title: string;
  participants: { id: string; name: string }[];
  selfId?: string;
}) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 right-0 z-40 w-[min(88vw,340px)] translate-x-full overflow-y-auto bg-ink p-6 text-white shadow-2xl transition-transform lg:sticky lg:top-18 lg:z-0 lg:h-[calc(100vh-4.5rem)] lg:w-auto lg:translate-x-0 lg:shadow-none',
        open && 'translate-x-0',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-pulse">
            Current room
          </p>
          <h2 className="mt-2 text-xl font-semibold">Participants</h2>
        </div>
        <button
          className="grid size-10 place-items-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={close}
          aria-label="Close participants"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="mt-7 border-y border-white/10 py-5">
        <p className="truncate font-semibold">{title}</p>
        <p className="mt-2 break-all font-mono text-[11px] leading-5 text-white/45">
          {roomKey}
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-semibold">In the room</span>
        <span className="flex items-center gap-1.5 text-xs text-white/55">
          <span className="size-1.5 rounded-full bg-success" />
          {participants.length} online
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {[...participants]
          .sort((a, b) =>
            a.id === selfId
              ? -1
              : b.id === selfId
                ? 1
                : a.name.localeCompare(b.name),
          )
          .map((participant) => (
            <li
              className="flex items-center gap-3 border border-white/10 bg-white/[0.035] px-3 py-3 text-sm"
              key={participant.id}
            >
              <span className="grid size-8 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                {participant.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {participant.name}
              </span>
              {participant.id === selfId && (
                <span className="text-[10px] uppercase tracking-wider text-pulse">
                  You
                </span>
              )}
            </li>
          ))}
      </ul>
      <div className="mt-8 border-l-2 border-pulse pl-4 text-xs leading-5 text-white/50">
        <p>
          Room history lives in server memory and clears when the server stops.
        </p>
      </div>
    </aside>
  );
}

function CenteredState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-5">
      <section className="w-full max-w-md border border-line bg-white p-8 text-center">
        <BrandMark className="mx-auto size-10" />
        <h1 className="mt-7 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-muted">{copy}</p>
        <a
          className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-pulse px-5 text-sm font-semibold text-white hover:bg-pulse-dark"
          href={appPath()}
        >
          {action}
        </a>
      </section>
    </main>
  );
}

function ConnectionStatus({
  status,
  attempt,
}: {
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline';
  attempt: number;
}) {
  const connected = status === 'connected';
  const label = connected
    ? 'Live'
    : status === 'connecting'
      ? 'Connecting'
      : status === 'reconnecting'
        ? `Reconnecting${attempt ? ` · attempt ${attempt}` : ''}`
        : 'Offline';
  return (
    <span
      className={cn(
        'mt-0.5 flex items-center gap-1.5 text-[11px] font-medium',
        connected
          ? 'text-success'
          : status === 'offline'
            ? 'text-danger'
            : 'text-amber',
      )}
    >
      {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
      {label}
    </span>
  );
}

function kindLabel(kind: SignalKind) {
  return `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}
