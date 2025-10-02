import { context } from "../../environment/canvas.js";
import { clamp } from "../utils/math.js";

const particles = [];
const rings = [];
let listenersAttached = false;

function spawnRingBurst(options = {}) {
  const ttl = options.ttl ?? 0.4;
  const ring = {
    x: options.x ?? 0,
    y: options.y ?? 0,
    startRadius: options.startRadius ?? 70,
    endRadius: options.endRadius ?? 140,
    color: options.color ?? "#ffffff",
    maxTtl: ttl,
    ttl,
    lineWidth: options.lineWidth ?? 5
  };
  rings.push(ring);
  return ring;
}

function spawnMuzzleParticles(detail = {}) {
  const count = 6;
  const baseX = detail.x ?? 0;
  const baseY = detail.y ?? 0;
  const facing = detail.facing ?? 1;
  for (let i = 0; i < count; i += 1) {
    const speed = 140 + Math.random() * 120;
    const angle = (Math.random() * 0.6 - 0.3) + (facing > 0 ? 0 : Math.PI);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const ttl = 0.18 + Math.random() * 0.08;
    particles.push({
      type: "spark",
      x: baseX,
      y: baseY,
      vx,
      vy,
      ttl,
      maxTtl: ttl,
      radius: 4 + Math.random() * 3,
      color: "#ffdd9a"
    });
  }
}

function spawnShieldRing(detail = {}, config = {}) {
  const center = detail.center ?? { x: detail.x ?? 0, y: detail.y ?? 0 };
  return spawnRingBurst({
    x: center.x,
    y: center.y,
    ttl: config.ttl ?? 0.4,
    startRadius: config.startRadius ?? (detail.radius ?? 70),
    endRadius: config.endRadius ?? (detail.radius ?? 70) * 1.25,
    color: config.color ?? "#7cd6ff",
    lineWidth: config.lineWidth ?? 5
  });
}

function spawnShieldHitParticles(detail = {}) {
  const center = detail.center ?? { x: 0, y: 0 };
  for (let i = 0; i < 9; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 150;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const ttl = 0.3 + Math.random() * 0.2;
    particles.push({
      type: "shield",
      x: center.x,
      y: center.y,
      vx,
      vy,
      ttl,
      maxTtl: ttl,
      radius: 6 + Math.random() * 6,
      color: "#9be9ff"
    });
  }
  spawnShieldRing(detail, {
    ttl: 0.35,
    startRadius: (detail.radius ?? 72) * 0.75,
    endRadius: (detail.radius ?? 72) * 1.15,
    lineWidth: 4,
    color: "#a9f0ff"
  });
}

function spawnShieldShatter(detail = {}) {
  spawnShieldRing(detail, {
    ttl: 0.55,
    startRadius: (detail.radius ?? 96) * 0.9,
    endRadius: (detail.radius ?? 96) * 1.6,
    lineWidth: 7,
    color: "#7cd6ff"
  });
  spawnShieldHitParticles({ center: detail.center, radius: detail.radius ?? 96 });
}

function spawnDestructibleHitParticles(detail = {}) {
  const material = detail.material ?? "generic";
  const paletteMap = {
    concrete: ["#dfe6f2", "#b9c3d0", "#6c7584"],
    vehicle: ["#ffd6c8", "#ff9a82", "#3a1a1a"],
    volatile: ["#ffd38a", "#ff9c3b", "#6e2c05"],
    generic: ["#f2f5ff", "#c9d0de"]
  };
  const palette = paletteMap[material] ?? paletteMap.generic;
  const maxHealth = Math.max(1, detail.maxHealth ?? detail.health ?? 1);
  const remaining = Math.max(0, Math.min(maxHealth, detail.health ?? maxHealth));
  const intensity = clamp(1 - remaining / maxHealth, 0, 1);
  const count = Math.max(6, Math.round(6 + intensity * 6));
  const baseSpeed = 160 + intensity * 200;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = baseSpeed * (0.45 + Math.random() * 0.65);
    particles.push({
      type: "debris",
      x: detail.x ?? 0,
      y: detail.y ?? 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.7 - 50,
      ttl: 0.45 + Math.random() * 0.3,
      maxTtl: 0.45 + Math.random() * 0.3,
      radius: 3 + Math.random() * 4,
      color: palette[i % palette.length]
    });
  }
}

function ensureListeners() {
  if (listenersAttached || typeof window === "undefined") {
    return;
  }
  window.addEventListener("weapon:muzzle-flash", (event) => {
    spawnMuzzleParticles(event?.detail ?? {});
  });
  window.addEventListener("shield:hit", (event) => {
    spawnShieldHitParticles(event?.detail ?? {});
  });
  window.addEventListener("shield:shatter", (event) => {
    spawnShieldShatter(event?.detail ?? {});
  });
  window.addEventListener("throwable:explosion", (event) => {
    spawnExplosionParticles(event?.detail ?? {});
  });
  window.addEventListener("throwable:flash-burst", (event) => {
    spawnFlashBurst(event?.detail ?? {});
  });
  window.addEventListener("throwable:smoke-spawn", (event) => {
    spawnSmokePuffs(event?.detail ?? {});
  });
  window.addEventListener("throwable:smoke-dissipate", (event) => {
    spawnSmokeDissipateRing(event?.detail ?? {});
  });
  window.addEventListener("destructible:hit", (event) => {
    spawnDestructibleHitParticles(event?.detail ?? {});
  });
  listenersAttached = true;
}

function spawnExplosionParticles(detail = {}) {
  const baseX = detail.x ?? 0;
  const baseY = detail.y ?? 0;
  const radius = detail.radius ?? 110;
  const count = 18;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 220 + Math.random() * 220;
    const ttl = 0.3 + Math.random() * 0.25;
    particles.push({
      type: "ember",
      x: baseX,
      y: baseY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ttl,
      maxTtl: ttl,
      radius: 5 + Math.random() * 4,
      color: Math.random() > 0.55 ? "#ff9c4a" : "#ffd56b"
    });
  }
  spawnRingBurst({
    x: baseX,
    y: baseY,
    startRadius: radius * 0.45,
    endRadius: radius * 1.05,
    color: "#ffb347",
    lineWidth: 6,
    ttl: 0.45
  });
}

function spawnExplosionDebris(detail = {}) {
  const baseX = detail.x ?? 0;
  const baseY = detail.y ?? 0;
  const count = detail.count ?? 14;
  const radius = detail.radius ?? 120;
  const speedBase = detail.speed ?? 260;
  const palette = detail.palette ?? ["#ffdd9a", "#f7a24a", "#b55628", "#5b4340"];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = speedBase * (0.45 + Math.random() * 0.65);
    const tilt = (Math.random() - 0.5) * 0.6;
    particles.push({
      type: "debris",
      x: baseX + Math.cos(angle) * (detail.offsetRadius ?? 0),
      y: baseY + Math.sin(angle) * (detail.offsetRadius ?? 0),
      vx: Math.cos(angle + tilt) * speed,
      vy: Math.sin(angle + tilt) * speed * 0.7 - 60,
      ttl: 0.4 + Math.random() * 0.3,
      maxTtl: 0.4 + Math.random() * 0.3,
      radius: 3 + Math.random() * 4,
      color: palette[i % palette.length]
    });
  }
}
function spawnFlashBurst(detail = {}) {
  const baseX = detail.x ?? 0;
  const baseY = detail.y ?? 0;
  const radius = detail.radius ?? 140;
  spawnRingBurst({
    x: baseX,
    y: baseY,
    startRadius: radius * 0.6,
    endRadius: radius * 1.35,
    color: "#fff6d0",
    lineWidth: 8,
    ttl: 0.32
  });
  for (let i = 0; i < 12; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 160 + Math.random() * 140;
    const ttl = 0.18 + Math.random() * 0.08;
    particles.push({
      type: "flash",
      x: baseX,
      y: baseY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ttl,
      maxTtl: ttl,
      radius: 5 + Math.random() * 3,
      color: "#fffbe0"
    });
  }
}

function spawnSmokePuffs(detail = {}) {
  const baseX = detail.x ?? 0;
  const baseY = detail.y ?? 0;
  const radius = detail.radius ?? detail.maxRadius ?? 120;
  const count = 14;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    const vx = Math.cos(angle) * speed * 0.4;
    const vy = -40 - Math.random() * 50;
    const ttl = 0.9 + Math.random() * 0.5;
    particles.push({
      type: "smoke",
      x: baseX + Math.cos(angle) * radius * 0.2,
      y: baseY + Math.sin(angle) * radius * 0.1,
      vx,
      vy,
      ttl,
      maxTtl: ttl,
      radius: radius * (0.15 + Math.random() * 0.18),
      color: "#aec4d8"
    });
  }
  spawnRingBurst({
    x: baseX,
    y: baseY,
    startRadius: radius * 0.5,
    endRadius: radius * 1.2,
    color: "#9db8ca",
    lineWidth: 4,
    ttl: 0.5
  });
}

function spawnSmokeDissipateRing(detail = {}) {
  spawnRingBurst({
    x: detail.x ?? 0,
    y: detail.y ?? 0,
    startRadius: (detail.radius ?? 110) * 0.8,
    endRadius: (detail.radius ?? 110) * 1.1,
    color: "#95a8b8",
    lineWidth: 3,
    ttl: 0.4
  });
}

function updateParticles(delta) {
  ensureListeners();
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.ttl -= delta;
    if (p.ttl <= 0) {
      particles.splice(i, 1);
      continue;
    }
    const life = clamp(p.ttl / p.maxTtl, 0, 1);
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    if (p.type === "shield") {
      p.vx *= 0.88;
      p.vy *= 0.88;
      p.radius *= 0.96 + life * 0.04;
    } else if (p.type === "smoke") {
      p.vx *= 0.9;
      p.vy = (p.vy ?? 0) * 0.9 - 24 * delta;
      p.radius *= 0.995 + life * 0.02;
    } else if (p.type === "ember") {
      p.vx *= 0.94;
      p.vy *= 0.94;
    } else if (p.type === "debris") {
      p.vy += 520 * delta;
      p.vx *= 0.88;
      p.vy *= 0.9;
      p.radius *= 0.95;
    } else if (p.type === "flash") {
      p.vx *= 0.8;
      p.vy *= 0.8;
      p.radius *= 0.9 + life * 0.08;
    } else {
      p.vx *= 0.86;
      p.vy *= 0.86;
    }
  }

  for (let i = rings.length - 1; i >= 0; i -= 1) {
    const ring = rings[i];
    ring.ttl -= delta;
    if (ring.ttl <= 0) {
      rings.splice(i, 1);
      continue;
    }
  }
}
function drawParticles() {
  ensureListeners();
  if (particles.length === 0 && rings.length === 0) {
    return;
  }

  context.save();
  for (const ring of rings) {
    const life = clamp(ring.ttl / ring.maxTtl, 0, 1);
    const progress = 1 - life;
    const radius = ring.startRadius + (ring.endRadius - ring.startRadius) * progress;
    context.globalAlpha = clamp(life, 0, 1) * 0.6;
    context.lineWidth = ring.lineWidth;
    context.strokeStyle = ring.color;
    context.beginPath();
    context.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
    context.stroke();
  }

  for (const particle of particles) {
    const life = clamp(particle.ttl / particle.maxTtl, 0, 1);
    let alpha = clamp(life, 0, 1);
    if (particle.type === "smoke") {
      alpha *= 0.55;
    } else if (particle.type === "flash") {
      alpha = 0.35 + alpha * 0.65;
    } else if (particle.type === "debris") {
      alpha = 0.5 + alpha * 0.5;
    }
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    let sizeFactor = life;
    if (particle.type === "smoke") {
      sizeFactor = 1;
    } else if (particle.type === "debris") {
      sizeFactor = 0.6 + life * 0.4;
    }
    const radius = Math.max(1.2, particle.radius * sizeFactor);
    context.beginPath();
    context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}























export { spawnExplosionParticles, spawnExplosionDebris, spawnDestructibleHitParticles, spawnSmokePuffs, spawnSmokeDissipateRing, spawnRingBurst, updateParticles, drawParticles };
