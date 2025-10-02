import { stickman } from "../../state/entities.js";

const muzzleFlashes = [];
const shieldBursts = [];
const throwableBursts = [];
const notices = [];
const shotIndicators = [];

const filters = {
  weapons: true,
  shield: true,
  throwables: true
};

const FILTER_TOGGLE_MAP = {
  Digit6: "weapons",
  Digit7: "shield",
  Digit8: "throwables"
};

function pushNotice(message, ttl = 1.8) {
  const last = notices[notices.length - 1];
  if (last && last.message === message) {
    last.ttl = ttl;
    last.maxTtl = ttl;
    last.age = 0;
    return;
  }
  notices.push({ message, ttl, maxTtl: ttl, age: 0 });
  while (notices.length > 6) {
    notices.shift();
  }
}

function pushThrowableBurst(type, detail = {}, ttl = 0.4) {
  const burst = {
    type,
    x: detail.x ?? stickman.x,
    y: detail.y ?? stickman.y,
    radius: detail.radius ?? 110,
    ttl,
    maxTtl: ttl
  };
  throwableBursts.push(burst);
  return burst;
}

function shouldCapture(category) {
  return filters[category] !== false;
}

function toggleFilter(category) {
  filters[category] = !filters[category];
  const pretty = category.charAt(0).toUpperCase() + category.slice(1);
  const stateLabel = filters[category] ? "ON" : "OFF";
  pushNotice(`Debug filter ${pretty} ${stateLabel}`, 1.4);
  if (!filters[category]) {
    if (category === "weapons") {
      muzzleFlashes.length = 0;
      shotIndicators.length = 0;
    } else if (category === "shield") {
      shieldBursts.length = 0;
    } else if (category === "throwables") {
      throwableBursts.length = 0;
    }
  }
}

function handleFilterToggle(event) {
  if (!event.altKey || event.repeat) {
    return;
  }
  const category = FILTER_TOGGLE_MAP[event.code];
  if (!category) {
    return;
  }
  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }
  toggleFilter(category);
}

function handleMuzzleFlash(event) {
  if (!shouldCapture("weapons")) {
    return;
  }
  const detail = event?.detail ?? {};
  const ttl = 0.12;
  muzzleFlashes.push({
    weaponId: detail.weaponId ?? "unknown",
    x: detail.x ?? stickman.x,
    y: detail.y ?? stickman.y,
    facing: detail.facing ?? stickman.facing ?? 1,
    ttl,
    maxTtl: ttl
  });
}

function handleShotFired(event) {
  if (!shouldCapture("weapons")) {
    return;
  }
  const detail = event?.detail ?? {};
  const ttl = 0.4;
  const weaponId = detail.weaponId ?? "unknown";
  const existing = shotIndicators.find((entry) => entry.weaponId === weaponId);
  if (existing) {
    existing.ttl = ttl;
    existing.maxTtl = ttl;
    existing.age = 0;
    return;
  }
  shotIndicators.push({ weaponId, ttl, maxTtl: ttl, age: 0 });
  while (shotIndicators.length > 5) {
    shotIndicators.shift();
  }
}

function handleReloadStart(event) {
  if (!shouldCapture("weapons")) {
    return;
  }
  const weaponId = event?.detail?.weaponId ?? "unknown";
  pushNotice(`Reloading ${weaponId}`);
}

function handleReloadFinish(event) {
  if (!shouldCapture("weapons")) {
    return;
  }
  const weaponId = event?.detail?.weaponId ?? "unknown";
  pushNotice(`Reload complete ${weaponId}`, 1.4);
}

function handleRecoilKick(event) {
  if (!shouldCapture("weapons")) {
    return;
  }
  const detail = event?.detail ?? {};
  const weaponId = detail.weaponId ?? "unknown";
  const horizontal = detail.recoil?.horizontal ?? 0;
  const vertical = detail.recoil?.vertical ?? 0;
  const magnitude = Math.hypot(horizontal, vertical);
  if (magnitude <= 0) {
    return;
  }
  pushNotice(`Recoil ${weaponId}: ${magnitude.toFixed(2)}`, 1.2);
}

function handleShieldHit(event) {
  if (!shouldCapture("shield")) {
    return;
  }
  const detail = event?.detail ?? {};
  const ttl = 0.28;
  const center = {
    x: detail.center?.x ?? stickman.x,
    y: detail.center?.y ?? stickman.y
  };
  shieldBursts.push({
    type: "hit",
    absorb: detail.absorb ?? 0,
    center,
    ttl,
    maxTtl: ttl
  });
  if (detail.absorb !== undefined) {
    pushNotice(`Shield absorb ${Math.round(detail.absorb)}`, 1.2);
  }
}

function handleShieldShatter(event) {
  if (!shouldCapture("shield")) {
    return;
  }
  const detail = event?.detail ?? {};
  const ttl = 0.45;
  const center = {
    x: detail.center?.x ?? stickman.x,
    y: detail.center?.y ?? stickman.y
  };
  shieldBursts.push({
    type: "shatter",
    center,
    ttl,
    maxTtl: ttl
  });
  const reason = detail.reason ?? "shatter";
  pushNotice(`Shield ${reason}`, 1.6);
}

function handleShieldEnd(event) {
  if (!shouldCapture("shield")) {
    return;
  }
  const reason = event?.detail?.reason ?? "ended";
  if (reason === "shatter") {
    return;
  }
  pushNotice(`Shield ${reason}`, 1.4);
}

function handleThrowableThrown(event) {
  if (!shouldCapture("throwables")) {
    return;
  }
  const detail = event?.detail ?? {};
  const effect = detail.effectType ?? "unknown";
  pushNotice(`Throwable thrown (${effect})`, 1.4);
}

function handleThrowableExplosion(event) {
  if (!shouldCapture("throwables")) {
    return;
  }
  const detail = event?.detail ?? {};
  pushThrowableBurst("explosion", detail, 0.55);
  if (detail.damage !== undefined) {
    pushNotice(`Explosion damage ${detail.damage}`, 1.6);
  } else {
    pushNotice("Explosion triggered", 1.4);
  }
}

function handleThrowableFlashBurst(event) {
  if (!shouldCapture("throwables")) {
    return;
  }
  const detail = event?.detail ?? {};
  pushThrowableBurst("flash", detail, 0.45);
  const stunDuration = detail.stunDuration ?? 0;
  const stunLabel = typeof stunDuration === "number" ? stunDuration.toFixed(1) : String(stunDuration);
  pushNotice(`Flash burst (stun ${stunLabel}s)`, 1.6);
}

function handleThrowableSmokeDetonate(event) {
  if (!shouldCapture("throwables")) {
    return;
  }
  const detail = event?.detail ?? {};
  const burst = pushThrowableBurst("smoke", detail, 0.6);
  burst.maxRadius = detail.radius ?? burst.radius;
  const durationSeconds = Math.round(((detail.duration ?? 0) + Number.EPSILON) * 10) / 10;
  pushNotice(`Smoke deployed (${durationSeconds}s)`, 1.6);
}

function handleThrowableSmokeDissipate(event) {
  if (!shouldCapture("throwables")) {
    return;
  }
  const detail = event?.detail ?? {};
  pushThrowableBurst("smoke-fade", detail, 0.4);
  pushNotice("Smoke dissipated", 1.4);
}

let listenersRegistered = false;

function ensureListeners() {
  if (listenersRegistered || typeof window === "undefined") {
    return;
  }
  window.addEventListener("weapon:muzzle-flash", handleMuzzleFlash);
  window.addEventListener("weapon:shot-fired", handleShotFired);
  window.addEventListener("weapon:reload-start", handleReloadStart);
  window.addEventListener("weapon:reload-finish", handleReloadFinish);
  window.addEventListener("weapon:recoil-kick", handleRecoilKick);
  window.addEventListener("shield:hit", handleShieldHit);
  window.addEventListener("shield:shatter", handleShieldShatter);
  window.addEventListener("shield:end", handleShieldEnd);
  window.addEventListener("throwable:thrown", handleThrowableThrown);
  window.addEventListener("throwable:explosion", handleThrowableExplosion);
  window.addEventListener("throwable:flash-burst", handleThrowableFlashBurst);
  window.addEventListener("throwable:smoke-detonate", handleThrowableSmokeDetonate);
  window.addEventListener("throwable:smoke-dissipate", handleThrowableSmokeDissipate);
  window.addEventListener("keydown", handleFilterToggle);
  listenersRegistered = true;
}

function updateList(list, delta) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const entry = list[i];
    entry.ttl -= delta;
    entry.age = (entry.age ?? 0) + delta;
    if (entry.ttl <= 0) {
      list.splice(i, 1);
    }
  }
}

function updatePolishDebug(delta) {
  ensureListeners();
  updateList(muzzleFlashes, delta);
  updateList(shieldBursts, delta);
  updateList(throwableBursts, delta);
  updateList(notices, delta);
  updateList(shotIndicators, delta);
}

function getPolishDebugState() {
  ensureListeners();
  return {
    muzzleFlashes,
    shieldBursts,
    throwableBursts,
    notices,
    shotIndicators,
    filters: { ...filters }
  };
}

export { updatePolishDebug, getPolishDebugState };
