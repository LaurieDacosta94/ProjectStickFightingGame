import { DESTRUCTIBLE_TEMPLATES, DESTRUCTIBLE_SPAWNS } from "../config/destructibles.js";

function createDestructibleFromSpawn(spawn) {
  const template = DESTRUCTIBLE_TEMPLATES[spawn.type];
  if (!template) {
    throw new Error(`Unknown destructible template: ${spawn.type}`);
  }

  const width = spawn.width ?? template.width;
  const height = spawn.height ?? template.height;

  return {
    id: spawn.id,
    type: spawn.type,
    template,
    x: spawn.x,
    y: spawn.baseY,
    width,
    height,
    halfWidth: width / 2,
    health: template.maxHealth,
    maxHealth: template.maxHealth,
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
}

function createInitialState() {
  return DESTRUCTIBLE_SPAWNS.map((spawn) => createDestructibleFromSpawn(spawn));
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

export { destructibles, getDestructibles, getDestructibleById, resetDestructibles };
