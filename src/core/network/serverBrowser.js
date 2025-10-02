import { NETWORK_CONFIG } from "../../config/network.js";
import { getP2P } from "./p2p.js";
import {
  getServerBrowserState,
  setVisible,
  toggleVisible,
  setServers,
  setError,
  setStatusMessage,
  setJoinStatus,
  setJoinError,
  setJoinedSessionId,
  selectNext,
  recordFetchTimestamp,
  setFetching,
  setHostingSession,
  updateHostingHeartbeatTimestamp,
  clearHosting,
  clearP2PState,
  setP2POffer,
  setP2PAnswer,
  setP2PLocalCandidates,
  setP2PRemoteCandidates,
  setP2PPending,
  setP2PError
} from "../../state/serverBrowser.js";

function getApiBase() {
  return (NETWORK_CONFIG.serverApiBase ?? "").replace(/\/$/, "");
}

function getHostSecret() {
  return NETWORK_CONFIG.hostSecret ?? "";
}

function getSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeSignal(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

async function copyToClipboard(text) {
  if (!text || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.warn("Clipboard write failed", error);
    return false;
  }
}

function normalizeCandidate(candidate) {
  if (typeof candidate === "string") {
    return sanitizeSignal(candidate);
  }
  if (candidate && typeof candidate === "object") {
    try {
      return sanitizeSignal(JSON.stringify(candidate));
    } catch {
      return "";
    }
  }
  return "";
}

function normalizeCandidateList(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((candidate) => normalizeCandidate(candidate))
    .filter((candidate) => candidate.length > 0);
}

async function fetchSessionDetail(serverId) {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("Server API base not configured");
  }
  console.debug(`[serverBrowser] fetching session detail for ${serverId}`);
  const response = await fetch(`${apiBase}/sessions/${serverId}`);
  if (response.status === 404) {
    console.warn(`[serverBrowser] session ${serverId} no longer exists (404)`);
    return { notFound: true };
  }
  if (!response.ok) {
    console.warn(`[serverBrowser] session detail request failed ${response.status} for ${serverId}`);
    throw new Error(`Session lookup failed (HTTP ${response.status})`);
  }
  const payload = await response.json();
  console.debug(`[serverBrowser] received session detail for ${serverId}`);
  return payload;
}

function syncLocalCandidates() {
  let p2p;
  try {
    p2p = getP2P();
  } catch {
    setP2PLocalCandidates([]);
    return [];
  }
  if (!p2p?.getLocalCandidates) {
    setP2PLocalCandidates([]);
    return [];
  }
  const normalized = normalizeCandidateList(p2p.getLocalCandidates() ?? []);
  setP2PLocalCandidates(normalized);
  return normalized;
}

function parseCandidateInput(rawInput) {
  const sanitized = sanitizeSignal(rawInput);
  if (!sanitized) {
    return [];
  }
  try {
    const parsed = JSON.parse(sanitized);
    if (Array.isArray(parsed)) {
      return normalizeCandidateList(parsed);
    }
    if (parsed && typeof parsed === "object") {
      return normalizeCandidateList([parsed]);
    }
    if (typeof parsed === "string") {
      return normalizeCandidateList([parsed]);
    }
  } catch {
    // fall through to newline parsing
  }
  const segments = sanitized
    .split(/\r?\n+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  return normalizeCandidateList(segments);
}

async function copyLocalCandidates({ silent = false } = {}) {
  try {
    setP2PPending({ candidates: true });
    const candidates = syncLocalCandidates();
    if (candidates.length === 0) {
      if (!silent) {
        setStatusMessage("No ICE candidates yet. Wait a moment after generating offer/answer.");
      }
      return { copied: false, count: 0 };
    }
    const payload = candidates.join("\n");
    const copied = await copyToClipboard(payload);
    if (!silent) {
      if (copied) {
        setStatusMessage(`Copied ${candidates.length} ICE candidate${candidates.length === 1 ? "" : "s"}.`);
      } else {
        setStatusMessage("Candidates ready. Copy manually if clipboard access is blocked.");
      }
    }
    return { copied, count: candidates.length, payload };
  } catch (error) {
    const message = error?.message ?? "Failed to copy ICE candidates";
    setP2PError(message);
    throw error;
  } finally {
    setP2PPending({ candidates: false });
  }
}

function mergeCandidates(existing, incoming) {
  const merged = [...existing, ...incoming];
  const seen = new Set();
  const unique = [];
  for (const candidate of merged) {
    if (!seen.has(candidate)) {
      seen.add(candidate);
      unique.push(candidate);
    }
  }
  return unique;
}

async function promptForRemoteCandidates() {
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    throw new Error("Prompts unavailable in this environment");
  }
  const state = getServerBrowserState();
  const existing = (state.p2p.remoteCandidates ?? []).join("\n");
  const input = window.prompt("Paste remote ICE candidates (JSON array or newline separated)", existing);
  if (input == null) {
    setStatusMessage("Candidate entry cancelled.");
    return null;
  }
  const candidates = parseCandidateInput(input);
  if (candidates.length === 0) {
    setStatusMessage("No valid ICE candidates detected.");
    throw new Error("No ICE candidates provided");
  }
  const p2p = getP2POrThrow();
  setP2PError(null);
  setP2PPending({ candidates: true });
  try {
    for (const candidate of candidates) {
      await p2p.addRemoteCandidate(candidate);
    }
    const merged = mergeCandidates(state.p2p.remoteCandidates ?? [], candidates);
    setP2PRemoteCandidates(merged);
    setStatusMessage(`Applied ${candidates.length} ICE candidate${candidates.length === 1 ? "" : "s"}.`);
    return candidates;
  } catch (error) {
    const message = error?.message ?? "Failed to apply ICE candidates";
    setP2PError(message);
    throw error;
  } finally {
    setP2PPending({ candidates: false });
  }
}function getP2POrThrow() {
  try {
    return getP2P();
  } catch (error) {
    const message = error?.message ?? "P2P subsystem unavailable";
    setP2PError(message);
    throw error;
  }
}

function buildHostingMetadata(metrics, fallbackPlayerCount) {
  const playerCount = metrics?.playerCount ?? fallbackPlayerCount;
  return {
    playerCount,
    enemyCount: metrics?.enemyCount ?? 0,
    alliesCount: metrics?.alliesCount ?? Math.max(0, playerCount - 1)
  };
}

async function fetchServerList() {
  const apiBase = getApiBase();
  if (!apiBase) {
    setError("Server list URL not configured");
    setServers([]);
    return;
  }
  setFetching(true);
  setStatusMessage("Fetching server list...");
  try {
    const response = await fetch(`${apiBase}/sessions`, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const servers = Array.isArray(data) ? data : Array.isArray(data?.servers) ? data.servers : [];
    const mappedServers = servers.map((server) => {
      const metadata = server.metadata ?? {};
      return {
        id: server.id,
        name: server.name ?? server.id,
        map: server.map ?? metadata.map ?? "Unknown",
        players: metadata.playerCount ?? server.playerCount ?? server.players ?? 0,
        maxPlayers: server.maxPlayers ?? metadata.maxPlayers ?? 0,
        region: server.region ?? metadata.region ?? "--",
        mode: server.mode ?? metadata.mode ?? "",
        enemyCount: metadata.enemyCount ?? null,
        alliesCount: metadata.alliesCount ?? null,
        updatedAt: server.updatedAt ?? null,
        signal: {
          hostOffer: server.signal?.hostOffer ?? null,
          hostCandidates: Array.isArray(server.signal?.hostCandidates) ? server.signal.hostCandidates.slice() : [],
          joinAnswer: server.signal?.joinAnswer ?? null,
          joinCandidates: Array.isArray(server.signal?.joinCandidates) ? server.signal.joinCandidates.slice() : []
        }
      };
    });
    const staleThresholdMs = Math.max(30_000, Math.round((NETWORK_CONFIG.hostTtlSeconds ?? 150) * 1000 * 1.1));
    const now = Date.now();
    const filteredServers = mappedServers.filter((server) => {
      if (!server.updatedAt) {
        return true;
      }
      const updatedAtMs = Date.parse(server.updatedAt);
      if (Number.isNaN(updatedAtMs)) {
        return true;
      }
      return now - updatedAtMs <= staleThresholdMs;
    });
    setServers(filteredServers);
    setError(null);
    setStatusMessage(filteredServers.length === 0 ? "No active sessions." : "Fetched session list.");
  } catch (error) {
    setServers([]);
    setError(`Failed to fetch servers: ${error.message}`);
    setStatusMessage("Unable to reach session service.");
  } finally {
    setFetching(false);
  }
}
async function hostSession({
  id = getSessionId(),
  name = NETWORK_CONFIG.hostName ?? "Stickman Lobby",
  region = NETWORK_CONFIG.defaultRegion ?? "na",
  map = "Neo District",
  playerCount = 1,
  maxPlayers = 4,
  mode = "freeplay",
  signal = null
} = {}) {
  const apiBase = getApiBase();
  const secret = getHostSecret();
  if (!apiBase) {
    throw new Error("Server API base not configured");
  }
  if (!secret) {
    throw new Error("Host secret not provided");
  }
  const state = getServerBrowserState();
  const metrics = state.hostingMetrics ?? {};
  const ttlSeconds = NETWORK_CONFIG.hostTtlSeconds ?? 150;
  const computedPlayerCount = metrics.playerCount ?? playerCount;
  const effectiveSignal = signal ?? {
    hostOffer: state.p2p.offer ?? null,
    hostCandidates: state.p2p.localCandidates ?? []
  };
  const response = await fetch(`${apiBase}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-secret": secret
    },
    body: JSON.stringify({
      id,
      name,
      region,
      map,
      mode,
      playerCount: computedPlayerCount,
      maxPlayers,
      ttlSeconds,
      metadata: buildHostingMetadata(metrics, computedPlayerCount),
      signal: {
        hostOffer: effectiveSignal.hostOffer ?? null,
        hostCandidates: Array.isArray(effectiveSignal.hostCandidates) ? effectiveSignal.hostCandidates : []
      }
    })
  });
  if (!response.ok) {
    throw new Error(`Failed to host session (HTTP ${response.status})`);
  }
  const payload = await response.json();
  setP2PLocalCandidates(Array.isArray(effectiveSignal.hostCandidates) ? effectiveSignal.hostCandidates : []);
  setHostingSession({ id, expiresAt: Date.now() + (payload?.ttlSeconds ?? ttlSeconds) * 1000 });
  setStatusMessage(`Hosting ${name}`);
  return { id, ttlSeconds: payload?.ttlSeconds ?? ttlSeconds };
}

async function heartbeatSession() {
  const apiBase = getApiBase();
  const secret = getHostSecret();
  const state = getServerBrowserState();
  if (!state.hosting || !state.hostingSessionId || !apiBase || !secret) {
    return;
  }
  const metrics = state.hostingMetrics ?? {};
  const computedPlayerCount = metrics.playerCount ?? 1;
  try {
    const response = await fetch(`${apiBase}/sessions/${state.hostingSessionId}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-secret": secret
      },
      body: JSON.stringify({
        playerCount: computedPlayerCount,
        ttlSeconds: NETWORK_CONFIG.hostTtlSeconds ?? 150,
        metadata: buildHostingMetadata(metrics, computedPlayerCount),
        signal: {
          hostOffer: state.p2p.offer ?? null,
          hostCandidates: Array.isArray(state.p2p.localCandidates) ? state.p2p.localCandidates : []
        }
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    updateHostingHeartbeatTimestamp(performance.now());
    if (payload?.ttlSeconds) {
      setHostingSession({ id: state.hostingSessionId, expiresAt: Date.now() + payload.ttlSeconds * 1000 });
    }
  } catch (error) {
    console.warn("Heartbeat failed", error);
    setStatusMessage("Heartbeat failed; hosting paused.");
    clearHosting();
  }
}

async function stopHosting() {
  const apiBase = getApiBase();
  const secret = getHostSecret();
  const state = getServerBrowserState();
  if (!state.hosting || !state.hostingSessionId || !apiBase || !secret) {
    clearHosting();
    return;
  }
  try {
    await fetch(`${apiBase}/sessions/${state.hostingSessionId}`, {
      method: "DELETE",
      headers: {
        "x-session-secret": secret
      }
    });
  } catch (error) {
    console.warn("Failed to stop hosting", error);
  } finally {
    clearHosting();
  }
}

async function joinServer(serverId, payload = {}) {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("Server API base not configured");
  }
  setJoinStatus("Contacting host...");
  setJoinError(null);
  const url = `${apiBase}/sessions/${serverId}/join`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = `Join failed (HTTP ${response.status})`;
    setJoinStatus(null);
    setJoinError(message);
    throw new Error(message);
  }
  const result = await response.json();
  const joinedName = result?.session?.name ?? serverId;
  clearP2PState();
  setJoinStatus(`Joined ${joinedName}`);
  setStatusMessage("Joined lobby. Press P to paste the host offer.");
  return result;
}

function showServerBrowser() {
  setVisible(true);
  recordFetchTimestamp(0);
  fetchServerList();
}

function hideServerBrowser() {
  setVisible(false);
}

function updateServerBrowser(delta, timestamp) {
  const state = getServerBrowserState();
  pumpSignalUpdates();
  if (!state.visible) {
    if (state.hosting) {
      const interval = NETWORK_CONFIG.heartbeatIntervalMs ?? 45000;
      if (timestamp - state.hostingLastHeartbeat >= interval) {
        heartbeatSession();
      }
    }
    return;
  }

  syncLocalCandidates();

  if (timestamp - state.lastFetch >= (NETWORK_CONFIG.refreshIntervalMs ?? 10000) && !state.fetching) {
    recordFetchTimestamp(timestamp);
    fetchServerList();
  }

  if (state.hosting) {
    const interval = NETWORK_CONFIG.heartbeatIntervalMs ?? 45000;
    if (timestamp - state.hostingLastHeartbeat >= interval) {
      heartbeatSession();
    }
  }
  pumpSignalUpdates();
}

async function ensureHostOffer({ forceRegenerate = false } = {}) {
  const state = getServerBrowserState();
  const shouldRebuild = forceRegenerate || !state.p2p.offer;
  if (!shouldRebuild) {
    syncLocalCandidates();
    return state.p2p.offer;
  }
  const p2p = getP2POrThrow();
  setP2PError(null);
  setP2PPending({ offer: true });
  try {
    const offer = await p2p.createOffer();
    setP2POffer(offer);
    syncLocalCandidates();
    return offer;
  } catch (error) {
    const message = error?.message ?? "Failed to create offer";
    setP2PError(message);
    throw error;
  } finally {
    setP2PPending({ offer: false });
  }
}

async function copyHostOffer({ forceRegenerate = false, silent = false } = {}) {
  const offer = await ensureHostOffer({ forceRegenerate });
  const copied = await copyToClipboard(offer);
  if (!silent) {
    if (copied) {
      setStatusMessage("Offer copied. Share it with your party.");
    } else {
      setStatusMessage("Offer ready. Copy it manually if clipboard access is blocked.");
    }
  }
  return { offer, copied };
}

async function acceptHostOffer(rawOffer, { autoCopyAnswer = true } = {}) {
  const offerString = sanitizeSignal(rawOffer);
  if (!offerString) {
    throw new Error("Offer empty");
  }
  let normalizedOffer;
  try {
    normalizedOffer = JSON.stringify(JSON.parse(offerString));
  } catch (error) {
    setP2PError("Offer must be valid JSON");
    throw error;
  }
  const p2p = getP2POrThrow();
  setP2PError(null);
  setP2PPending({ answer: true });
  try {
    const answer = await p2p.createAnswer(normalizedOffer);
    setP2PAnswer(answer);
    syncLocalCandidates();
    if (autoCopyAnswer) {
      const copied = await copyToClipboard(answer);
      if (copied) {
        setStatusMessage("Answer copied. Send it back to the host.");
      } else {
        setStatusMessage("Answer ready. Copy it manually for the host.");
      }
    } else {
      setStatusMessage("Answer ready. Share it with the host.");
    }
    return answer;
  } catch (error) {
    const message = error?.message ?? "Failed to build answer";
    setP2PError(message);
    throw error;
  } finally {
    setP2PPending({ answer: false });
  }
}

async function applyJoinerAnswer(rawAnswer) {
  const answerString = sanitizeSignal(rawAnswer);
  if (!answerString) {
    throw new Error("Answer empty");
  }
  let normalizedAnswer;
  try {
    normalizedAnswer = JSON.stringify(JSON.parse(answerString));
  } catch (error) {
    setP2PError("Answer must be valid JSON");
    throw error;
  }
  const p2p = getP2POrThrow();
  setP2PError(null);
  try {
    await p2p.acceptRemoteDescription(normalizedAnswer);
    setP2PAnswer(normalizedAnswer);
    setStatusMessage("Answer applied. Waiting for connection...");
  } catch (error) {
    const message = error?.message ?? "Failed to accept answer";
    setP2PError(message);
    throw error;
  }
}


function applyRemoteCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return;
  }
  const normalized = normalizeCandidateList(candidates);
  if (normalized.length === 0) {
    return;
  }
  let p2p;
  try {
    p2p = getP2POrThrow();
  } catch (error) {
    console.warn("P2P unavailable while applying candidates", error);
    return;
  }
  const state = getServerBrowserState();
  const current = Array.isArray(state.p2p.remoteCandidates) ? state.p2p.remoteCandidates : [];
  const seen = new Set(current);
  const updated = current.slice();
  for (const candidate of normalized) {
    if (seen.has(candidate)) {
      continue;
    }
    try {
      p2p.addRemoteCandidate(candidate);
      updated.push(candidate);
      seen.add(candidate);
    } catch (error) {
      console.warn("Failed to add ICE candidate", error);
    }
  }
  setP2PRemoteCandidates(updated);
}

function pumpSignalUpdates() {
  const state = getServerBrowserState();
  if (state.hosting && state.hostingSessionId) {
    const hostSession = state.servers.find((entry) => entry.id === state.hostingSessionId);
    const signal = hostSession?.signal ?? null;
    if (signal) {
      if (signal.joinAnswer && state.p2p.answer !== signal.joinAnswer) {
        applyJoinerAnswer(signal.joinAnswer).catch((error) => {
          console.warn("Failed to apply joiner answer", error);
        });
      }
      if (Array.isArray(signal.joinCandidates) && signal.joinCandidates.length > 0) {
        applyRemoteCandidates(signal.joinCandidates);
      }
      if (signal.joinAnswer && (state.hostingMetrics?.playerCount ?? 1) < 2) {
        setHostingMetrics({ playerCount: Math.max(2, state.hostingMetrics?.playerCount ?? 1) });
        heartbeatSession().catch((error) => console.warn("Heartbeat update failed", error));
      }
    }
  }
  if (state.joinedSessionId) {
    const joinedSession = state.servers.find((entry) => entry.id === state.joinedSessionId);
    const signal = joinedSession?.signal ?? null;
    if (signal && Array.isArray(signal.hostCandidates) && signal.hostCandidates.length > 0) {
      applyRemoteCandidates(signal.hostCandidates);
    } else if (!joinedSession) {
      setJoinedSessionId(null);
    }
  }
}

async function promptForHostOffer() {
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    throw new Error("Prompts unavailable in this environment");
  }
  const input = window.prompt("Paste the host offer JSON", "");
  if (input == null) {
    setStatusMessage("Offer entry cancelled.");
    return null;
  }
  try {
    return await acceptHostOffer(input, { autoCopyAnswer: true });
  } catch (error) {
    setStatusMessage("Invalid offer. Please try again.");
    throw error;
  }
}

async function promptForJoinerAnswer() {
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    throw new Error("Prompts unavailable in this environment");
  }
  const input = window.prompt("Paste the player's answer JSON", "");
  if (input == null) {
    setStatusMessage("Answer entry cancelled.");
    return null;
  }
  try {
    await applyJoinerAnswer(input);
    return input;
  } catch (error) {
    setStatusMessage("Invalid answer. Ask the player to resend it.");
    throw error;
  }
}

function attemptHostSession() {
  const state = getServerBrowserState();
  if (state.hosting) {
    setStatusMessage("Already hosting.");
    return Promise.resolve({ alreadyHosting: true });
  }
  clearP2PState();
  setJoinedSessionId(null);
  setStatusMessage("Preparing host offer...");
  setError(null);
  return ensureHostOffer({ forceRegenerate: true })
    .then((offer) => {
      const candidates = syncLocalCandidates();
      return hostSession({
        signal: {
          hostOffer: offer,
          hostCandidates: candidates
        }
      }).then((result) => {
        setStatusMessage(`Hosting ${state.hostingSessionId ?? result.id}`);
        return result;
      });
    })
    .catch((error) => {
      const message = typeof error?.message === "string" ? error.message : "Host failed";
      setError(message);
      setStatusMessage(null);
      throw error;
    });
}

function attemptStopHosting() {
  const state = getServerBrowserState();
  if (!state.hosting) {
    setStatusMessage("Not hosting any session.");
    return Promise.resolve({ alreadyStopped: true });
  }
  setStatusMessage("Stopping session...");
  setError(null);
  return stopHosting()
    .then(() => {
      setStatusMessage("Hosting stopped.");
      setJoinedSessionId(null);
    })
    .catch((error) => {
      const message = typeof error?.message === "string" ? error.message : "Stop failed";
      setError(message);
      throw error;
    });
}

function attemptJoinSession(server) {
  if (!server) {
    setJoinError("No server selected.");
    return Promise.reject(new Error("No server selected"));
  }
  const resolveSignal = () => {
    const directSignal = server.signal ?? {};
    if (directSignal.hostOffer) {
      console.debug(`[serverBrowser] using cached signal for ${server.id}`);
      return Promise.resolve({ server, signal: directSignal });
    }
    console.debug(`[serverBrowser] cached signal missing for ${server.id}, fetching detail`);
    setStatusMessage("Syncing host signal...");
    return fetchSessionDetail(server.id).then((result) => {
      if (result?.notFound) {
        console.warn(`[serverBrowser] session ${server.id} vanished before join`);
        const state = getServerBrowserState();
        const index = state.servers.findIndex((entry) => entry.id === server.id);
        if (index >= 0) {
          state.servers.splice(index, 1);
        }
        setJoinedSessionId(null);
        throw new Error("Session no longer available");
      }
      const refreshed = result?.session;
      const refreshedSignal = refreshed?.signal ?? {};
      if (!refreshedSignal.hostOffer) {
        throw new Error("Host offer unavailable. Ask the host to refresh.");
      }
      const state = getServerBrowserState();
      const updatedEntry = {
        ...server,
        signal: {
          hostOffer: refreshedSignal.hostOffer ?? null,
          hostCandidates: Array.isArray(refreshedSignal.hostCandidates) ? refreshedSignal.hostCandidates.slice() : [],
          joinAnswer: refreshedSignal.joinAnswer ?? null,
          joinCandidates: Array.isArray(refreshedSignal.joinCandidates) ? refreshedSignal.joinCandidates.slice() : []
        },
        updatedAt: refreshed?.updatedAt ?? server.updatedAt
      };
      const index = state.servers.findIndex((entry) => entry.id === server.id);
      if (index >= 0) {
        state.servers[index] = updatedEntry;
      }
      console.debug(`[serverBrowser] refreshed signal for ${server.id}`);
      return { server: updatedEntry, signal: updatedEntry.signal };
    });
  };

  return resolveSignal()
    .then(({ server: resolvedServer, signal }) => {
      clearP2PState();
      setJoinedSessionId(null);
      setJoinError(null);
      console.debug(`[serverBrowser] applying host offer for ${resolvedServer.id}`);
      setStatusMessage(`Connecting to ${resolvedServer.name ?? resolvedServer.id}...`);
      setError(null);
      return acceptHostOffer(signal.hostOffer, { autoCopyAnswer: false })
        .then((answer) => {
          const candidates = syncLocalCandidates();
          console.debug(`[serverBrowser] posting join payload for ${resolvedServer.id}`);
          return joinServer(resolvedServer.id, {
            signalAnswer: answer,
            signalCandidates: candidates
          }).then((result) => {
            setJoinedSessionId(resolvedServer.id);
            if (Array.isArray(result?.session?.signal?.hostCandidates)) {
              applyRemoteCandidates(result.session.signal.hostCandidates);
            }
            setStatusMessage(`Joined ${result?.session?.name ?? resolvedServer.name ?? resolvedServer.id}`);
            return result;
          });
        });
    })
    .catch((error) => {
      const message = typeof error?.message === "string" ? error.message : "Join failed";
      console.warn(`[serverBrowser] join failed for ${server.id}: ${message}`);
      setJoinError(message);
      setStatusMessage(null);
      throw error;
    });
}

export {
  getServerBrowserState,
  setVisible,
  toggleVisible,
  showServerBrowser,
  hideServerBrowser,
  fetchServerList,
  hostSession,
  joinServer,
  stopHosting,
  updateServerBrowser,
  selectNext,
  heartbeatSession as hostHeartbeat,
  attemptHostSession,
  attemptStopHosting,
  attemptJoinSession,
  copyHostOffer,
  promptForHostOffer,
  promptForJoinerAnswer,
  ensureHostOffer,
  acceptHostOffer,
  applyJoinerAnswer,
  copyLocalCandidates,
  promptForRemoteCandidates,
  syncLocalCandidates
};

export const hostServer = hostSession;

if (typeof window !== "undefined") {
  window.ServerBrowser = {
    fetch: fetchServerList,
    host: hostSession,
    join: joinServer,
    stop: stopHosting,
    attemptHost: attemptHostSession,
    attemptStop: attemptStopHosting,
    attemptJoin: attemptJoinSession,
    copyOffer: copyHostOffer,
    regenerateOffer: () => copyHostOffer({ forceRegenerate: true, silent: true }),
    promptOffer: promptForHostOffer,
    promptAnswer: promptForJoinerAnswer,
    copyCandidates: copyLocalCandidates,
    promptCandidates: promptForRemoteCandidates,
    syncCandidates: syncLocalCandidates,
    state: getServerBrowserState
  };
}

export { setHostingMetrics } from "../../state/serverBrowser.js";









