# Public demo hosting plan

## Choice

Run one always-on **Koyeb Eco Micro** instance in Frankfurt, built from this repository's Dockerfile.

This is the best fit for the current demo because it combines a low fixed price with the parts SignalRoom actually needs: long-lived WebSockets, managed HTTPS/WSS, health recovery, Git-based deploys, logs, and a stable public hostname. As of September 2026, Eco Micro provides 0.25 vCPU, 512 MB RAM, and 4 GB ephemeral disk for about $2.68 per month before tax. It is a paid instance, so it does not have the expiry or forced sleep behavior of a free trial.

The server used roughly 76 MB of working memory while idle in a local production build. A 512 MB instance leaves useful headroom for Node.js, active sockets, deployments, and platform overhead.

## Deployment configuration

| Setting      | Value                                      |
| ------------ | ------------------------------------------ |
| Source       | `https://github.com/flennium/SignalRoom`   |
| Builder      | Dockerfile                                 |
| Branch       | `main`                                     |
| Region       | Frankfurt                                  |
| Instance     | Eco Micro                                  |
| Scaling      | Fixed, one instance                        |
| Port         | `8080`, HTTP                               |
| Health check | `/health`                                  |
| Auto deploy  | Enabled after successful changes to `main` |
| Environment  | `SIGNALROOM_HOST=0.0.0.0`                  |
| Client limit | `SIGNALROOM_MAX_CLIENTS=100`               |

Keep exactly one instance. Room membership and the last 50 signals live in that process's memory. Multiple instances would create separate room states unless a shared store and cross-instance broadcast layer are added later.

## Launch checklist

1. Create a Koyeb account and connect the GitHub repository.
2. Deploy the Dockerfile with the configuration above.
3. Verify `https://<assigned-host>/health` returns `status: ok`.
4. Open the assigned host in two independent browser contexts.
5. Create a room, join it, publish every signal kind, and acknowledge an action.
6. Leave both clients connected for at least 35 minutes to cover a heartbeat cycle.
7. Set the repository homepage and README demo link to the assigned host.
8. Keep GitHub Pages as the static design preview or configure it to use the hosted `wss://` endpoint.

## Cost and failure boundary

The estimated compute cost is $2.68 per month plus tax and any unusual outbound traffic. Koyeb can restart an unhealthy instance and provides TLS at its edge. An instance restart clears rooms and signal history; that behavior is intentional for this version and is explained in the interface.

No hosting provider can promise permanent pricing or indefinite operation. Review the invoice and service status monthly. If Koyeb changes the Eco line, the Docker image remains portable to Railway, Render, Fly.io, or any small VPS.

## Next architecture step

If the demo grows beyond one instance, add a short-lived shared store such as Redis for room state and pub/sub before enabling horizontal scaling. Do not add replicas while state remains process-local.
