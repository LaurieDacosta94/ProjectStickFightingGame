const SOUND_DEFINITIONS = {
  shot: { generator: createShotBuffer, playbackRate: [0.94, 1.08], gain: 0.9, pan: 0.35 },
  muzzle: { generator: createMuzzleBuffer, playbackRate: [1, 1.12], gain: 0.4, pan: 0.2 },
  reloadStart: { generator: createReloadStartBuffer, playbackRate: [1, 1], gain: 0.45 },
  reloadFinish: { generator: createReloadFinishBuffer, playbackRate: [1, 1], gain: 0.5 },
  recoil: { generator: createRecoilBuffer, playbackRate: [0.92, 1.05], gain: 0.35 },
  grenadeThrow: { generator: createThrowBuffer, playbackRate: [0.95, 1.05], gain: 0.3, pan: 0.25 },
  explosion: { generator: createExplosionBuffer, playbackRate: [0.9, 1.02], gain: 1.1 },
  flash: { generator: createFlashBuffer, playbackRate: [0.98, 1.05], gain: 0.7 },
  smokePulse: { generator: createSmokeBuffer, playbackRate: [0.9, 1.03], gain: 0.45 },
  shieldHit: { generator: createShieldHitBuffer, playbackRate: [0.95, 1.05], gain: 0.8 },
  shieldShatter: { generator: createShieldShatterBuffer, playbackRate: [0.95, 1.02], gain: 1 },
  shieldEnd: { generator: createShieldEndBuffer, playbackRate: [0.9, 1.02], gain: 0.5 },
  debris: { generator: createDebrisBuffer, playbackRate: [0.92, 1.05], gain: 0.6, pan: 0.3 },
  environmentChime: { generator: createChimeBuffer, playbackRate: [0.98, 1.04], gain: 0.4 }
};

const EVENT_SOUND_MAP = {
  "weapon:shot-fired": { sound: "shot", cooldown: 24, intensity: 0.06 },
  "weapon:muzzle-flash": { sound: "muzzle", cooldown: 18, intensity: 0.01 },
  "weapon:reload-start": { sound: "reloadStart", cooldown: 140 },
  "weapon:reload-finish": { sound: "reloadFinish", cooldown: 140, intensity: 0.02 },
  "weapon:recoil-kick": { sound: "recoil", cooldown: 32, intensity: 0.02 },
  "throwable:thrown": { sound: "grenadeThrow", cooldown: 90 },
  "throwable:explosion": { sound: "explosion", cooldown: 120, intensity: 0.09 },
  "throwable:flash-burst": { sound: "flash", cooldown: 140, intensity: 0.08 },
  "throwable:smoke-detonate": { sound: "smokePulse", cooldown: 220, intensity: 0.02 },
  "throwable:smoke-dissipate": { sound: "smokePulse", cooldown: 260 },
  "shield:hit": { sound: "shieldHit", cooldown: 45, intensity: 0.03 },
  "shield:shatter": { sound: "shieldShatter", cooldown: 260, intensity: 0.08 },
  "shield:end": { sound: "shieldEnd", cooldown: 200 },
  "destructible:hit": { sound: "debris", cooldown: 26 },
  "destructible:explosion": { sound: "explosion", cooldown: 160, intensity: 0.08 },
  "environment:changed": { sound: "environmentChime", cooldown: 600, intensity: 0.05 }
};

let audioContext = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let initialized = false;
let soundtrackStarted = false;
let intensityTimer = null;
let targetMusicLevel = 0.28;
let currentMusicLevel = 0;
const soundBuffers = new Map();
const lastEventTimes = new Map();
const soundtrackSources = [];

function initializeAudioSystem() {
  if (initialized || typeof window === "undefined") {
    return;
  }
  initialized = true;
  ensureContext();
  if (!audioContext) {
    return;
  }
  buildGainGraph();
  loadSoundBuffers();
  registerEventListeners();
  scheduleIntensityLoop();
  setupPrimeHandlers();
}

function ensureContext() {
  if (audioContext || typeof window === "undefined") {
    return;
  }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return;
  }
  audioContext = new AudioCtor();
}

function buildGainGraph() {
  if (!audioContext) {
    return;
  }
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.9;
  sfxGain = audioContext.createGain();
  sfxGain.gain.value = 0.95;
  musicGain = audioContext.createGain();
  musicGain.gain.value = 0;
  sfxGain.connect(masterGain);
  musicGain.connect(masterGain);
  masterGain.connect(audioContext.destination);
}

function loadSoundBuffers() {
  if (!audioContext) {
    return;
  }
  soundBuffers.clear();
  for (const [key, definition] of Object.entries(SOUND_DEFINITIONS)) {
    try {
      const buffer = definition.generator(audioContext);
      soundBuffers.set(key, buffer);
    } catch (error) {
      console.warn(`Failed to generate sound buffer for ${key}`, error);
    }
  }
}

function registerEventListeners() {
  if (typeof window === "undefined") {
    return;
  }
  for (const eventName of Object.keys(EVENT_SOUND_MAP)) {
    window.addEventListener(eventName, (event) => {
      handleEventSound(eventName, event?.detail ?? {});
    });
  }
}

function scheduleIntensityLoop() {
  if (typeof window === "undefined") {
    return;
  }
  if (intensityTimer) {
    window.clearInterval(intensityTimer);
  }
  intensityTimer = window.setInterval(() => {
    if (!audioContext || !musicGain) {
      return;
    }
    targetMusicLevel = Math.max(0.18, targetMusicLevel - 0.015);
    currentMusicLevel += (targetMusicLevel - currentMusicLevel) * 0.2;
    const clamped = clampVolume(currentMusicLevel);
    musicGain.gain.cancelScheduledValues(audioContext.currentTime);
    musicGain.gain.linearRampToValueAtTime(clamped, audioContext.currentTime + 0.12);
  }, 220);
}

function setupPrimeHandlers() {
  if (typeof window === "undefined") {
    return;
  }
  const prime = () => {
    resumeContext();
    startSoundtrack();
    window.removeEventListener("pointerdown", prime);
    window.removeEventListener("keydown", prime);
  };
  window.addEventListener("pointerdown", prime);
  window.addEventListener("keydown", prime);
}

function handleEventSound(eventName, detail) {
  const config = EVENT_SOUND_MAP[eventName];
  if (!config || !audioContext) {
    return;
  }
  if (!shouldPlay(eventName, config.cooldown ?? 0)) {
    return;
  }
  resumeContext();
  playSound(config.sound, config);
  if (config.intensity) {
    bumpMusicIntensity(config.intensity);
  }
}

function shouldPlay(key, cooldownMs) {
  if (cooldownMs <= 0) {
    return true;
  }
  const now = performance.now();
  const last = lastEventTimes.get(key) ?? 0;
  if (now - last < cooldownMs) {
    return false;
  }
  lastEventTimes.set(key, now);
  return true;
}

function playSound(soundId, config = {}) {
  if (!audioContext || !sfxGain) {
    return;
  }
  const buffer = soundBuffers.get(soundId);
  if (!buffer) {
    return;
  }
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  const rateRange = config.playbackRate ?? SOUND_DEFINITIONS[soundId]?.playbackRate ?? [1, 1];
  source.playbackRate.value = randomBetween(rateRange[0], rateRange[1]);
  const gainNode = audioContext.createGain();
  const baseGain = config.gain ?? SOUND_DEFINITIONS[soundId]?.gain ?? 1;
  gainNode.gain.value = clampVolume(baseGain);
  let destination = gainNode;
  const panRange = SOUND_DEFINITIONS[soundId]?.pan;
  if (typeof panRange === "number" && audioContext.createStereoPanner) {
    const panner = audioContext.createStereoPanner();
    panner.pan.value = randomBetween(-panRange, panRange);
    gainNode.connect(panner);
    destination = panner;
  }
  destination.connect(sfxGain);
  source.connect(gainNode);
  source.start();
}

function startSoundtrack() {
  if (soundtrackStarted || !audioContext || !musicGain) {
    return;
  }
  soundtrackStarted = true;
  const padSource = createLoopingSource(createPadBuffer(audioContext));
  const pulseSource = createLoopingSource(createPulseBuffer(audioContext));
  const bassSource = createLoopingSource(createBassBuffer(audioContext));
  const activeSources = [padSource, pulseSource, bassSource].filter(Boolean);
  soundtrackSources.push(...activeSources);
  targetMusicLevel = 0.32;
  currentMusicLevel = 0;
}

function createLoopingSource(buffer) {
  if (!buffer || !audioContext || !musicGain) {
    return null;
  }
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = audioContext.createGain();
  if (buffer.duration >= 6) {
    gain.gain.value = 0.55;
  } else if (buffer.duration >= 3) {
    gain.gain.value = 0.4;
  } else {
    gain.gain.value = 0.25;
  }
  source.connect(gain).connect(musicGain);
  const startTime = audioContext.currentTime + 0.05;
  source.start(startTime);
  return source;
}

function bumpMusicIntensity(amount = 0.05) {
  targetMusicLevel = Math.min(0.85, targetMusicLevel + amount);
  startSoundtrack();
}

function resumeContext() {
  if (!audioContext) {
    return;
  }
  if (audioContext.state === "suspended" && typeof audioContext.resume === "function") {
    audioContext.resume().catch(() => {});
  }
}

function setMasterVolume(value) {
  if (masterGain) {
    masterGain.gain.value = clampVolume(value);
  }
}

function setSfxVolume(value) {
  if (sfxGain) {
    sfxGain.gain.value = clampVolume(value);
  }
}

function setMusicVolume(value) {
  targetMusicLevel = clampVolume(value);
  startSoundtrack();
}

function getAudioState() {
  return {
    supported: Boolean(audioContext),
    contextState: audioContext?.state ?? "unavailable",
    soundtrackActive: soundtrackStarted,
    volumes: {
      master: masterGain?.gain?.value ?? 0,
      sfx: sfxGain?.gain?.value ?? 0,
      music: musicGain?.gain?.value ?? 0
    },
    intensity: currentMusicLevel
  };
}

function clampVolume(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function createShotBuffer(ctx) {
  const duration = 0.32;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const envelope = Math.exp(-t * 13.5);
    const body = Math.sin(2 * Math.PI * (680 + 40 * Math.sin(t * 110)) * t) * 0.55;
    const click = Math.sin(2 * Math.PI * 1320 * t) * Math.exp(-t * 25) * 0.2;
    const noise = (Math.random() * 2 - 1) * 0.45;
    data[i] = (body + click + noise) * envelope;
  }
  return buffer;
}

function createMuzzleBuffer(ctx) {
  const duration = 0.12;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const envelope = Math.exp(-t * 32);
    const spark = Math.sin(2 * Math.PI * (1400 + 120 * Math.sin(t * 60)) * t) * 0.5;
    const fizz = (Math.random() * 2 - 1) * 0.25;
    data[i] = (spark + fizz) * envelope;
  }
  return buffer;
}

function createReloadStartBuffer(ctx) {
  const duration = 0.24;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const tone = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 6);
    const partial = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 8) * 0.3;
    data[i] = (tone + partial) * 0.6;
  }
  return buffer;
}

function createReloadFinishBuffer(ctx) {
  const duration = 0.22;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const tone = Math.sin(2 * Math.PI * 360 * t) * Math.exp(-t * 7);
    const overtone = Math.sin(2 * Math.PI * 720 * t) * Math.exp(-t * 9) * 0.4;
    data[i] = (tone + overtone) * 0.6;
  }
  return buffer;
}

function createRecoilBuffer(ctx) {
  const duration = 0.28;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const thump = Math.sin(2 * Math.PI * 110 * t) * Math.exp(-t * 9);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.35;
    data[i] = (thump + noise) * 0.7;
  }
  return buffer;
}

function createThrowBuffer(ctx) {
  const duration = 0.3;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const swish = Math.sin(2 * Math.PI * (180 + 120 * t) * t) * Math.exp(-t * 6);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 10) * 0.25;
    data[i] = (swish + noise) * 0.65;
  }
  return buffer;
}

function createExplosionBuffer(ctx) {
  const duration = 0.9;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const envelope = Math.exp(-t * 4.5);
    const boom = Math.sin(2 * Math.PI * (80 + 20 * Math.sin(t * 6)) * t) * Math.exp(-t * 2.2) * 0.6;
    const roar = (Math.random() * 2 - 1) * Math.exp(-t * 3.5) * 0.5;
    data[i] = (boom + roar) * envelope;
  }
  return buffer;
}

function createFlashBuffer(ctx) {
  const duration = 0.35;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const envelope = Math.exp(-t * 18);
    const tone = Math.sin(2 * Math.PI * (880 + 140 * t) * t) * 0.5;
    const shimmer = Math.sin(2 * Math.PI * 1760 * t) * Math.exp(-t * 20) * 0.3;
    data[i] = (tone + shimmer) * envelope;
  }
  return buffer;
}

function createSmokeBuffer(ctx) {
  const duration = 0.7;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const envelope = Math.exp(-t * 3);
    const noise = (Math.random() * 2 - 1) * 0.25;
    const wave = Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 4) * 0.3;
    data[i] = (noise + wave) * envelope;
  }
  return buffer;
}

function createShieldHitBuffer(ctx) {
  const duration = 0.4;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const shimmer = Math.sin(2 * Math.PI * (520 + 80 * Math.sin(t * 45)) * t) * Math.exp(-t * 8) * 0.6;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 10) * 0.2;
    data[i] = shimmer + noise;
  }
  return buffer;
}

function createShieldShatterBuffer(ctx) {
  const duration = 0.75;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const envelope = Math.exp(-t * 3.5);
    const crystal = Math.sin(2 * Math.PI * (420 + 220 * Math.sin(t * 6)) * t) * 0.6;
    const sparkle = Math.sin(2 * Math.PI * (980 + 260 * Math.sin(t * 12)) * t) * 0.4;
    const shards = (Math.random() * 2 - 1) * 0.3;
    data[i] = (crystal + sparkle + shards) * envelope;
  }
  return buffer;
}

function createShieldEndBuffer(ctx) {
  const duration = 0.5;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const tone = Math.sin(2 * Math.PI * (320 - 90 * t) * t) * Math.exp(-t * 5);
    data[i] = tone * 0.6;
  }
  return buffer;
}

function createDebrisBuffer(ctx) {
  const duration = 0.32;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const fizz = (Math.random() * 2 - 1) * Math.exp(-t * 14) * 0.35;
    const clink = Math.sin(2 * Math.PI * 640 * t) * Math.exp(-t * 18) * 0.2;
    data[i] = fizz + clink;
  }
  return buffer;
}

function createChimeBuffer(ctx) {
  const duration = 0.6;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const base = Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t * 3.6) * 0.5;
    const harmonic = Math.sin(2 * Math.PI * 630 * t) * Math.exp(-t * 4.2) * 0.3;
    const sparkle = Math.sin(2 * Math.PI * 1260 * t) * Math.exp(-t * 8.5) * 0.2;
    data[i] = base + harmonic + sparkle;
  }
  return buffer;
}

function createPadBuffer(ctx) {
  const duration = 8;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    const baseFreq = channel === 0 ? 220 : 330;
    for (let i = 0; i < length; i += 1) {
      const t = i / ctx.sampleRate;
      const envelope = 0.4 + 0.4 * Math.sin(t * Math.PI * 0.25);
      const wobble = Math.sin(2 * Math.PI * (baseFreq + 6 * Math.sin(t * 2)) * t);
      const airy = (Math.random() * 2 - 1) * 0.05;
      data[i] = (wobble * 0.6 + airy) * envelope;
    }
  }
  return buffer;
}

function createPulseBuffer(ctx) {
  const duration = 4;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const phase = t % 0.5;
    const envelope = phase < 0.08 ? Math.exp(-phase * 80) : 0;
    const hit = Math.sin(2 * Math.PI * 180 * phase) * envelope;
    data[i] = hit * 0.8;
  }
  return buffer;
}

function createBassBuffer(ctx) {
  const duration = 6;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / ctx.sampleRate;
    const note = Math.sin(2 * Math.PI * 110 * t) * 0.4;
    const sub = Math.sin(2 * Math.PI * 55 * t) * 0.2;
    data[i] = (note + sub) * (0.5 + 0.5 * Math.sin(t * Math.PI * 0.5));
  }
  return buffer;
}

export { initializeAudioSystem, setMasterVolume, setSfxVolume, setMusicVolume, getAudioState, bumpMusicIntensity };






