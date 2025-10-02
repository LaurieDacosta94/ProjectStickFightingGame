# Stickman Warfare Session Service Setup

This project ships with a minimal session directory hosted under `server/`.
It exposes REST endpoints so the front-end can list, host, and maintain
multiplayer lobbies without bundling any backend logic into the browser build.

## Local development

1.  Install dependencies

    ```bash
    cd server
    npm install
    ```

2.  Run the service locally

    ```bash
    npm start
    ```

    The service listens on `http://localhost:3000`. Configure the client by
    updating `src/config/network.js` so `serverApiBase` points to the local URL
    and `hostSecret` matches the `SERVER_SECRET` environment variable.

3.  Test the endpoints

    - `GET /sessions` – fetch the current listings.
    - `POST /sessions` – create/refresh a lobby. Requires `x-session-secret`.
    - `POST /sessions/:id/heartbeat` – extend a lobby TTL. Requires secret.
    - `POST /sessions/:id/join` – retrieve a lobby’s metadata.
    - `DELETE /sessions/:id` – remove a lobby. Requires secret.

## Deploying on Render

1.  Push the repository with the `server/` directory to GitHub.
2.  In Render, choose **New Web Service** and connect your repo.
3.  Use the following configuration:

    - **Root Directory**: `server`
    - **Build Command**: `npm install`
    - **Start Command**: `npm start`
    - **Environment Variable**: `SERVER_SECRET=your-long-random-string`

4.  Once deployed, note the public URL (e.g. `https://stickman-session-service.onrender.com`).
5.  Update `src/config/network.js` in the game to set `serverApiBase` to that
    URL and `hostSecret` to the same value as `SERVER_SECRET`.

With those values in place, the in-game server browser will fetch real lobby
listings, create new entries when hosting, and send heartbeats so sessions stay
visible.

### Metadata

The client now reports live player/enemy counts:

- `metadata.playerCount`
- `metadata.enemyCount`
- `metadata.alliesCount`

Heartbeats refresh these values so listings stay accurate in the browser UI.

