# Deploy SignalRoom

SignalRoom needs one continuously running Node.js process with WebSocket support. GitHub Pages hosts the static preview only.

## Container deployment

```console
docker build -t signalroom .
docker run --rm -p 8080:8080 signalroom
```

Open `http://localhost:8080`. The same origin serves the browser UI, `/health`, and `/ws`.

Any container host can run the image if it supports long-lived WebSocket connections. Configure port `8080`, route HTTPS traffic to it, and use `/health` for health checks. TLS must terminate at the host so browsers connect through `wss://`.

## Environment

| Variable                    | Default                    | Purpose                                                                         |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `SIGNALROOM_HOST`           | `127.0.0.1` outside Docker | Bind address. Container sets `0.0.0.0`.                                         |
| `SIGNALROOM_PORT`           | `8080`                     | HTTP and WebSocket port.                                                        |
| `SIGNALROOM_HISTORY`        | `50`                       | Signals retained per room.                                                      |
| `SIGNALROOM_MAX_CLIENTS`    | `100`                      | Server-wide connection limit.                                                   |
| `SIGNALROOM_ALLOWED_ORIGIN` | none                       | Comma-separated extra browser origins. Same-origin clients are always accepted. |

Do not set an additional origin when the server serves its own web interface. Set it only when a separately hosted browser build connects to the server.

## Separate static client

```console
VITE_BASE_PATH=/ VITE_SIGNALROOM_WS_URL=wss://signalroom.example/ws npm run build -w @signalroom/web
```

Add that browser origin to `SIGNALROOM_ALLOWED_ORIGIN` on the server. Never configure `ws://` for a page served over HTTPS.

## Release check

```console
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- --project=chromium
docker build -t signalroom .
```

After deployment, verify `/health`, create one room, join from a second browser, publish every signal kind, acknowledge an action, and restart the service to confirm that temporary data is intentionally cleared.
