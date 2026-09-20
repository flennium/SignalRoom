import { useState, type FormEvent } from 'react';
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_ROOM_LABEL_LENGTH,
  ROOM_KEY_PATTERN,
} from '@signalroom/protocol';
import {
  ArrowRight,
  CheckCircle2,
  Radio,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { appPath } from '../base-path.js';
import { BrandMark } from '../components/brand-mark.js';
import { Button } from '../components/ui/button.js';

const DISPLAY_NAME_KEY = 'signalroom.displayName';
const fieldClass =
  'mt-2 h-12 w-full rounded-lg border border-line bg-white px-4 text-[15px] text-ink outline-none transition placeholder:text-muted/65 focus:border-pulse focus:ring-4 focus:ring-pulse/10';

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
  const rememberedName = () => localStorage.getItem(DISPLAY_NAME_KEY) ?? '';
  const [createName, setCreateName] = useState(rememberedName);
  const [roomLabel, setRoomLabel] = useState('');
  const [joinName, setJoinName] = useState(rememberedName);
  const [joinKey, setJoinKey] = useState('');
  const [joinError, setJoinError] = useState('');

  function createRoom(event: FormEvent) {
    event.preventDefault();
    if (createName.trim())
      saveAndOpen(createRoomKey(), createName, roomLabel || 'Untitled session');
  }

  function joinRoom(event: FormEvent) {
    event.preventDefault();
    const normalizedKey = joinKey.trim().toLowerCase();
    if (!ROOM_KEY_PATTERN.test(normalizedKey)) {
      setJoinError(
        'That room key does not look right. Paste the full key from the invite.',
      );
      return;
    }
    setJoinError('');
    if (joinName.trim()) saveAndOpen(normalizedKey, joinName);
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <a
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"
          href={appPath()}
          aria-label="SignalRoom home"
        >
          <BrandMark className="size-7" />
          SignalRoom
        </a>
        <a
          className="text-sm font-medium text-muted transition hover:text-ink"
          href="#start"
        >
          Start a room
        </a>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center lg:gap-20 lg:px-12 lg:pb-28 lg:pt-20">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 border-l-2 border-pulse pl-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              <Radio className="size-4 text-pulse" /> Live coordination, without
              the noise
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[5.4rem]">
              Make the next move <span className="text-pulse">unmissable.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted sm:text-xl">
              Open a temporary command room. Share notices, decisions,
              questions, and actions that everyone can see and acknowledge in
              real time.
            </p>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted">
              {['No account', 'One shareable link', 'Temporary by design'].map(
                (item) => (
                  <span className="flex items-center gap-2" key={item}>
                    <CheckCircle2 className="size-4 text-success" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div
            id="start"
            className="border border-line bg-white shadow-[0_24px_70px_-32px_rgba(23,33,43,0.3)]"
          >
            <div className="border-b border-line px-6 py-5 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse">
                Start here
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Create a live room
              </h2>
            </div>
            <form onSubmit={createRoom} className="space-y-5 p-6 sm:p-8">
              <label className="block text-sm font-semibold">
                Room label
                <input
                  className={fieldClass}
                  value={roomLabel}
                  onChange={(event) => setRoomLabel(event.target.value)}
                  maxLength={MAX_ROOM_LABEL_LENGTH}
                  placeholder="Launch coordination"
                />
              </label>
              <label className="block text-sm font-semibold">
                Your name
                <input
                  className={fieldClass}
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  required
                  placeholder="Lina"
                  autoComplete="name"
                />
              </label>
              <Button className="w-full" type="submit">
                Create room <ArrowRight className="size-4" />
              </Button>
            </form>
          </div>
        </section>

        <section className="bg-ink text-white">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-12 lg:py-24">
            <div className="max-w-md">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-pulse">
                A calmer live channel
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.035em]">
                Intent stays visible after the chat scrolls away.
              </h2>
              <p className="mt-5 leading-7 text-white/60">
                Each message declares what it is. Participants know whether to
                read, answer, follow, or act.
              </p>
            </div>
            <div className="border border-white/15 bg-ink-soft">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="font-semibold">API rehearsal</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-white/55">
                    <span className="size-1.5 rounded-full bg-success" />9
                    people online
                  </p>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-pulse">
                  Live room
                </span>
              </div>
              <div className="space-y-px bg-white/10">
                <div className="bg-ink-soft p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky">
                    Notice · Lina · 14:08
                  </p>
                  <p className="mt-2 text-lg">The API is available again.</p>
                </div>
                <div className="bg-ink-soft p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber">
                    Action · Sam · 14:12
                  </p>
                  <p className="mt-2 text-lg">
                    Restart your test client before 14:20.
                  </p>
                  <div className="mt-4 h-1.5 overflow-hidden bg-white/10">
                    <div className="h-full w-3/4 bg-pulse" />
                  </div>
                  <p className="mt-2 text-xs text-white/50">
                    7 of 9 acknowledged
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 sm:px-8 md:grid-cols-3 lg:px-12 lg:py-20">
          {(
            [
              [
                Users,
                'Open the room',
                'Name the moment and share one link. No signup or onboarding flow.',
              ],
              [
                Radio,
                'Publish with intent',
                'Mark each signal as a notice, question, decision, or action.',
              ],
              [
                ShieldCheck,
                'Close the loop',
                'See who is present and who has acknowledged the instruction.',
              ],
            ] as const
          ).map(([Icon, title, copy], index) => (
            <article className="border-t border-line pt-6" key={title}>
              <span className="font-mono text-xs text-pulse">0{index + 1}</span>
              <Icon className="mt-5 size-6" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 leading-6 text-muted">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12">
          <form
            onSubmit={joinRoom}
            className="grid gap-5 border border-line bg-white p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-8"
          >
            <div className="sm:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Have an invitation?
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                Join an existing room
              </h2>
            </div>
            <label className="block text-sm font-semibold">
              Room key
              <input
                className={`${fieldClass} font-mono`}
                value={joinKey}
                onChange={(event) => setJoinKey(event.target.value)}
                aria-describedby={joinError ? 'join-error' : undefined}
                aria-invalid={Boolean(joinError)}
                placeholder="abcd1234-…"
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Your name
              <input
                className={fieldClass}
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                required
                placeholder="Sam"
                autoComplete="name"
              />
            </label>
            <Button variant="secondary" type="submit">
              Join with a key <ArrowRight className="size-4" />
            </Button>
            {joinError && (
              <p className="text-sm text-danger sm:col-span-3" id="join-error">
                {joinError}
              </p>
            )}
          </form>
        </section>
      </main>
      <footer className="border-t border-line px-5 py-7 text-sm text-muted sm:px-8">
        <div className="mx-auto flex max-w-[1344px] flex-wrap justify-between gap-3">
          <span>SignalRoom</span>
          <span>No analytics · No cookies · In-memory history</span>
        </div>
      </footer>
    </div>
  );
}
