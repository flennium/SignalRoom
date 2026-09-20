# Deploy SignalRoom on Render

SignalRoom runs as one Docker web service. The same service hosts the website, `/health`, and the `/ws` WebSocket endpoint.

## Before you deploy

You need:

- the SignalRoom repository on GitHub;
- a Render account connected to GitHub;
- a paid Render web-service instance if the demo must stay awake.

Render's free web services sleep after 15 minutes without HTTP or WebSocket traffic. They are useful for a short test, but the first visitor after sleep can wait about a minute. Choose paid compute for a dependable public demo.

Keep the service at **one instance**. Rooms and recent signals live in that process's memory. Multiple instances would divide connected clients between separate room states.

## Create the service

1. Sign in at [dashboard.render.com](https://dashboard.render.com/).
2. Select **New → Web Service**.
3. Connect `flennium/SignalRoom`.
4. Use these settings:

| Setting        | Value                           |
| -------------- | ------------------------------- |
| Name           | `signalroom-demo`               |
| Branch         | `main`                          |
| Language       | Docker                          |
| Dockerfile     | `./Dockerfile`                  |
| Region         | The region nearest most testers |
| Instance count | `1`                             |
| Health check   | `/health`                       |
| Auto deploy    | On commit                       |

5. Add these environment variables:

| Variable                 | Value     |
| ------------------------ | --------- |
| `SIGNALROOM_HOST`        | `0.0.0.0` |
| `SIGNALROOM_PORT`        | `8080`    |
| `SIGNALROOM_MAX_CLIENTS` | `100`     |
| `SIGNALROOM_HISTORY`     | `50`      |

6. Select paid compute with at least 512 MB RAM if the demo must remain available.
7. Create the web service and wait for the Docker build to finish.

No database, secret, volume, build command, or start-command override is required.

## Verify the deployment

Render assigns a URL such as `https://signalroom-demo.onrender.com`.

Check the health endpoint:

```console
curl https://signalroom-demo.onrender.com/health
```

The response should contain:

```json
{ "status": "ok", "version": "0.1.0" }
```

Then test the real application:

1. Open the Render URL in one browser.
2. Create a room.
3. Open its link in a private window or another browser.
4. Confirm both participants appear.
5. Publish a notice, question, decision, and action.
6. Acknowledge the action from the second browser.
7. Confirm both browsers show the same stream and acknowledgement count.
8. Leave the room connected for at least 35 minutes to exercise the heartbeat.

Render terminates TLS, so browser connections use HTTPS and WSS automatically.

## Connect the GitHub Pages preview

The Render URL already serves the complete application. Connecting GitHub Pages is optional.

The Pages workflow already reads the repository variable `SIGNALROOM_WS_URL`. After Render assigns its hostname, open **GitHub → Settings → Secrets and variables → Actions → Variables** and create:

```text
SIGNALROOM_WS_URL=wss://signalroom-demo.onrender.com/ws
```

Also set this Render environment variable:

```text
SIGNALROOM_ALLOWED_ORIGIN=https://flennium.github.io
```

Redeploy both services, then test room creation from the Pages URL.

## Update or roll back

Pushing to `main` triggers a Render deployment when auto deploy is enabled. Render keeps deployment history in the service dashboard; choose an earlier successful deployment to roll back.

A deploy or restart clears all rooms and recent signals. That is intentional in version 0.1.0.

## Custom domain

Add the domain under **Settings → Custom Domains**, create the DNS record Render shows, and wait for its managed certificate. Test both `/health` and a real WebSocket room after the certificate becomes active.

## Operational checks

- Keep one running instance until SignalRoom gains shared room storage.
- Watch memory, restarts, connection counts, and response latency in Render.
- Keep `/health` enabled.
- Use an unguessable room key and share room links only with intended participants.
- Review Render usage and billing monthly.
- Run the repository CI checks before every release.
