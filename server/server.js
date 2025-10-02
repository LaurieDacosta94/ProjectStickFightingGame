import express from "express";
import cors from "cors";
import morgan from "morgan";

const HOST_SECRET = process.env.SERVER_SECRET ?? "";
const DEFAULT_TTL_SECONDS = 120;
const MIN_TTL_SECONDS = 30;
const MAX_TTL_SECONDS = 300;

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

const sessions = new Map();

function coerceTtlSeconds(ttlSeconds) {
  const ttl = Number(ttlSeconds);
  if (Number.isFinite(ttl)) {
    return Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, ttl));
  }
  return DEFAULT_TTL_SECONDS;
}

function pruneSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if ((session.expiresAt ?? 0) <= now) {
      sessions.delete(id);
    }
  }
}
setInterval(pruneSessions, 60_000).unref();

function requireSecret(req, res, next) {
  if (!HOST_SECRET) {
    return res.status(500).json({ error: "server misconfigured: SERVER_SECRET not set" });
  }
  if (req.get("x-session-secret") !== HOST_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return next();
}

app.get("/health", (_req, res) => {
  pruneSessions();
  res.json({ ok: true, sessions: sessions.size });
});

app.get("/sessions", (_req, res) => {
  pruneSessions();
  const payload = Array.from(sessions.values()).map((session) => ({
    id: session.id,
    name: session.name,
    region: session.region,
    map: session.map,
    playerCount: session.playerCount,
    maxPlayers: session.maxPlayers,
    hostHint: session.hostHint,
    mode: session.mode,
    updatedAt: session.updatedAt
  }));
  res.json(payload);
});

app.post("/sessions", requireSecret, (req, res) => {
  const { id, name, region, map, playerCount, maxPlayers, hostHint, mode } = req.body ?? {};
  if (typeof id !== "string" || id.trim() === "") {
    return res.status(400).json({ error: "id is required" });
  }
  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "name is required" });
  }
  const ttlSeconds = coerceTtlSeconds(req.body?.ttlSeconds);
  const expiresAt = Date.now() + ttlSeconds * 1000;
  sessions.set(id, {
    id,
    name: name.slice(0, 64),
    region: typeof region === "string" ? region.slice(0, 32) : null,
    map: typeof map === "string" ? map.slice(0, 64) : null,
    mode: typeof mode === "string" ? mode.slice(0, 32) : null,
    playerCount: Number.isFinite(playerCount) ? Math.max(0, Math.round(playerCount)) : 1,
    maxPlayers: Number.isFinite(maxPlayers) ? Math.max(1, Math.round(maxPlayers)) : 4,
    hostHint: typeof hostHint === "string" ? hostHint.slice(0, 64) : null,
    expiresAt,
    updatedAt: new Date().toISOString()
  });
  res.json({ ok: true, ttlSeconds });
});

app.post("/sessions/:id/join", (req, res) => {
  pruneSessions();
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: "not found" });
  }
  res.json({ ok: true, session });
});

app.post("/sessions/:id/heartbeat", requireSecret, (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: "not found" });
  }
  const ttlSeconds = coerceTtlSeconds(req.body?.ttlSeconds);
  session.playerCount = Number.isFinite(req.body?.playerCount) ? Math.max(0, Math.round(req.body.playerCount)) : session.playerCount;
  session.updatedAt = new Date().toISOString();
  session.expiresAt = Date.now() + ttlSeconds * 1000;
  res.json({ ok: true, ttlSeconds });
});

app.delete("/sessions/:id", requireSecret, (req, res) => {
  sessions.delete(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Session service listening on port ${PORT}`);
});

