import express from "express";
import cors from "cors";
import morgan from "morgan";

const HOST_SECRET = process.env.SERVER_SECRET ?? "";
const DEFAULT_TTL_SECONDS = 150;
const MIN_TTL_SECONDS = 30;
const MAX_TTL_SECONDS = 300;
const MAX_SIGNAL_LENGTH = 16000;
const MAX_SIGNAL_CANDIDATES = 32;

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

const sessions = new Map();

function sanitizeSignalText(value) {
  if (typeof value !== "string") {
    value = String(value ?? "");
  }
  return value.slice(0, MAX_SIGNAL_LENGTH);
}

function sanitizeSignalList(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  const result = [];
  const seen = new Set();
  for (const entry of list) {
    const sanitized = sanitizeSignalText(entry);
    if (sanitized && !seen.has(sanitized)) {
      seen.add(sanitized);
      result.push(sanitized);
      if (result.length >= MAX_SIGNAL_CANDIDATES) {
        break;
      }
    }
  }
  return result;
}

function mergeCandidates(existing = [], incoming = []) {
  const seen = new Set(existing);
  const merged = existing.slice();
  for (const candidate of incoming) {
    if (!seen.has(candidate)) {
      seen.add(candidate);
      merged.push(candidate);
      if (merged.length >= MAX_SIGNAL_CANDIDATES) {
        break;
      }
    }
  }
  return merged;
}

function applyHostSignal(session, signal = {}) {
  if (!session.signal) {
    session.signal = {};
  }
  if (typeof signal.hostOffer === "string") {
    session.signal.hostOffer = sanitizeSignalText(signal.hostOffer);
  }
  if (Array.isArray(signal.hostCandidates)) {
    const sanitized = sanitizeSignalList(signal.hostCandidates);
    session.signal.hostCandidates = mergeCandidates(session.signal.hostCandidates ?? [], sanitized);
  }
}

function applyJoinSignal(session, signal = {}) {
  if (!session.signal) {
    session.signal = {};
  }
  if (typeof signal.joinAnswer === "string") {
    session.signal.joinAnswer = sanitizeSignalText(signal.joinAnswer);
  }
  if (Array.isArray(signal.joinCandidates)) {
    const sanitized = sanitizeSignalList(signal.joinCandidates);
    session.signal.joinCandidates = mergeCandidates(session.signal.joinCandidates ?? [], sanitized);
  }
}
function sanitizeMetadata(input) {
  if (!input || typeof input !== "object") {
    return {};
  }
  const result = {};
  if (Number.isFinite(input.playerCount)) {
    result.playerCount = Math.max(0, Math.round(input.playerCount));
  }
  if (Number.isFinite(input.enemyCount)) {
    result.enemyCount = Math.max(0, Math.round(input.enemyCount));
  }
  if (Number.isFinite(input.alliesCount)) {
    result.alliesCount = Math.max(0, Math.round(input.alliesCount));
  }
  if (typeof input.status === "string") {
    result.status = input.status.slice(0, 160);
  }
  if (Array.isArray(input.tags)) {
    result.tags = input.tags.slice(0, 6).map((tag) => String(tag).slice(0, 24));
  }
  return result;
}

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
      console.log(`[sessions] pruned ${id}`);
    }
  }
}
setInterval(pruneSessions, 60_000).unref();

function requireSecret(req, res, next) {
  if (!HOST_SECRET) {
    return res.status(500).json({ error: "SERVER_SECRET not configured" });
  }
  if (req.get("x-session-secret") !== HOST_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return next();
}

function sessionPayload(session) {
  return {
    id: session.id,
    name: session.name,
    region: session.region,
    map: session.map,
    mode: session.mode,
    playerCount: session.playerCount,
    maxPlayers: session.maxPlayers,
    hostHint: session.hostHint,
    updatedAt: session.updatedAt,
    metadata: session.metadata ?? {},
    signal: {
      hostOffer: session.signal?.hostOffer ?? null,
      hostCandidates: session.signal?.hostCandidates ?? [],
      joinAnswer: session.signal?.joinAnswer ?? null,
      joinCandidates: session.signal?.joinCandidates ?? []
    }
  };
}

app.get("/health", (_req, res) => {
  pruneSessions();
  res.json({ ok: true, sessions: sessions.size, hasSecret: Boolean(HOST_SECRET) });
});


app.get("/sessions/:id", (req, res) => {
  pruneSessions();
  const session = sessions.get(req.params.id);
  if (!session) {
    console.log(`[sessions] lookup miss for ${req.params.id}`);
    return res.status(404).json({ error: "not found" });
  }
  console.log(`[sessions] lookup hit for ${req.params.id}`);
  res.json({ ok: true, session: sessionPayload(session) });
});
app.get("/sessions", (_req, res) => {
  pruneSessions();
  res.json(Array.from(sessions.values()).map(sessionPayload));
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
  const metadata = sanitizeMetadata(req.body?.metadata);
  const session = {
    id,
    name: name.slice(0, 64),
    region: typeof region === "string" ? region.slice(0, 32) : null,
    map: typeof map === "string" ? map.slice(0, 64) : null,
    mode: typeof mode === "string" ? mode.slice(0, 32) : null,
    playerCount: Number.isFinite(playerCount) ? Math.max(0, Math.round(playerCount)) : 1,
    maxPlayers: Number.isFinite(maxPlayers) ? Math.max(1, Math.round(maxPlayers)) : 4,
    hostHint: typeof hostHint === "string" ? hostHint.slice(0, 64) : null,
    metadata,
    expiresAt,
    updatedAt: new Date().toISOString(),
    signal: {
      hostOffer: null,
      hostCandidates: [],
      joinAnswer: null,
      joinCandidates: []
    }
  };
  applyHostSignal(session, req.body?.signal);
  sessions.set(id, session);
  res.json({ ok: true, ttlSeconds });
});

app.post("/sessions/:id/join", (req, res) => {
  pruneSessions();
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: "not found" });
  }
  const signalUpdate = {
    ...(req.body?.signal ?? {}),
    joinAnswer: req.body?.signalAnswer ?? (req.body?.signal?.joinAnswer ?? undefined),
    joinCandidates: req.body?.signalCandidates ?? (req.body?.signal?.joinCandidates ?? undefined)
  };
  applyJoinSignal(session, signalUpdate);
  session.updatedAt = new Date().toISOString();
  res.json({ ok: true, session: sessionPayload(session) });
});

app.post("/sessions/:id/heartbeat", requireSecret, (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: "not found" });
  }
  const ttlSeconds = coerceTtlSeconds(req.body?.ttlSeconds);
  session.playerCount = Number.isFinite(req.body?.playerCount) ? Math.max(0, Math.round(req.body.playerCount)) : session.playerCount;
  const metadata = sanitizeMetadata(req.body?.metadata);
  if (Object.keys(metadata).length > 0) {
    session.metadata = { ...session.metadata, ...metadata };
  }
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


