import { canvas, GROUND_Y } from "../environment/canvas.js";
import { POSES } from "../config/constants.js";
import { SQUAD_COMMANDS } from "../config/squad.js";
import { getEnvironmentSpawnSettings, onEnvironmentChange, getEnvironmentWidth } from "./environment.js";

function getTotalHeight(pose) {
  return pose.headRadius * 2 + pose.bodyLength + pose.legLength;
}

function createGruntEnemy(spawnX, options = {}) {
  const spawnSettings = getEnvironmentSpawnSettings();
  const predefined = Array.isArray(spawnSettings?.enemies) ? spawnSettings.enemies : [];
  const resolvedX = typeof spawnX === "number" ? spawnX : predefined[0] ?? getEnvironmentWidth() * 0.25;
  const enemyHeight = 118;
  const spawnY = spawnSettings?.enemyY ?? GROUND_Y - enemyHeight;
  const contextTag = options.context ?? "sandbox";
  const autoRespawn = options.autoRespawn ?? contextTag !== "survival";
  const spawnSide = options.spawnSide ?? null;
  const initialFacing = options.facing ?? 1;
  const id = `grunt-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    spawnX: resolvedX,
    spawnY,
    x: resolvedX,
    y: spawnY,
    vx: 0,
    vy: 0,
    radius: 22,
    height: enemyHeight,
    facing: initialFacing,
    onGround: true,
    state: "patrol",
    stateTimer: 1 + Math.random(),
    patrolRange: { min: resolvedX - 100, max: resolvedX + 220 },
    aggressionRange: 360,
    attackRange: 86,
    moveSpeed: 160,
    health: 120,
    maxHealth: 120,
    attackCooldown: 0,
    attackWindup: 0,
    attackActive: 0,
    attackDamage: 12,
    attackKnockback: 120,
    attackLaunch: -80,
    flashTimer: 0,
    shakeTimer: 0,
    shakeMagnitude: 0,
    invulnerability: 0,
    respawnTimer: 0,
    stunTimer: 0,
    smokeSlowTimer: 0,
    smokeSlowStrength: 1,
    spawnContext: contextTag,
    autoRespawn,
    spawnSide,
    active: true
  };
}

function createSquadmate(offsetX = 0, name = "Ally", baseX = getEnvironmentWidth() * 0.5) {
  const spawnX = baseX + offsetX;
  const spawnY = GROUND_Y - getTotalHeight(POSES.standing);
  return {
    id: `squad-${Math.random().toString(36).slice(2, 8)}`,
    name,
    x: spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    state: "follow",
    fireCooldown: 0,
    commandTimer: 0,
    targetEnemyId: null,
    flashTimer: 0,
    highlight: 0,
    structureShieldTimer: 0,
    structureShieldStrength: 0,
    roleIndex: 0
  };
}

const spawnSettings = getEnvironmentSpawnSettings();
const standingHeight = getTotalHeight(POSES.standing);
const playerSpawnX = spawnSettings?.player?.x ?? getEnvironmentWidth() * 0.5;
const playerSpawnY = spawnSettings?.player?.y ?? GROUND_Y - standingHeight;

const stickman = {
  x: playerSpawnX,
  y: playerSpawnY,
  vx: 0,
  vy: 0,
  facing: 1,
  onGround: true,
  controlMode: "onFoot",
  vehicleId: null,
  vehicleCandidateId: null,
  squadCommandIndex: 0,
  squadCommandId: SQUAD_COMMANDS[0]?.id ?? "hold",
  squadCommandCooldown: 0,
  rolling: false,
  rollTimer: 0,
  crouching: false,
  currentPose: POSES.standing,
  attacking: false,
  attackIndex: -1,
  currentAttack: null,
  attackElapsed: 0,
  attackInstanceId: 0,
  comboWindowOpen: false,
  comboWindowTimer: 0,
  nextAttackQueued: false,
  hitboxSpawned: false,
  activeHitboxes: [],
  health: 100,
  maxHealth: 100,
  invulnerability: 0,
  deadTimer: 0,
  throwCooldown: 0,
  gadgetCooldown: 0,
  reloading: false,
  stunTimer: 0,
  flashBlindTimer: 0,
  smokeSlowTimer: 0,
  smokeSlowStrength: 1,
  structureShieldTimer: 0,
  structureShieldStrength: 0,
  equippedWeaponId: "combatFists"
};

const squadOffsets = Array.isArray(spawnSettings?.squadOffsets)
  ? spawnSettings.squadOffsets
  : [-120, 40, 120];

const squadmates = [
  createSquadmate(squadOffsets[0] ?? -120, "Sparrow", playerSpawnX),
  createSquadmate(squadOffsets[1] ?? 40, "Rook", playerSpawnX),
  createSquadmate(squadOffsets[2] ?? 120, "Viper", playerSpawnX)
];

const remotePlayers = new Map();

function upsertRemotePlayer(state) {
  if (!state || !state.id) {
    return;
  }
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const existing = remotePlayers.get(state.id) ?? {};
  remotePlayers.set(state.id, {
    id: state.id,
    name: state.name ?? existing.name ?? "Remote",
    x: state.x ?? existing.x ?? 0,
    y: state.y ?? existing.y ?? GROUND_Y - standingHeight,
    facing: state.facing ?? existing.facing ?? 1,
    commandId: state.commandId ?? existing.commandId ?? "hold",
    lastUpdate: now
  });
}

function getRemotePlayers() {
  return Array.from(remotePlayers.values());
}

function pruneRemotePlayers(maxAgeMs = 6000) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  for (const [id, player] of remotePlayers.entries()) {
    if (now - (player.lastUpdate ?? now) > maxAgeMs) {
      remotePlayers.delete(id);
    }
  }
}

const trainingDummy = {
  id: "training-dummy",
  x: spawnSettings?.trainingDummy?.x ?? getEnvironmentWidth() * 0.75,
  y: spawnSettings?.trainingDummy?.y ?? GROUND_Y - 120,
  height: 120,
  radius: 26,
  maxHealth: 150,
  health: 150,
  flashTimer: 0,
  shakeTimer: 0,
  shakeMagnitude: 0,
  respawnTimer: 0
};

const enemySpawnXs = Array.isArray(spawnSettings?.enemies)
  ? spawnSettings.enemies
  : [getEnvironmentWidth() * 0.24, getEnvironmentWidth() * 0.68];

const enemies = [
  createGruntEnemy(enemySpawnXs[0], { context: "sandbox", autoRespawn: true, spawnSide: 0, facing: 1 }),
  createGruntEnemy(enemySpawnXs[1], { context: "sandbox", autoRespawn: true, spawnSide: 1, facing: -1 })
];

function initializeSandboxEnemy(enemy, index) {
  enemy.spawnSide = index;
  enemy.spawnContext = enemy.spawnContext ?? "sandbox";
  enemy.autoRespawn = enemy.autoRespawn ?? true;
  enemy.facing = index === 0 ? 1 : -1;
}

enemies.forEach((enemy, index) => {
  initializeSandboxEnemy(enemy, index);
});

function ensureSandboxEnemies(spawn, playerX) {
  const enemyXs = Array.isArray(spawn.enemies) ? spawn.enemies : [];
  const requiredSandbox = Math.max(2, enemyXs.length || 0);
  const sandboxEnemies = enemies.filter((enemy) => enemy.spawnContext === "sandbox");
  const existingSides = new Set(sandboxEnemies.map((enemy) => enemy.spawnSide ?? sandboxEnemies.indexOf(enemy)));

  for (let side = 0; side < requiredSandbox; side += 1) {
    if (!existingSides.has(side)) {
      const fallback = playerX + (side === 0 ? -320 : 320);
      const spawnX = typeof enemyXs[side] === "number" ? enemyXs[side] : fallback;
      const newEnemy = createGruntEnemy(spawnX, { context: "sandbox", autoRespawn: true, spawnSide: side, facing: side === 0 ? 1 : -1 });
      enemies.push(newEnemy);
      sandboxEnemies.push(newEnemy);
      existingSides.add(side);
    }
  }

  for (const enemy of sandboxEnemies) {
    const side = enemy.spawnSide ?? 0;
    const fallback = playerX + (side === 0 ? -320 : 320);
    const spawnX = typeof enemyXs[side] === "number" ? enemyXs[side] : fallback;
    const spawnY = spawn.enemyY ?? GROUND_Y - enemy.height;
    enemy.spawnSide = side;
    enemy.spawnContext = "sandbox";
    enemy.autoRespawn = true;
    enemy.spawnX = spawnX;
    enemy.spawnY = spawnY;
    enemy.x = spawnX;
    enemy.y = spawnY;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.health = enemy.maxHealth;
    enemy.invulnerability = 0;
    enemy.flashTimer = 0;
    enemy.shakeTimer = 0;
    enemy.shakeMagnitude = 0;
    enemy.respawnTimer = 0;
    enemy.state = "patrol";
    enemy.stateTimer = 1 + Math.random();
    enemy.patrolRange = { min: spawnX - 100, max: spawnX + 220 };
    enemy.onGround = true;
    enemy.facing = side === 0 ? 1 : -1;
  }
}

function applyEnvironmentSpawn(environment) {
  const spawn = environment?.spawn ?? {};
  const playerX = spawn.player?.x ?? getEnvironmentWidth() * 0.5;
  const poseHeight = getTotalHeight(stickman.currentPose ?? POSES.standing);
  const playerY = spawn.player?.y ?? GROUND_Y - poseHeight;

  stickman.x = playerX;
  stickman.y = playerY;
  stickman.vx = 0;
  stickman.vy = 0;
  stickman.onGround = true;
  stickman.controlMode = "onFoot";
  stickman.vehicleId = null;
  stickman.vehicleCandidateId = null;
  stickman.rollTimer = 0;
  stickman.crouching = false;
  stickman.attacking = false;
  stickman.attackIndex = -1;
  stickman.currentAttack = null;
  stickman.attackElapsed = 0;
  stickman.comboWindowOpen = false;
  stickman.comboWindowTimer = 0;
  stickman.nextAttackQueued = false;
  stickman.hitboxSpawned = false;
  stickman.activeHitboxes.length = 0;
  stickman.deadTimer = 0;
  stickman.health = stickman.maxHealth;
  stickman.structureShieldTimer = 0;
  stickman.structureShieldStrength = 0;
  stickman.invulnerability = 0;

  const offsets = Array.isArray(spawn.squadOffsets) ? spawn.squadOffsets : squadOffsets;
  squadmates.forEach((ally, index) => {
    const offset = offsets[index] ?? (index - 1) * 80;
    const allyX = playerX + offset;
    const allyY = GROUND_Y - getTotalHeight(POSES.standing);
    ally.x = allyX;
    ally.y = allyY;
    ally.vx = 0;
    ally.vy = 0;
    ally.onGround = true;
    ally.state = "follow";
    ally.flashTimer = 0;
    ally.highlight = 0;
    ally.structureShieldTimer = 0;
    ally.structureShieldStrength = 0;
  });

  trainingDummy.x = spawn.trainingDummy?.x ?? getEnvironmentWidth() * 0.75;
  trainingDummy.y = spawn.trainingDummy?.y ?? GROUND_Y - trainingDummy.height;
  trainingDummy.health = trainingDummy.maxHealth;
  trainingDummy.flashTimer = 0;
  trainingDummy.shakeTimer = 0;
  trainingDummy.shakeMagnitude = 0;
  trainingDummy.respawnTimer = 0;

  ensureSandboxEnemies(spawn, playerX);
}

function removeSandboxEnemies() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (enemies[i].spawnContext === "sandbox") {
      enemies.splice(i, 1);
    }
  }
}

function restoreSandboxEnemies() {
  const spawn = getEnvironmentSpawnSettings();
  const playerX = spawn.player?.x ?? getEnvironmentWidth() * 0.5;
  ensureSandboxEnemies(spawn, playerX);
}


onEnvironmentChange((environment) => {
  applyEnvironmentSpawn(environment);
});

export {
  stickman,
  trainingDummy,
  enemies,
  squadmates,
  remotePlayers,
  createGruntEnemy,
  createSquadmate,
  upsertRemotePlayer,
  getRemotePlayers,
  pruneRemotePlayers,
  getTotalHeight,
  removeSandboxEnemies,
  restoreSandboxEnemies
};



