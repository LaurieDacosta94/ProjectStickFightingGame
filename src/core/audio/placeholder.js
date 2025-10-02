let audioContext = null;
let initialized = false;
const lastTriggers = new Map();

const EVENT_SOUND_MAP = {
  "weapon:shot-fired": { frequency: () => 880 + Math.random() * 220, duration: 0.08, gain: 0.05, shape: "square", cooldown: 40 },
  "weapon:muzzle-flash": { frequency: () => 760 + Math.random() * 120, duration: 0.06, gain: 0.045, shape: "sawtooth", cooldown: 35 },
  "weapon:reload-start": { frequency: 210, duration: 0.18, gain: 0.08, shape: "triangle", cooldown: 120 },
  "weapon:reload-finish": { frequency: 320, duration: 0.16, gain: 0.09, shape: "triangle", cooldown: 120 },
  "weapon:recoil-kick": { frequency: (detail) => 480 + (detail?.recoil?.horizontal ?? 0) * 60, duration: 0.12, gain: 0.045, shape: "sine", cooldown: 90 },
  "shield:hit": { frequency: 140, duration: 0.22, gain: 0.1, shape: "sine", cooldown: 140 },
  "shield:shatter": { frequency: 90, duration: 0.4, gain: 0.14, shape: "sawtooth", cooldown: 260 },
  "shield:end": { frequency: 260, duration: 0.16, gain: 0.05, shape: "triangle", cooldown: 200 },
  "throwable:explosion": { frequency: 180, duration: 0.35, gain: 0.12, shape: "sawtooth", cooldown: 240 },
  "throwable:flash-burst": { frequency: () => 960 + Math.random() * 180, duration: 0.18, gain: 0.07, shape: "triangle", cooldown: 220 },
  "throwable:smoke-detonate": { frequency: 220, duration: 0.32, gain: 0.055, shape: "sine", cooldown: 260 },
  "throwable:smoke-dissipate": { frequency: 150, duration: 0.36, gain: 0.035, shape: "sine", cooldown: 320 },
};

function ensureAudioContext() {
  if (audioContext || typeof window === "undefined") {
    return audioContext;
  }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }
  audioContext = new AudioCtor();
  return audioContext;
}

function resumeAudio() {
  if (!audioContext) {
    return;
  }
  if (audioContext.state === "suspended" && typeof audioContext.resume === "function") {
    audioContext.resume().catch(() => {
      /* ignore resume issues */
    });
  }
}

function scheduleTone(config, detail) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  resumeAudio();

  const now = performance.now();
  const cooldown = config.cooldown ?? 80;
  const key = config;
  const last = lastTriggers.get(key) ?? 0;
  if (now - last < cooldown) {
    return;
  }
  lastTriggers.set(key, now);

  const osc = ctx.createOscillator();
  osc.type = config.shape ?? "sine";
  const baseFrequency = typeof config.frequency === "function" ? config.frequency(detail) : config.frequency;
  osc.frequency.setValueAtTime(Math.max(40, baseFrequency ?? 440), ctx.currentTime);

  const gainNode = ctx.createGain();
  const baseGain = Math.max(0.001, config.gain ?? 0.05);
  const rampDuration = Math.max(0.05, config.duration ?? 0.12);
  gainNode.gain.setValueAtTime(baseGain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + rampDuration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + rampDuration);
}

function bindAudio(eventName) {
  const config = EVENT_SOUND_MAP[eventName];
  if (!config) {
    return;
  }
  window.addEventListener(eventName, (event) => {
    scheduleTone(config, event?.detail ?? {});
  });
}

function primeAudioContext() {
  resumeAudio();
  window.removeEventListener("pointerdown", primeAudioContext);
  window.removeEventListener("keydown", primeAudioContext);
}

function initializePlaceholderAudio() {
  if (initialized || typeof window === "undefined") {
    return;
  }
  initialized = true;
  ensureAudioContext();
  Object.keys(EVENT_SOUND_MAP).forEach(bindAudio);
  window.addEventListener("pointerdown", primeAudioContext);
  window.addEventListener("keydown", primeAudioContext);
}

export { initializePlaceholderAudio };
