import { NETWORK_CONFIG } from "../config/network.js";

const serverBrowserState = {
  servers: [],
  visible: false,
  selectedIndex: 0,
  lastFetch: 0,
  fetching: false,
  error: null,
  statusMessage: null,
  hosting: false,
  hostingSessionId: null,
  hostingLastHeartbeat: 0,
  hostingExpiresAt: 0,
  joinStatus: null,
  joinError: null,
  hostingMetrics: {
    playerCount: 1,
    enemyCount: 0,
    alliesCount: 0
  },
  p2p: {
    offer: null,
    answer: null,
    pendingOffer: false,
    pendingAnswer: false,
    pendingCandidates: false,
    localCandidates: [],
    remoteCandidates: [],
    error: null
  }
};

function getServerBrowserState() {
  return serverBrowserState;
}

function setVisible(visible) {
  serverBrowserState.visible = visible;
  if (!visible) {
    serverBrowserState.statusMessage = null;
    serverBrowserState.error = null;
  }
}

function toggleVisible() {
  setVisible(!serverBrowserState.visible);
}

function setServers(list) {
  const previousSelection = serverBrowserState.servers[serverBrowserState.selectedIndex]?.id;
  serverBrowserState.servers = Array.isArray(list) ? list : [];
  if (previousSelection) {
    const matchedIndex = serverBrowserState.servers.findIndex((server) => server.id === previousSelection);
    if (matchedIndex >= 0) {
      serverBrowserState.selectedIndex = matchedIndex;
    }
  }
  if (serverBrowserState.selectedIndex >= serverBrowserState.servers.length) {
    serverBrowserState.selectedIndex = Math.max(0, serverBrowserState.servers.length - 1);
  }
}

function setError(message) {
  serverBrowserState.error = message;
}

function setStatusMessage(message) {
  serverBrowserState.statusMessage = message;
}

function setJoinStatus(message) {
  serverBrowserState.joinStatus = message;
}

function setJoinError(message) {
  serverBrowserState.joinError = message;
}

function setJoinedSessionId(id) {
  serverBrowserState.joinedSessionId = id ?? null;
}

function selectNext(delta) {
  if (serverBrowserState.servers.length === 0) {
    return;
  }
  serverBrowserState.selectedIndex = (serverBrowserState.selectedIndex + delta + serverBrowserState.servers.length) % serverBrowserState.servers.length;
}

function recordFetchTimestamp(timestamp) {
  serverBrowserState.lastFetch = timestamp;
}

function setFetching(fetching) {
  serverBrowserState.fetching = fetching;
}

function setHostingSession({ id, expiresAt }) {
  serverBrowserState.hosting = Boolean(id);
  serverBrowserState.hostingSessionId = id ?? null;
  serverBrowserState.hostingLastHeartbeat = performance.now();
  serverBrowserState.hostingExpiresAt = expiresAt ?? 0;
}

function updateHostingHeartbeatTimestamp(timestamp) {
  serverBrowserState.hostingLastHeartbeat = timestamp;
}
 
function clearHosting() {
  serverBrowserState.hosting = false;
  serverBrowserState.hostingSessionId = null;
  serverBrowserState.hostingExpiresAt = 0;
  serverBrowserState.hostingLastHeartbeat = 0;
  clearP2PState();
}
function setHostingMetrics(metrics = {}) {
  if (Number.isFinite(metrics.playerCount)) {
    serverBrowserState.hostingMetrics.playerCount = Math.max(1, Math.round(metrics.playerCount));
  }
  if (Number.isFinite(metrics.enemyCount)) {
    serverBrowserState.hostingMetrics.enemyCount = Math.max(0, Math.round(metrics.enemyCount));
  }
  if (Number.isFinite(metrics.alliesCount)) {
    serverBrowserState.hostingMetrics.alliesCount = Math.max(0, Math.round(metrics.alliesCount));
  }
}

function setP2POffer(offer) {
  serverBrowserState.p2p.offer = offer ?? null;
}

function setP2PAnswer(answer) {
  serverBrowserState.p2p.answer = answer ?? null;
}

function setP2PLocalCandidates(candidates) {
  if (!Array.isArray(candidates)) {
    candidates = [];
  }
  const next = candidates.slice();
  const current = serverBrowserState.p2p.localCandidates || [];
  if (current.length === next.length && current.every((value, index) => value === next[index])) {
    return;
  }
  serverBrowserState.p2p.localCandidates = next;
}
 
function setP2PRemoteCandidates(candidates) {
  if (!Array.isArray(candidates)) {
    candidates = [];
  }
  const next = candidates.slice();
  const current = serverBrowserState.p2p.remoteCandidates || [];
  if (current.length === next.length && current.every((value, index) => value === next[index])) {
    return;
  }
  serverBrowserState.p2p.remoteCandidates = next;
}

function setP2PError(message) {
  serverBrowserState.p2p.error = message ?? null;
}
function setP2PPending({ offer, answer, candidates }) {
  if (typeof offer === "boolean") {
    serverBrowserState.p2p.pendingOffer = offer;
  }
  if (typeof answer === "boolean") {
    serverBrowserState.p2p.pendingAnswer = answer;
  }
  if (typeof candidates === "boolean") {
    serverBrowserState.p2p.pendingCandidates = candidates;
  }
}

function clearP2PState() {
  serverBrowserState.p2p.offer = null;
  serverBrowserState.p2p.answer = null;
  serverBrowserState.p2p.pendingOffer = false;
  serverBrowserState.p2p.pendingAnswer = false;
  serverBrowserState.p2p.pendingCandidates = false;
  serverBrowserState.p2p.localCandidates = [];
  serverBrowserState.p2p.remoteCandidates = [];
  serverBrowserState.p2p.error = null;
}

export {
  serverBrowserState,
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
  setHostingMetrics,
  setP2POffer,
  setP2PAnswer,
  setP2PLocalCandidates,
  setP2PRemoteCandidates,
  setP2PPending,
  setP2PError,
  clearP2PState
};












