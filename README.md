![SignalRoom](docs/assets/signalroom-lockup.svg)

SignalRoom is a small live room for the moments when a group needs one clear channel and does not need another chat workspace.

Create a room, share the link, and send a notice, question, decision, or action. Everyone in the room sees the same ordered stream. People can acknowledge a signal, so an organizer can tell whether an instruction landed.

Try the interface at [flennium.github.io/SignalRoom](https://flennium.github.io/SignalRoom/). The GitHub Pages build is a visual preview until a public WebSocket server is connected.

## Run it

You need Node.js 24 and npm 11.

```console
npm install
npm run dev
```

Open `http://127.0.0.1:5173` in two tabs. Create a room in one and join it from the other.

For a production-style local run:

```console
npm run build
node apps/cli/dist/index.js start
```

The server, browser app, health check, and WebSocket endpoint are then available on `http://127.0.0.1:8080`.

The terminal client uses the same protocol:

```console
node apps/cli/dist/index.js connect --room lobby --name Lina
```

Type plain text for a notice, or use `/question`, `/decision`, `/action`, `/ack`, `/who`, `/help`, and `/quit`.

## Use the container

Every release publishes a versioned image:

```console
docker run --rm -p 8080:8080 ghcr.io/flennium/signalroom:0.1.0
```

See [the deployment guide](docs/DEPLOYMENT.md) for TLS, environment variables, health checks, and a separately hosted browser build.

## Why it exists

Raw WebSocket demos stop being useful once the lesson is over. Team chat tools solve a much larger problem and bring accounts, workspaces, and permanent history with them. SignalRoom sits between those two: temporary by default, structured enough to use during a workshop, demo, rehearsal, or small incident.

It is deliberately narrow:

- four signal types instead of a general conversation;
- acknowledgement when “did people see this?” matters;
- web and terminal clients on the same protocol;
- no accounts, tracking, database, or third-party browser assets;
- up to 50 recent signals kept in memory and erased when the server restarts.

The room key is the access key. Anyone who has the link can join, so use SignalRoom for trusted temporary groups and share room links carefully.

## Repository map

```text
apps/server       HTTP and WebSocket server
apps/web          React browser client
apps/cli          signalroom start/connect commands
packages/protocol shared Zod schemas and TypeScript types
tests/e2e         real two-browser tests
```

Useful commands:

```console
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

CI runs all of them and builds the Docker image on Node.js 24.

## Privacy and security

The server does not use analytics, cookies, accounts, or durable storage. It shares your display name and signals with people in the same room because that is the product. The browser stores the display name and last selected signal type on that device; it does not store the signal history.

Production deployments should use HTTPS/WSS, unguessable room keys, and an explicit allowed-origin list when the web app and server use different origins. Read [SECURITY.md](SECURITY.md) before exposing a server to the internet and report vulnerabilities privately through GitHub.

## More detail

- [Architecture](docs/ARCHITECTURE.md)
- [Interface specification](docs/UI_SPEC.md)
- [Project plan](docs/PROJECT_PLAN.md)
- [Brand asset brief](docs/BRAND_ASSET_BRIEF.md)
- [Public demo hosting plan](docs/HOSTING_PLAN.md)
- [Deployment](docs/DEPLOYMENT.md)

SignalRoom is early software. If you try it with a real group, open an issue and say what the room was for, what confused people, and whether acknowledgements helped.
