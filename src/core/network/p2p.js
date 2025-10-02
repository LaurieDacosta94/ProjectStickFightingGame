
function getP2P() {
  if (typeof window === "undefined" || !window.P2P) {
    const error = new Error("P2P module not loaded");
    error.code = "P2P_NOT_AVAILABLE";
    throw error;
  }
  return window.P2P;
}
import { GROUND_Y } from "../../environment/canvas.js";
import { stickman, remotePlayers, upsertRemotePlayer, pruneRemotePlayers, getTotalHeight } from "../../state/entities.js";

const peerId = `peer-${Math.random().toString(36).slice(2, 8)}`;
let peerConnection = null;
let outboundChannel = null;
let inboundChannel = null;
let lastSendTime = 0;
let connectionStatus = "disconnected";
let localDescriptionString = null;
const localCandidates = [];

function ensurePeerConnection() {
  if (peerConnection || typeof window === "undefined" || !window.RTCPeerConnection) {
    return peerConnection;
  }
  peerConnection = new RTCPeerConnection({ iceServers: [] });
  connectionStatus = "connecting";

  outboundChannel = peerConnection.createDataChannel("stickman", { ordered: true });
  setupDataChannel(outboundChannel);

  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      localCandidates.push(JSON.stringify(event.candidate));
    }
  });

  peerConnection.addEventListener("connectionstatechange", () => {
    connectionStatus = peerConnection.connectionState ?? "unknown";
  });

  peerConnection.addEventListener("datachannel", (event) => {
    inboundChannel = event.channel;
    setupDataChannel(inboundChannel);
  });

  return peerConnection;
}

function setupDataChannel(channel) {
  if (!channel) {
    return;
  }
  channel.addEventListener("open", () => {
    connectionStatus = "connected";
  });
  channel.addEventListener("close", () => {
    connectionStatus = "disconnected";
  });
  channel.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleIncomingMessage(payload);
    } catch (error) {
      console.warn("Failed to parse P2P payload", error);
    }
  });
}

function handleIncomingMessage(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }
  switch (payload.type) {
    case "playerState":
      upsertRemotePlayer({
        id: payload.id,
        name: payload.name,
        x: payload.x,
        y: payload.y,
        facing: payload.facing,
        commandId: payload.commandId
      });
      break;
    default:
      break;
  }
}

async function createOffer() {
  ensurePeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  localDescriptionString = JSON.stringify(offer);
  return localDescriptionString;
}

async function createAnswer(remoteDescriptionString) {
  ensurePeerConnection();
  const description = JSON.parse(remoteDescriptionString);
  await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  localDescriptionString = JSON.stringify(answer);
  return localDescriptionString;
}

async function acceptRemoteDescription(remoteDescriptionString) {
  ensurePeerConnection();
  const description = JSON.parse(remoteDescriptionString);
  await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
}

async function addRemoteCandidate(candidateString) {
  if (!candidateString) {
    return;
  }
  ensurePeerConnection();
  const candidate = new RTCIceCandidate(JSON.parse(candidateString));
  await peerConnection.addIceCandidate(candidate);
}

function getLocalDescription() {
  return localDescriptionString;
}

function getLocalCandidates() {
  return [...localCandidates];
}

function getConnectionStatus() {
  return connectionStatus;
}

function updateP2P(delta) {
  pruneRemotePlayers();
  ensurePeerConnection();
  if (!outboundChannel || outboundChannel.readyState !== "open") {
    return;
  }
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
  if (now - lastSendTime < 60) {
    return;
  }
  lastSendTime = now;
  const payload = {
    type: "playerState",
    id: peerId,
    name: "Remote",
    x: stickman.x,
    y: stickman.y,
    facing: stickman.facing,
    commandId: stickman.squadCommandId
  };
  try {
    outboundChannel.send(JSON.stringify(payload));
  } catch {
    // ignore send errors
  }
}

function initializeP2PNetworking() {
  ensurePeerConnection();
  if (typeof window !== "undefined") {
    window.P2P = {
      createOffer,
      createAnswer,
      acceptRemoteDescription,
      addRemoteCandidate,
      getLocalDescription,
      getLocalCandidates,
      getStatus: getP2PStatus,
      close: closeConnection
    };
  }
}

function closeConnection() {
  if (outboundChannel) {
    outboundChannel.close();
    outboundChannel = null;
  }
  if (inboundChannel) {
    inboundChannel.close();
    inboundChannel = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  connectionStatus = "disconnected";
}

function getP2PStatus() {
  return {
    id: peerId,
    status: connectionStatus,
    localDescription: localDescriptionString,
    localCandidates: [...localCandidates]
  };
}

function getRemotePlayersList() {
  return Array.from(remotePlayers.values());
}

export { initializeP2PNetworking, updateP2P, getP2PStatus, getRemotePlayersList, getP2P };
