# termcloud-sample-api

A minimal Node.js service that can be linked to and deployed on a TermCloud
phone agent. It contains a `termcloud.yml` at the branch root, which the control
plane requires when you register the app.

## Endpoints

| Method | Path      | Description                                  |
|--------|-----------|----------------------------------------------|
| GET    | `/`       | Service info + uptime + whether a DB is set  |
| GET    | `/health` | Health probe used by the agent (`healthPath`) |
| GET    | `/guess`  | Returns a deliberately imprecise π value     |

The app listens on `PORT` (injected by the agent from `startPort`) and binds
`HOST` (defaults to `127.0.0.1`).

## Run locally

```bash
PORT=8080 node server.js
curl http://127.0.0.1:8080/health
```

## Deploy via TermCloud

1. Push this directory to a GitHub repo (public).
2. In the Android app: **Services → Link GitHub repo**.
   - Repository URL: `https://github.com/<owner>/<repo>`
   - Branch: `main`
3. The backend fetches `termcloud.yml`, dispatches a DEPLOY job to the phone,
   which clones, runs `npm install`, then `node server.js`.

## Manifest

See [`termcloud.yml`](./termcloud.yml).