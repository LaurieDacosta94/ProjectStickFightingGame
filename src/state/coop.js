const coopState = {
  active: false,
  connected: 0,
  bestConnected: 0,
  maxParticipants: 100,
  packetsPerSecond: 0,
  averageLatency: 0,
  hostId: `coop-host-${Math.random().toString(36).slice(2, 8)}`,
  lastOutcome: "inactive"
};

function activateCoop(maxParticipants = coopState.maxParticipants) {
  coopState.active = true;
  coopState.lastOutcome = "active";
  coopState.maxParticipants = Math.max(1, Math.floor(maxParticipants ?? coopState.maxParticipants));
}

function deactivateCoop(outcome = "inactive") {
  coopState.active = false;
  coopState.connected = 0;
  coopState.packetsPerSecond = 0;
  coopState.averageLatency = 0;
  coopState.lastOutcome = outcome ?? "inactive";
}

function setCoopParticipants(count, maxParticipants = coopState.maxParticipants) {
  const value = Math.max(0, Math.floor(count ?? 0));
  coopState.connected = value;
  coopState.bestConnected = Math.max(coopState.bestConnected, value);
  if (typeof maxParticipants === "number" && Number.isFinite(maxParticipants)) {
    coopState.maxParticipants = Math.max(value, Math.floor(maxParticipants));
  }
}

function setCoopMetrics({ packetsPerSecond, averageLatency } = {}) {
  if (typeof packetsPerSecond === "number" && Number.isFinite(packetsPerSecond)) {
    coopState.packetsPerSecond = Math.max(0, packetsPerSecond);
  }
  if (typeof averageLatency === "number" && Number.isFinite(averageLatency)) {
    coopState.averageLatency = Math.max(0, averageLatency);
  }
}

function setCoopOutcome(outcome) {
  if (typeof outcome === "string" && outcome.trim()) {
    coopState.lastOutcome = outcome.trim();
  }
}

function resetCoopStats() {
  coopState.bestConnected = 0;
  coopState.packetsPerSecond = 0;
  coopState.averageLatency = 0;
}

function getCoopHudStatus() {
  return {
    active: coopState.active,
    participants: coopState.connected,
    maxParticipants: coopState.maxParticipants,
    bestParticipants: coopState.bestConnected,
    packetsPerSecond: coopState.packetsPerSecond,
    averageLatency: coopState.averageLatency,
    hostId: coopState.hostId,
    lastOutcome: coopState.lastOutcome
  };
}

export {
  activateCoop,
  deactivateCoop,
  setCoopParticipants,
  setCoopMetrics,
  setCoopOutcome,
  resetCoopStats,
  getCoopHudStatus
};
