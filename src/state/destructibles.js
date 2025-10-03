import { DESTRUCTIBLE_TEMPLATES } from "../config/destructibles.js";
import { getEnvironmentDestructibleSpawns, onEnvironmentChange } from "./environment.js";

function createDestructibleFromSpawn(spawn) {
  const baseTemplate = DESTRUCTIBLE_TEMPLATES[spawn.type];
  if (!baseTemplate) {
    throw new Error(`Unknown destructible template: ${spawn.type}`);
  }

  const templateOverrides = spawn.templateOverrides ?? {};
  const template = { ...baseTemplate, ...templateOverrides };
  const width = spawn.width ?? template.width ?? baseTemplate.width;
  const height = spawn.height ?? template.height ?? baseTemplate.height;
  const halfWidth = width / 2;
  const maxHealth = template.maxHealth ?? baseTemplate.maxHealth ?? 100;

  const destructible = {
    id: spawn.id,
    type: spawn.type,
    template,
    x: spawn.x,
    y: spawn.baseY,
    width,
    height,
    halfWidth,
    health: maxHealth,
    maxHealth,
    destroyed: false,
    flashTimer: 0,
    shakeTimer: 0,
    shakeMagnitude: 0,
    smokeTimer: 0,
    rubbleLevel: 0,
    deathTriggered: false,
    facing: spawn.facing ?? 1,
    spawnConfig: { ...spawn }
  };

  if (spawn.overrides && typeof spawn.overrides === "object") {
    Object.assign(destructible, spawn.overrides);
  }

  return destructible;
}

function createInitialState() {
  return getEnvironmentDestructibleSpawns().map((spawn) => createDestructibleFromSpawn(spawn));
}

const destructibles = createInitialState();

function resetDestructibles() {
  destructibles.length = 0;
  const fresh = createInitialState();
  for (const item of fresh) {
    destructibles.push(item);
  }
}

function getDestructibles() {
  return destructibles;
}

function getDestructibleById(id) {
  return destructibles.find((item) => item.id === id) ?? null;
}

onEnvironmentChange(() => {
  resetDestructibles();
});

export { destructibles, getDestructibles, getDestructibleById, resetDestructibles };
