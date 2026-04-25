# Quest postMessage protocol

Canonical types live in [`shared/protocol.ts`](shared/protocol.ts).

| Direction | `source` | `type` | Fields |
|-----------|----------|--------|--------|
| Parent → iframe | `quest-shell` | `hint` | `text`, optional `id` |
| Iframe → parent | `cybercrime-game` | `level_unlock_attempt` | `teamSessionId`, `level`, `password` |
| Iframe → parent | `cybercrime-game` | `progress` | `teamSessionId`, `level`, optional `score` |

The team shell forwards iframe messages to `POST /api/teams/:teamId/events`. Validate `event.origin` in production to match the hosted game origin.
