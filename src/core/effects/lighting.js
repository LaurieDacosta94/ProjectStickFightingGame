import { context } from "../../environment/canvas.js";
import { stickman, squadmates } from "../../state/entities.js";
import { onEnvironmentChange, getEnvironmentAmbientLights } from "../../state/environment.js";
import { getStructures } from "../../state/buildings.js";
import { clamp } from "../utils/math.js";

const persistentLights = new Map();
const transientLights = [];
let listenersAttached = false;
let environmentAmbientLights = getEnvironmentAmbientLights();

onEnvironmentChange((environment) => {
  environmentAmbientLights = Array.isArray(environment?.ambientLights) ? environment.ambientLights : [];
  persistentLights.clear();
});

function clampIntensity(value) {
  return clamp(value, 0, 3);
}

function parseColor(color) {
  if (typeof color !== "string") {
    return { r: 255, g: 255, b: 255 };
  }
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }
    if (hex.length === 6) {
      const numeric = Number.parseInt(hex, 16);
      if (!Number.isNaN(numeric)) {
        return {
          r: (numeric >> 16) & 0xff,
          g: (numeric >> 8) & 0xff,
          b: numeric & 0xff
        };
      }
    }
  }
  const match = trimmed.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (match) {
    return {
      r: Number.parseInt(match[1], 10),
      g: Number.parseInt(match[2], 10),
      b: Number.parseInt(match[3], 10)
    };
  }
  return { r: 255, g: 255, b: 255 };
}

function rgba(color, alpha) {
  const { r, g, b } = parseColor(color);
  const clampedAlpha = clamp(alpha, 0, 1.2);
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

function setPersistentLight(id, props) {
  let light = persistentLights.get(id);
  if (!light) {
    light = {
      id,
      intensity: 0,
      targetIntensity: clampIntensity(props.intensity ?? 1),
      type: props.type ?? "point",
      smoothing: props.smoothing ?? 10
    };
    persistentLights.set(id, light);
  }
  light.type = props.type ?? light.type ?? "point";
  light.x = props.x ?? light.x ?? 0;
  light.y = props.y ?? light.y ?? 0;
  light.radius = props.radius ?? light.radius ?? 180;
  light.fov = props.fov ?? light.fov ?? Math.PI / 2;
  light.direction = props.direction ?? light.direction ?? 0;
  light.color = props.color ?? light.color ?? "#ffffff";
  light.stretch = props.stretch ?? light.stretch ?? 1;
  light.flicker = props.flicker ?? light.flicker ?? 0;
  light.smoothing = props.smoothing ?? light.smoothing ?? 10;
  light.targetIntensity = clampIntensity(props.intensity ?? light.targetIntensity ?? 1);
  light.active = true;
}

function spawnDynamicLight(options = {}) {
  ensureListeners();
  const ttl = Math.max(0.016, options.ttl ?? 0.3);
  transientLights.push({
    type: options.type ?? "point",
    x: options.x ?? 0,
    y: options.y ?? 0,
    radius: options.radius ?? 160,
    intensity: clampIntensity(options.intensity ?? 1),
    color: options.color ?? "#ffffff",
    direction: options.direction ?? 0,
    fov: options.fov ?? Math.PI / 2,
    stretch: options.stretch ?? 1,
    flicker: options.flicker ?? 0,
    decay: clamp(options.decay ?? 1, 0.3, 4),
    ttl,
    maxTtl: ttl
  });
}

function ensureListeners() {
  if (listenersAttached || typeof window === "undefined") {
    return;
  }
  window.addEventListener("weapon:muzzle-flash", (event) => {
    const detail = event?.detail ?? {};
    spawnDynamicLight({
      type: "point",
      x: detail.x ?? 0,
      y: detail.y ?? 0,
      radius: detail.radius ? detail.radius * 1.2 : 140,
      intensity: 1.2,
      color: "#ffe4b0",
      ttl: 0.12,
      flicker: 0.35,
      decay: 0.7
    });
    if (typeof detail.facing === "number" && detail.facing !== 0) {
      spawnDynamicLight({
        type: "cone",
        x: detail.x ?? 0,
        y: detail.y ?? 0,
        radius: 200,
        intensity: 0.9,
        color: "#fff7d4",
        direction: detail.facing > 0 ? 0 : Math.PI,
        fov: Math.PI / 5,
        stretch: 0.4,
        ttl: 0.12,
        flicker: 0.25,
        decay: 0.8
      });
    }
  });
  window.addEventListener("throwable:explosion", (event) => {
    const detail = event?.detail ?? {};
    const radius = detail.radius ? detail.radius * 1.6 : 240;
    spawnDynamicLight({
      type: "point",
      x: detail.x ?? 0,
      y: detail.y ?? 0,
      radius,
      intensity: 1.7,
      color: "#ffbf6b",
      ttl: 0.45,
      flicker: 0.45,
      decay: 0.7
    });
  });
  window.addEventListener("throwable:flash-burst", (event) => {
    const detail = event?.detail ?? {};
    spawnDynamicLight({
      type: "point",
      x: detail.x ?? 0,
      y: detail.y ?? 0,
      radius: (detail.radius ?? 220) * 1.4,
      intensity: 2,
      color: "#ffffff",
      ttl: 0.35,
      flicker: 0.6,
      decay: 0.6
    });
  });
  window.addEventListener("throwable:smoke-spawn", (event) => {
    const detail = event?.detail ?? {};
    spawnDynamicLight({
      type: "point",
      x: detail.x ?? 0,
      y: detail.y ?? 0,
      radius: (detail.radius ?? 160) * 1.1,
      intensity: 0.5,
      color: "#7ad4ff",
      ttl: 0.5,
      flicker: 0.2,
      decay: 1.4
    });
  });
  window.addEventListener("throwable:smoke-dissipate", (event) => {
    const detail = event?.detail ?? {};
    spawnDynamicLight({
      type: "point",
      x: detail.x ?? 0,
      y: detail.y ?? 0,
      radius: (detail.radius ?? 160) * 1.3,
      intensity: 0.35,
      color: "#a4f1ff",
      ttl: 0.4,
      flicker: 0.18,
      decay: 1.6
    });
  });
  window.addEventListener("destructible:hit", (event) => {
    const detail = event?.detail ?? {};
    spawnDynamicLight({
      type: "point",
      x: detail.impactX ?? detail.x ?? 0,
      y: detail.impactY ?? detail.y ?? 0,
      radius: 140,
      intensity: 0.55,
      color: "#ffe1a4",
      ttl: 0.18,
      flicker: 0.3,
      decay: 1.1
    });
  });
  listenersAttached = true;
}

function updateEnvironmentLights() {
  const anchors = Array.isArray(environmentAmbientLights) ? environmentAmbientLights : [];
  for (let i = 0; i < anchors.length; i += 1) {
    const anchor = anchors[i] ?? {};
    const id = anchor.id ?? "env-light-" + i;
    setPersistentLight(id, anchor);
  }
}

function updateFlashlights() {
  const playerFacing = stickman.facing ?? 1;
  const alive = stickman.deadTimer <= 0;
  const inVehicle = stickman.controlMode === "vehicle";
  const baseIntensity = alive ? (inVehicle ? 0.65 : 0.9) : 0;

  setPersistentLight("player-flashlight", {
    type: "cone",
    x: stickman.x + playerFacing * 34,
    y: stickman.y + 28,
    radius: inVehicle ? 280 : 240,
    intensity: baseIntensity,
    color: "#ffd591",
    direction: playerFacing >= 0 ? 0 : Math.PI,
    fov: Math.PI * 0.5,
    stretch: 0.42,
    smoothing: 18,
    flicker: 0.2
  });

  squadmates.forEach((ally, index) => {
    if (!ally || ally.state === "defeated") {
      return;
    }
    const facing = ally.facing ?? 1;
    setPersistentLight("squad-flashlight-" + (ally.id ?? index), {
      type: "cone",
      x: ally.x + facing * 30,
      y: ally.y + 26,
      radius: 210,
      intensity: 0.6,
      color: "#fff0c4",
      direction: facing >= 0 ? 0 : Math.PI,
      fov: Math.PI * 0.45,
      stretch: 0.38,
      smoothing: 20,
      flicker: 0.24
    });
  });
}

function isLightVisible(light) {
  const radius = light.radius ?? 0;
  if (radius <= 0) {
    return false;
  }
  const width = context.canvas.width;
  const height = context.canvas.height;
  return light.x + radius >= 0 && light.x - radius <= width && light.y + radius >= 0 && light.y - radius <= height;
}

function drawPointLight(light, strength) {
  if (!isLightVisible(light)) {
    return;
  }
  const radius = light.radius ?? 160;
  const gradient = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
  gradient.addColorStop(0, rgba(light.color, clamp(strength * 1.05, 0, 1.1)));
  gradient.addColorStop(0.4, rgba(light.color, clamp(strength * 0.6, 0, 0.9)));
  gradient.addColorStop(1, rgba(light.color, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(light.x, light.y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawConeLight(light, strength) {
  if (!isLightVisible(light)) {
    return;
  }
  const radius = light.radius ?? 200;
  const fov = clamp(light.fov ?? Math.PI / 3, Math.PI / 12, Math.PI);
  const stretch = clamp(light.stretch ?? 0.5, 0.2, 1.2);
  context.save();
  context.translate(light.x, light.y);
  context.rotate(light.direction ?? 0);
  context.scale(1, stretch);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, rgba(light.color, clamp(strength, 0, 1)));
  gradient.addColorStop(0.45, rgba(light.color, clamp(strength * 0.6, 0, 0.8)));
  gradient.addColorStop(1, rgba(light.color, 0));
  context.fillStyle = gradient;
  context.beginPath();
  const halfFov = fov / 2;
  context.moveTo(0, 0);
  context.arc(0, 0, radius, -halfFov, halfFov);
  context.closePath();
  context.fill();
  context.restore();
}

function updateLighting(delta) {
  ensureListeners();

  for (const light of persistentLights.values()) {
    light.active = false;
  }

  updateEnvironmentLights();
  updateFlashlights();
  const structureLights = getStructures();
  for (let i = 0; i < structureLights.length; i += 1) {
    const structure = structureLights[i];
    const ambient = structure?.ambient;
    if (!ambient) {
      continue;
    }
    setPersistentLight(`structure-${structure.id}`, {
      type: ambient.type ?? "point",
      x: structure.x + (ambient.offsetX ?? 0),
      y: structure.y - (structure.height ?? 120) + (ambient.offsetY ?? -40),
      radius: ambient.radius ?? 220,
      intensity: ambient.intensity ?? 0.8,
      color: ambient.color ?? "#8cffd4",
      smoothing: ambient.smoothing ?? 10,
      flicker: ambient.flicker ?? 0.25,
      fov: ambient.fov,
      direction: ambient.direction,
      stretch: ambient.stretch ?? 0.5
    });
  }

  for (const [id, light] of persistentLights.entries()) {
    if (!light.active) {
      persistentLights.delete(id);
      continue;
    }
    const smoothing = clamp(light.smoothing ?? 12, 1, 60);
    const lerp = clamp(delta * smoothing, 0, 1);
    light.intensity += (light.targetIntensity - light.intensity) * lerp;
    light.intensity = clampIntensity(light.intensity);
    if (light.flicker > 0) {
      light.intensity = clampIntensity(light.intensity + (Math.random() - 0.5) * light.flicker);
    }
  }

  for (let i = transientLights.length - 1; i >= 0; i -= 1) {
    const light = transientLights[i];
    light.ttl -= delta;
    if (light.ttl <= 0) {
      transientLights.splice(i, 1);
    }
  }
}

function drawLighting() {
  if (persistentLights.size === 0 && transientLights.length === 0) {
    return;
  }
  context.save();
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = 1;

  for (const light of persistentLights.values()) {
    const strength = clampIntensity(light.intensity);
    if (strength <= 0.01) {
      continue;
    }
    if (light.type === "cone") {
      drawConeLight(light, strength);
    } else {
      drawPointLight(light, strength);
    }
  }

  for (const light of transientLights) {
    const ratio = clamp(light.ttl / light.maxTtl, 0, 1);
    let strength = clampIntensity(light.intensity * Math.pow(ratio, light.decay ?? 1));
    if (light.flicker > 0) {
      strength = clampIntensity(strength + (Math.random() - 0.5) * light.flicker);
    }
    if (strength <= 0.01) {
      continue;
    }
    if (light.type === "cone") {
      drawConeLight(light, strength);
    } else {
      drawPointLight(light, strength);
    }
  }

  context.restore();
}

export { updateLighting, drawLighting, spawnDynamicLight };
