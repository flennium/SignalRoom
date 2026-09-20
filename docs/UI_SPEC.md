# SignalRoom interface specification

## 1. Experience direction

SignalRoom should feel like a live operations surface, not a chat timeline and not an enterprise dashboard. The visual metaphor is a shared signal board: a calm field where a few important transmissions arrive, change state, and receive acknowledgement.

The memorable element is the **signal rail** running through the room stream. Every signal attaches to the same vertical line, while its kind changes the marker shape and color. This communicates one shared live channel without decorating every surface.

Everything else stays quiet: flat fields, minimal shadows, restrained color, and generous spacing around each signal.

## 2. Design tokens

### Color

| Token             | Value     | Use                                                                                         |
| ----------------- | --------- | ------------------------------------------------------------------------------------------- |
| `canvas`          | `#F3F6F8` | Page background, chosen to resemble cool equipment panels rather than warm editorial paper. |
| `surface`         | `#FFFFFF` | Composer, join panel, and active overlays.                                                  |
| `ink`             | `#17212B` | Primary text.                                                                               |
| `muted`           | `#687581` | Secondary text and timestamps.                                                              |
| `line`            | `#CBD5DC` | Structural rules and inactive controls.                                                     |
| `signal-blue`     | `#176B87` | Brand, focus, live status, and notice.                                                      |
| `question-violet` | `#7654A8` | Questions.                                                                                  |
| `decision-indigo` | `#334E8A` | Decisions.                                                                                  |
| `action-amber`    | `#C66A15` | Actions and pending acknowledgement.                                                        |
| `success`         | `#287A58` | Connected and acknowledged states.                                                          |
| `danger`          | `#B4473A` | Connection failure and destructive warnings.                                                |

Color never carries meaning alone. Every kind also has a text label and a distinct rail marker.

### Typography

- **Interface and body:** `IBM Plex Sans`, with system sans-serif fallbacks. It is clear at small sizes and carries a technical character without looking like terminal cosplay.
- **Room key and timestamps:** `IBM Plex Mono`, used only for values that benefit from fixed-width scanning.
- Body text: 16 px / 1.55.
- Signal body: 17 px / 1.55.
- Page title: clamp from 32 px to 48 px, weight 600, compact line-height.
- Labels: sentence case, 13–14 px, weight 600. Avoid tracked uppercase labels.
- Keep prose measures below 72 characters.

### Spacing and shape

- Base spacing unit: 4 px.
- Common gaps: 8, 12, 16, 24, 32, and 48 px.
- Control height: 44 px minimum.
- Corners: 6 px for controls, 10 px for primary panels. Signals use one subtle radius rather than floating cards.
- Shadows appear only on the mobile participant drawer and modal join panel.
- Content width: 1180 px maximum for the room; 1040 px maximum for the home page.

## 3. Home page

The home page should explain the product by showing a small, credible live-room specimen beside the create form. Avoid a generic marketing hero followed by feature cards.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ SignalRoom                                              How it works │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Make the next instruction visible.      │  LIVE ROOM SPECIMEN      │
│  Start a temporary room for notices,      │  ○ Notice                │
│  decisions, and actions people can        │  The API is available.   │
│  acknowledge.                             │                          │
│                                           │  ◇ Action                │
│  [ Room label                         ]   │  Restart your client.    │
│  [ Your name                          ]   │  [Acknowledge]  7 of 9   │
│  [ Create room ]   [ Join with a key ]   │                          │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ Temporary by design · No account · Web and terminal clients          │
└──────────────────────────────────────────────────────────────────────┘
```

The specimen may perform one restrained load sequence: the action receives two acknowledgement marks over 800 ms. Disable it when reduced motion is requested. Do not animate the entire page.

### Home content

- Heading: `Make the next instruction visible.`
- Supporting line: `Start a temporary room for notices, decisions, and actions people can acknowledge.`
- Primary action: `Create room`
- Secondary action: `Join with a key`
- Trust line: `Temporary by design. No account required.`

### Validation

- Room label: optional, maximum 48 characters. Default to `Untitled session`.
- Display name: required, 1–32 visible characters.
- Room key join field: required, normalized to lowercase, with an inline error if malformed.

## 4. Join gate

Opening a room URL shows the room label, temporary-data note, and one display-name field. If a valid name exists in local storage, connect immediately and allow it to be changed later in the current browser.

```text
┌─────────────────────────────────────┐
│ Join “API rehearsal”                │
│ This room is temporary.             │
│                                     │
│ Your name                           │
│ [ Lina                           ]  │
│ [ Join room ]                       │
│                                     │
│ Room key  p7km-4rdq                 │
└─────────────────────────────────────┘
```

The button reads `Connecting…` while waiting. An error says what happened and offers `Try again`; it never clears the entered name.

## 5. Live room

Desktop uses three functional regions: compact header, signal stream, and participant rail. The composer stays at the bottom of the stream but does not cover content.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ SignalRoom  API rehearsal   ● Connected    Copy link        9 online    │
├───────────────────────────────────────────────┬──────────────────────────┤
│                                               │ Participants             │
│  Today                                        │ ● Sam (you)              │
│    │                                          │ ● Lina                   │
│    ○  Notice · Lina · 14:08                   │ ● Ilyes                  │
│    │  The API is available again.             │ ○ Noor reconnecting      │
│    │  Acknowledged by 6                       │                          │
│    │                                          │ Room                     │
│    ◆  Decision · Sam · 14:12                  │ Key  p7km-4rdq            │
│    │  We will keep port 8080 for the demo.    │ History clears when the  │
│    │                                          │ server stops.            │
│    ◇  Action · Sam · 14:14                    │                          │
│       Restart the test client before 14:20.   │                          │
│       [ Acknowledge ]  7 of 9                 │                          │
│                                               │                          │
├───────────────────────────────────────────────┴──────────────────────────┤
│ Notice ▾  Write a signal…                         0/2000  [ Publish ]     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Header

- Product wordmark links to `/` after warning that leaving disconnects the room.
- Room label is the main page heading.
- Connection status uses text and an icon: `Connected`, `Reconnecting`, or `Offline`.
- `Copy link` confirms with `Link copied` for two seconds.
- Participant count opens the drawer on narrow screens.

### Signal stream

- Order signals oldest to newest so live arrivals appear near the composer.
- Keep a “New signals” button above the composer when the user has scrolled up; do not force-scroll.
- Group dates with plain language: `Today`, `Yesterday`, or a localized date.
- Each signal shows kind, sender, local time, body, and acknowledgement summary.
- The sender's own signals use `You` in place of the display name.
- Do not show avatars in the MVP; initials add noise and imply persistent identity.

### Kind treatment

| Kind     | Marker                                               | Emphasis                          | Default acknowledgement wording |
| -------- | ---------------------------------------------------- | --------------------------------- | ------------------------------- |
| Notice   | Hollow circle                                        | Blue label                        | `Acknowledge`                   |
| Question | Circle with `?`                                      | Violet label                      | `I’ve seen this`                |
| Decision | Filled diamond                                       | Indigo left rule                  | `Acknowledge`                   |
| Action   | Hollow diamond becoming filled after acknowledgement | Amber tint behind action controls | `Acknowledge action`            |

Opening the acknowledgement summary reveals names in a small anchored panel. The summary uses `7 of 9 online acknowledged` for actions and `Acknowledged by 7` for other kinds.

### Composer

- Kind selector defaults to the last kind used in this browser, initially `Notice`.
- Use an auto-growing plain-text field capped at six lines.
- `Enter` publishes; `Shift+Enter` inserts a line break.
- The visible hint below the field explains this the first time, then remains available through accessible description text.
- Disable publishing when empty, offline, over 2,000 characters, or rate-limited.
- After publishing, preserve the selected kind and clear only the text.
- Server rejection leaves the text intact and explains the correction.

### Participant rail

- Sort the current user first, then connected names alphabetically, then reconnecting participants.
- The rail is informational in the MVP; no profile or moderation menu.
- Show the room key and temporary-history statement below the list.
- At widths below 900 px, move the rail into a right-side drawer.

## 6. Responsive behavior

### 900 px and above

- Two-column room layout: flexible stream plus 260 px participant rail.
- Composer aligns with the stream and remains in document flow.

### 600–899 px

- Single-column stream.
- Participants open in a drawer.
- Header keeps room name, status, and participant count; copy link moves to the room menu.

### Below 600 px

- Header becomes two rows.
- Signal metadata may wrap, but the kind always precedes sender and time.
- Composer uses a stacked layout: kind selector, text field, then publish button.
- All controls remain at least 44 px high.
- Respect safe-area insets around the bottom composer.

## 7. Interface states

| State              | Behavior and copy                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Initial connection | Show the join surface until the server accepts the participant. Button: `Connecting…`.                 |
| Loading history    | Keep the stream skeleton to three quiet text rows; do not fake signal cards.                           |
| Empty room         | `No signals yet. Publish a notice or action to begin.` Focus the composer.                             |
| Reconnecting       | Keep existing content, disable publish, show `Reconnecting… Attempt 2`.                                |
| Offline            | Show a persistent bar: `Connection lost. Check the server address and try again.` Action: `Reconnect`. |
| Rate limited       | Keep draft and show when publishing becomes available: `You can publish again in 3 seconds.`           |
| Invalid room key   | `This room link is not valid. Check the link or create a new room.`                                    |
| Server shutdown    | `This SignalRoom server stopped. Recent room data is no longer available.`                             |
| Room full          | `This room has reached its participant limit.`                                                         |

Use an `aria-live="polite"` region for connection changes and publish confirmations. Do not announce every incoming signal automatically; that would overwhelm screen-reader users. Provide a preference to announce new signals only after real accessibility testing shows it is useful.

## 8. Accessibility requirements

- Meet WCAG 2.2 AA contrast for text, controls, focus, and state indicators.
- Preserve native buttons, inputs, headings, lists, and dialogs.
- Place a skip link before the header: `Skip to signal stream`.
- Keep focus visible with a 2 px `signal-blue` outline and 2 px offset.
- Return focus to the participant-count button when the drawer closes.
- Place focus on the room heading after joining.
- Use a real dialog for the join gate and acknowledgement-name popover only when interaction requires it.
- Test at 200% zoom, keyboard only, reduced motion, and Windows high-contrast mode.
- Use localized `Intl.DateTimeFormat`; full timestamps appear in accessible labels and tooltips.

## 9. Component inventory

Build components only when they represent a stable interface concept:

```text
AppShell
HomePage
CreateRoomForm
JoinRoomForm
RoomPage
RoomHeader
ConnectionStatus
SignalStream
SignalItem
AcknowledgeButton
AcknowledgementSummary
SignalComposer
ParticipantList
ParticipantDrawer
InlineNotice
```

Avoid a generic `Card`, `Stack`, or design-system package in the first pass. Repeated CSS tokens and a few layout utilities are enough until repetition becomes measurable.

## 10. Design review checklist

- Does the room read as a shared signal board within five seconds?
- Is the action and its acknowledgement state the strongest information in the stream?
- Can a user publish without opening a menu?
- Are notice, question, decision, and action distinguishable without color?
- Does the narrow layout retain room context and connection status?
- Does any decoration fail to explain structure or state? Remove it.
- Does the page resemble a generic SaaS dashboard with a collection of cards? Flatten it.
