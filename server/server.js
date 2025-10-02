import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const HOST_SECRET = process.env.SERVER_SECRET ?? "";
const sessions = new Map();

function pruneSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(id);
    }
  }
}
setInterval(pruneSessions, 30_000);

app.get("/sessions", (_req, res) => {
  pruneSessions();
  res.json(Array.from(sessions.values()).map((session) => ({
    id: session.id,
    name: session.name,
    region: session.region,
    map: session.map,
    playerCount: session.playerCount,
    maxPlayers: session.maxPlayers,
    hostHint: session.hostHint
  })));
});

app.post("/sessions", (req, res) => {
  if (!HOST_SECRET || req.get("x-session-secret") !== HOST_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const { id, name, region, map, playerCount, maxPlayers, hostHint, ttlSeconds } = req.body ?? {};
  if (!id || !name) {
    return res.status(400).json({ error: "invalid payload" });
  }
  const expiresAt = Date.now() + Math.max(30, ttlSeconds ?? 120) * 1000;
  sessions.set(id, {
    id,
    name,
    region,
    map,
    playerCount: playerCount ?? 1,
    maxPlayers: maxPlayers ?? 4,
    hostHint: hostHint ?? "",
    expiresAt
  });
  res.json({ ok: true });
});

app.post("/sessions/:id/heartbeat", (req, res) => {
  if (!HOST_SECRET || req.get("x-session-secret") !== HOST_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: "not found" });
  }
  session.playerCount = req.body?.playerCount ?? session.playerCount;
  session.expiresAt = Date.now() + Math.max(30, req.body?.ttlSeconds ?? 120) * 1000;
  res.json({ ok: true });
});

app.delete("/sessions/:id", (req, res) => {
  if (!HOST_SECRET || req.get("x-session-secret") !== HOST_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  sessions.delete(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Session service running on port ${PORT}`);
});
