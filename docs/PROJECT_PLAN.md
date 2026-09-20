# SignalRoom project plan

## 1. Product definition

SignalRoom is a temporary command room for a small group. People join from a web browser or terminal, publish structured signals, and acknowledge actions. A room lasts only while its server is running.

The first release should prove one idea: a short-lived group benefits from separating notices, questions, decisions, and actions from ordinary chat.

### Primary audience

- A workshop host coordinating 5–30 participants.
- A developer running a live demo or multiplayer test.
- A small team coordinating a short incident or event.

### Primary job

> Create a room, share one link, send an important signal, and see who acknowledged it.

### Product principles

1. Joining takes less than 20 seconds.
2. The live signal stream is the center of the product.
3. Important state is visible without opening menus.
4. A room feels temporary; the interface does not imply permanent storage.
5. Web users, CLI users, and scripts speak the same protocol.

## 2. MVP boundary

### Included

- Create a temporary room from the web home page.
- Join an existing room from a shareable URL.
- Choose a display name without creating an account.
- Show connected participants and connection state.
- Publish notices, questions, decisions, and actions.
- Acknowledge any signal, with actions receiving the strongest visual treatment.
- Replay the latest 50 room messages to a new participant.
- Reconnect automatically after a short network interruption.
- Start and connect through the CLI.
- Operate the server locally or on a WebSocket-capable host.

### Excluded

- Accounts, passwords, profiles, organizations, and invitations.
- Permanent message storage.
- Direct messages, threads, reactions, attachments, and rich text.
- Editing or deleting messages.
- Public room discovery.
- Push notifications.
- Moderation roles beyond possession of the room key.

These exclusions are product constraints for the first release, not promises about the future.

## 3. Roles

There are only two roles in the MVP.

| Role        | Capabilities                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------- |
| Host        | Creates the room, receives the room link, publishes and acknowledges signals, sees presence. |
| Participant | Joins with the room link, publishes and acknowledges signals, sees presence.                 |

The server does not enforce a privileged host role yet. “Host” describes the person who started the session. This avoids building authentication before the core behavior is validated.

## 4. Core user journeys

### Create a room

1. The host opens `/`.
2. The host enters a room label and display name.
3. The app creates a random room key locally and connects to the server.
4. The host enters `/r/:roomKey`.
5. The room presents a copyable join link.
6. The host publishes the first notice or action.

Success condition: a host can create and share a usable room without reading documentation.

### Join a room

1. A participant opens `/r/:roomKey`.
2. If no local display name exists, a compact join panel asks for one.
3. The app connects and sends the `join` event.
4. Recent context loads before live events are displayed.
5. The participant appears in the presence list.

Success condition: the participant sees the room stream within 20 seconds of opening the link.

### Publish and acknowledge an action

1. A sender chooses `Action` in the composer.
2. The sender writes one concise request and publishes it.
3. The server assigns the message ID and broadcasts the authoritative signal.
4. Participants select `Acknowledge` on the signal.
5. The acknowledgement count and participant names update for everyone.

Success condition: the sender can tell who acknowledged the action without asking in chat.

### Recover from interruption

1. The connection drops.
2. The interface keeps the current room visible and changes the status to `Reconnecting`.
3. Publishing is disabled while disconnected.
4. The client retries with exponential backoff and jitter.
5. After reconnecting, history is reconciled and publishing resumes.

Success condition: a brief interruption does not require a page refresh or duplicate displayed signals.

## 5. Web routes

| Route         | Purpose                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------- |
| `/`           | Explain the tool, create a room, or join with a room key.                                 |
| `/r/:roomKey` | Join gate followed by the live room interface.                                            |
| `/about`      | Short explanation of temporary data and self-hosting. Optional for the first public demo. |

There is no dashboard because there are no accounts or saved rooms.

## 6. Product vocabulary

Use these names consistently in UI, code, and documentation:

- **Room:** one temporary shared session.
- **Signal:** one published item in a room.
- **Kind:** notice, question, decision, or action.
- **Acknowledge:** confirm that a signal was seen.
- **Participant:** a currently connected client with a display name.
- **Room key:** the unguessable value in the join URL.

Avoid `channel`, `message broker`, `consumer`, and `subscriber` in user-facing text.

## 7. Technical choices

| Area               | Choice                                | Reason                                                                    |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------- |
| Language           | TypeScript                            | Shared protocol types across web, server, and CLI.                        |
| Package manager    | npm workspaces                        | Uses the standard Node.js toolchain with explicit workspace dependencies. |
| Web UI             | React + Vite                          | Small client build with a familiar component model.                       |
| Styling            | CSS Modules plus global design tokens | Keeps the visual system explicit and avoids utility-class noise.          |
| Server             | Node.js HTTP server + `ws`            | Keeps WebSocket mechanics visible for learning.                           |
| Validation         | Zod                                   | Runtime validation at every network boundary.                             |
| CLI                | Commander + Node `readline/promises`  | Small dependency surface and straightforward interaction.                 |
| Unit tests         | Vitest                                | Works across all TypeScript packages.                                     |
| Browser tests      | Playwright                            | Verifies multi-client flows in real browser contexts.                     |
| Formatting/linting | Prettier + ESLint                     | One predictable repository style.                                         |

Do not add a database, state-management framework, component library, or HTTP framework until a concrete need appears.

## 8. Development environments

### Local

```text
npm install
npm run dev
```

`npm run dev` runs the web app and server together. The web development server proxies `/ws` to the local WebSocket server so the browser uses one origin during development.

### Production

- The web app builds to static assets.
- The server serves those assets and owns `/ws` from one Node.js process.
- One public origin avoids CORS and mixed-content configuration.
- TLS termination provides `https://` and `wss://` in production.

### GitHub

- GitHub stores the source and project documentation.
- Pull requests run lint, type-check, unit tests, and build.
- Tagged releases publish the CLI package and attach build artifacts.
- GitHub Pages may host documentation, but the WebSocket server runs elsewhere.

## 9. Build phases

### Phase 0: foundation

- Create the workspace, TypeScript configuration, linting, formatting, and CI.
- Define protocol schemas and test valid/invalid examples.
- Add the web, server, and CLI entry points with health checks.

Exit criteria: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass in CI.

### Phase 1: broadcast vertical slice

- Join one default room from two browser tabs.
- Publish plain notices.
- Show connection state and participant presence.
- Implement clean disconnect and server shutdown.

Exit criteria: a Playwright test proves that a notice from one browser appears once in both browsers.

### Phase 2: SignalRoom behavior

- Add room URLs, display names, four signal kinds, and recent history.
- Add acknowledgements and the participant drawer.
- Add the complete room composer and signal cards.

Exit criteria: two browsers join by shared URL, publish an action, and see the same acknowledgement state.

### Phase 3: resilience and CLI

- Add bounded outbound queues, validation limits, and rate limiting.
- Add reconnect and history reconciliation.
- Implement `signalroom start` and `signalroom connect` against the same protocol.

Exit criteria: a browser and CLI client interoperate, and a slow client cannot stall other clients.

### Phase 4: release readiness

- Complete keyboard, screen-reader, mobile, and reduced-motion checks.
- Add production deployment configuration and operating documentation.
- Run three real sessions and collect the product evidence described in the README.

Exit criteria: a new user can deploy the server, create a room, and invite another device using repository instructions alone.

## 10. Definition of done

A feature is done when:

- its user-visible success, empty, loading, disconnected, and error states are defined;
- shared network input is runtime-validated;
- keyboard navigation and narrow-screen behavior work;
- important state transitions have meaningful tests;
- user-facing text uses the product vocabulary;
- documentation changes when the public behavior changes.

## 11. First backlog

1. Scaffold the workspace and CI.
2. Define protocol schemas and fixtures.
3. Implement the server hub with room isolation.
4. Build the browser join flow.
5. Build the live room shell and connection state.
6. Add the composer and signal stream.
7. Add acknowledgement behavior.
8. Add presence and history.
9. Build the CLI on the same protocol package.
10. Add resilience, accessibility, integration tests, and deployment.

Do not start items 7–10 until the basic two-browser broadcast slice works end to end.
