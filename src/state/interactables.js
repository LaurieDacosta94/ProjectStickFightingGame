import { INTERACTABLE_TEMPLATES } from "../config/interactables.js";
import { getEnvironmentInteractableSpawns, onEnvironmentChange } from "./environment.js";

function createInteractableFromSpawn(spawn) {
  const baseTemplate = INTERACTABLE_TEMPLATES[spawn.type];
  if (!baseTemplate) {
    throw new Error(`Unknown interactable template: ${spawn.type}`);
  }

  const templateOverrides = spawn.templateOverrides ?? {};
  const template = { ...baseTemplate, ...templateOverrides };
  const width = spawn.width ?? template.width ?? (template.radius ? template.radius * 2 : 64);
  const height = spawn.height ?? template.height ?? 48;
  const radius = spawn.radius ?? template.radius ?? Math.max(width, height) * 0.5;

  const interactable = {
    id: spawn.id,
    type: spawn.type,
    template,
    x: spawn.x,
    y: spawn.baseY,
    vx: 0,
    vy: 0,
    width,
    height,
    radius,
    state: template.initialState ?? "idle",
    timer: 0,
    cooldown: 0,
    highlight: 0,
    triggered: false,
    flashTimer: 0,
    smokeTimer: 0,
    mass: template.mass ?? 1,
    friction: template.friction ?? 2,
    maxSpeed: template.maxSpeed ?? 240,
    pushImpulse: template.pushImpulse ?? 240,
    hitImpulse: template.hitImpulse ?? template.pushImpulse ?? 320,
    facing: spawn.facing ?? 1,
    minX: spawn.minX ?? null,
    maxX: spawn.maxX ?? null
  };

  if (spawn.overrides && typeof spawn.overrides === "object") {
    Object.assign(interactable, spawn.overrides);
  }

  return interactable;
}

function createInitialState() {
  return getEnvironmentInteractableSpawns().map((spawn) => createInteractableFromSpawn(spawn));
}

const interactables = createInitialState();

function resetInteractables() {
  interactables.length = 0;
  const fresh = createInitialState();
  for (const item of fresh) {
    interactables.push(item);
  }
}

function getInteractables() {
  return interactables;
}

function getInteractableById(id) {
  return interactables.find((item) => item.id === id) ?? null;
}

onEnvironmentChange(() => {
  resetInteractables();
});

export { interactables, getInteractables, getInteractableById, resetInteractables };
