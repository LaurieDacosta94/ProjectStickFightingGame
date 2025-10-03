import { GRAVITY } from "../../config/constants.js";
import { canvas, GROUND_Y } from "../../environment/canvas.js";
import { getEnvironmentWidth } from "../../state/environment.js";
import { stickman, enemies } from "../../state/entities.js";
import { resolvePlatformLanding } from "./arena.js";
import { applyDamageToPlayer } from "../combat/damageHandlers.js";

function updateEnemyAI(enemy, delta) {
  enemy.invulnerability = Math.max(0, enemy.invulnerability - delta);
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
  enemy.stunTimer = Math.max(0, (enemy.stunTimer ?? 0) - delta);
  enemy.smokeSlowTimer = Math.max(0, (enemy.smokeSlowTimer ?? 0) - delta);
  if (enemy.smokeSlowTimer <= 0) {
    enemy.smokeSlowStrength = 1;
  }

  if (enemy.flashTimer > 0) {
    enemy.flashTimer = Math.max(0, enemy.flashTimer - delta);
  }

  if (enemy.shakeTimer > 0) {
    enemy.shakeTimer = Math.max(0, enemy.shakeTimer - delta);
  }

  enemy.shakeMagnitude = Math.max(0, enemy.shakeMagnitude - delta * 20);

  if (enemy.health <= 0) {
    enemy.respawnTimer = Math.max(0, enemy.respawnTimer - delta);
    if (enemy.respawnTimer === 0) {
      enemy.health = enemy.maxHealth;
      enemy.x = enemy.spawnX;
      enemy.y = enemy.spawnY;
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.state = "patrol";
      enemy.stateTimer = 1 + Math.random();
      enemy.attackCooldown = 0.6;
      enemy.onGround = true;
      enemy.stunTimer = 0;
      enemy.smokeSlowTimer = 0;
      enemy.smokeSlowStrength = 1;
    }
    return;
  }

  const targetX = stickman.x;
  const distanceX = targetX - enemy.x;
  const absDistance = Math.abs(distanceX);
  enemy.facing = distanceX >= 0 ? 1 : -1;

  const stunned = enemy.stunTimer > 0;
  const slowMultiplier = enemy.smokeSlowTimer > 0 ? Math.max(0.2, Math.min(1, enemy.smokeSlowStrength ?? 1)) : 1;
  const moveSpeed = enemy.moveSpeed * slowMultiplier;
  const effectiveAggression = enemy.aggressionRange * (enemy.smokeSlowTimer > 0 ? 0.85 : 1);
  const disengageDistance = effectiveAggression * 1.8;
  const shouldChase = !stunned && absDistance < effectiveAggression;

  if (absDistance > disengageDistance) {
    enemy.vx = 0;
    enemy.state = "idle";
    return;
  }

  if (stunned) {
    enemy.state = "stunned";
    enemy.vx = 0;
    enemy.attackWindup = 0;
    enemy.attackActive = 0;
    enemy.stateTimer = Math.max(enemy.stateTimer, enemy.stunTimer);
    enemy.attackCooldown = Math.max(enemy.attackCooldown, enemy.stunTimer + 0.2);
  } else if (enemy.state === "stunned") {
    enemy.state = "idle";
    enemy.stateTimer = 0.6;
  }

  if (!stunned) {
  switch (enemy.state) {
    case "idle":
      enemy.vx = 0;
      enemy.stateTimer -= delta;
      if (enemy.stateTimer <= 0) {
        enemy.state = "patrol";
        enemy.stateTimer = 1.2 + Math.random();
        enemy.facing = Math.random() < 0.5 ? -1 : 1;
      }
      if (shouldChase) {
        enemy.state = "chase";
      }
      break;
    case "patrol":
      enemy.vx = moveSpeed * enemy.facing;
      if (enemy.x <= enemy.patrolRange.min) {
        enemy.facing = 1;
      } else if (enemy.x >= enemy.patrolRange.max) {
        enemy.facing = -1;
      }
      enemy.stateTimer -= delta;
      if (enemy.stateTimer <= 0) {
        enemy.state = "idle";
        enemy.stateTimer = 1 + Math.random();
        enemy.vx = 0;
      }
      if (shouldChase) {
        enemy.state = "chase";
      }
      break;
    case "chase":
      if (!shouldChase) {
        enemy.state = "patrol";
        break;
      }
      const chaseDir = distanceX >= 0 ? 1 : -1;
      enemy.vx = moveSpeed * chaseDir;
      if (absDistance <= enemy.attackRange && enemy.attackCooldown <= 0) {
        enemy.state = "attack-windup";
        enemy.attackWindup = 0.35;
        enemy.attackActive = 0.16;
        enemy.vx = 0;
      }
      break;
    case "attack-windup":
      enemy.vx = 0;
      enemy.attackWindup -= delta;
      if (enemy.attackWindup <= 0) {
        enemy.state = "attack-active";
        enemy.attackActive = 0.16;
      }
      break;
    case "attack-active":
      enemy.vx = moveSpeed * 0.35 * enemy.facing;
      enemy.attackActive -= delta;
      if (enemy.attackActive <= 0) {
        enemy.state = "recover";
        enemy.stateTimer = 0.4;
        enemy.attackCooldown = 1.2;
      }
      break;
    case "recover":
      enemy.vx = 0;
      enemy.stateTimer -= delta;
      if (enemy.stateTimer <= 0) {
        enemy.state = shouldChase ? "chase" : "idle";
        enemy.stateTimer = 0.9 + Math.random() * 0.4;
      }
      break;
    default:
      enemy.vx = 0;
      break;
  }
  }

  const previousY = enemy.y;
  enemy.vy += GRAVITY * delta;
  enemy.x += enemy.vx * delta;
  enemy.y += enemy.vy * delta;
  enemy.onGround = false;

  const landed = resolvePlatformLanding(enemy, previousY, enemy.height);
  if (!landed && enemy.y + enemy.height >= GROUND_Y) {
    enemy.y = GROUND_Y - enemy.height;
    enemy.vy = 0;
    enemy.onGround = true;
  }

  const envWidth = getEnvironmentWidth();
  enemy.x = Math.max(60, Math.min(envWidth - 60, enemy.x));
}

function updateEnemyAttacks(enemy) {
  if (enemy.health <= 0) {
    return;
  }
  if (enemy.state !== "attack-active") {
    return;
  }

  const attackReach = enemy.attackRange + enemy.radius;
  const dx = stickman.x - enemy.x;
  const dy = stickman.y - enemy.y;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq <= attackReach * attackReach) {
    applyDamageToPlayer(enemy);
  }
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    updateEnemyAI(enemy, delta);
  }
  for (const enemy of enemies) {
    updateEnemyAttacks(enemy);
  }
}

export { updateEnemyAI, updateEnemyAttacks, updateEnemies };




