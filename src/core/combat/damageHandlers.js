import { stickman, trainingDummy } from "../../state/entities.js";
import { addMaterials } from "../../state/resources.js";
import { SURVIVAL_SETTINGS } from "../../config/survival.js";
import { isSurvivalActive, addSurvivalImmediateReward, incrementSurvivalKills } from "../../state/survival.js";
import { spawnRagdoll } from "../effects/ragdoll.js";
import { spawnDamagePopup } from "../effects/damage.js";
import { spawnBloodSpray, spawnImpactDust } from "../effects/particles.js";
import { clamp } from "../utils/math.js";
import { absorbShieldHit } from "../gadgets/index.js";
import { recordCampaignEnemyDefeated } from "../campaign/index.js";
import { recordSandboxKill } from "../sandbox/index.js";

function applyDamageToDummy(hit) {
  const damage = hit.damage ?? 0;
  const knockback = hit.knockback ?? 0;

  trainingDummy.health = Math.max(0, trainingDummy.health - damage);
  trainingDummy.flashTimer = 0.18;
  trainingDummy.shakeTimer = Math.min(0.4, trainingDummy.shakeTimer + 0.22);
  trainingDummy.shakeMagnitude = Math.min(14, trainingDummy.shakeMagnitude + knockback / 60);

  const popupY = trainingDummy.y + trainingDummy.height * 0.55 - trainingDummy.radius - 12;
  spawnDamagePopup(trainingDummy.x, popupY, damage);

  if (damage > 0) {
    const burstY = trainingDummy.y + trainingDummy.height * 0.55;
    spawnImpactDust({
      x: trainingDummy.x,
      y: burstY,
      amount: Math.round(6 + damage * 0.3),
      palette: ["#f2dfc6", "#d1b18b", "#9f7f59"],
      speed: 150 + knockback * 0.4,
      spread: Math.PI * 0.8,
      angle: Math.PI * 1.5,
      radius: 10
    });
  }

  if (trainingDummy.health === 0 && trainingDummy.respawnTimer <= 0) {
    trainingDummy.respawnTimer = 2.5;
  }
}


function applyDamageToEnemy(enemy, hit) {
  if (enemy.health <= 0 || enemy.invulnerability > 0) {
    return;
  }

  const damage = hit.damage ?? 0;
  const knockback = hit.knockback ?? 0;
  const launch = hit.launch ?? 0;
  const facing = hit.facing ?? stickman.facing;

  enemy.health = Math.max(0, enemy.health - damage);
  enemy.flashTimer = 0.18;
  enemy.shakeTimer = Math.min(0.5, enemy.shakeTimer + 0.24);
  enemy.shakeMagnitude = Math.min(18, enemy.shakeMagnitude + knockback / 55);
  enemy.vx += knockback * facing * 0.35;
  if (launch > 0) {
    enemy.vy -= launch * 0.3;
  }


if (damage > 0) {
  const impactX = enemy.x + (enemy.radius ?? 24) * 0.6 * facing;
  const impactY = enemy.y + (enemy.height ?? 120) * 0.42;
  const maxHealth = enemy.baseStats?.maxHealth ?? enemy.maxHealth ?? 100;
  spawnBloodSpray({
    x: impactX,
    y: impactY,
    facing,
    damage,
    maxDamage: maxHealth,
    amount: Math.round(7 + Math.min(18, damage * 0.5)),
    intensity: clamp(damage / Math.max(1, maxHealth))
  });
}

  spawnDamagePopup(enemy.x + enemy.facing * 14, enemy.y - 14, damage);
  enemy.invulnerability = 0.15;

if (enemy.health === 0) {
  spawnBloodSpray({
    x: enemy.x,
    y: enemy.y + (enemy.height ?? 120) * 0.4,
    facing,
    amount: Math.round(12 + Math.min(24, damage)),
    intensity: 0.85,
    damage: damage * 1.5,
    maxDamage: enemy.baseStats?.maxHealth ?? enemy.maxHealth ?? 100
  });
    if (enemy.respawnTimer <= 0) {
      spawnRagdoll("enemy", enemy.x, enemy.y, facing, enemy.vx, enemy.vy);
    }
    enemy.state = "defeated";
    enemy.attackCooldown = 1.2;
    enemy.respawnTimer = 3;
    recordCampaignEnemyDefeated(enemy);
    recordSandboxKill(enemy);
    if (isSurvivalActive()) {
      const killReward = SURVIVAL_SETTINGS.killReward ?? 0;
      incrementSurvivalKills(1);
      if (killReward > 0) {
        addSurvivalImmediateReward(killReward);
        addMaterials(killReward);
      }
    }
  }
}

function applyDamageToPlayer(enemy, hit) {
  if (stickman.invulnerability > 0 || stickman.health <= 0) {
    return;
  }

  const baseDamage = hit?.damage ?? enemy.attackDamage ?? 0;
  const baseKnockback = hit?.knockback ?? enemy.attackKnockback ?? 0;
  const baseLaunch = hit?.launch ?? enemy.attackLaunch ?? 0;
  const facing = hit?.facing ?? enemy.facing ?? 1;

  let adjustedHit = absorbShieldHit({
    damage: baseDamage,
    knockback: baseKnockback,
    launch: baseLaunch,
    facing
  });

  let finalDamage = adjustedHit?.damage ?? 0;
  let finalKnockback = adjustedHit?.knockback ?? baseKnockback;
  let finalLaunch = adjustedHit?.launch ?? baseLaunch;
  const finalFacing = adjustedHit?.facing ?? facing;

  const shieldReduction = Math.max(0, Math.min(0.9, stickman.structureShieldStrength ?? 0));
  if (shieldReduction > 0) {
    finalDamage *= 1 - shieldReduction;
    finalKnockback *= 1 - shieldReduction * 0.5;
    finalLaunch *= 1 - shieldReduction * 0.5;
  }

  if (finalDamage > 0) {
    stickman.health = Math.max(0, stickman.health - finalDamage);
    stickman.invulnerability = 0.6;
  } else {
    stickman.invulnerability = Math.max(stickman.invulnerability, 0.2);
  }

  stickman.vx += finalKnockback * finalFacing;
  stickman.vy += finalLaunch;
spawnDamagePopup(stickman.x, stickman.y + 10, Math.max(0, Math.round(finalDamage)));

if (finalDamage > 0) {
  const impactY = stickman.y + (stickman.currentPose?.bodyLength ?? 34);
  spawnBloodSpray({
    x: stickman.x + (stickman.currentPose?.headRadius ?? 16) * 0.4 * finalFacing,
    y: impactY,
    facing: finalFacing,
    damage: finalDamage,
    maxDamage: stickman.maxHealth ?? 100,
    amount: Math.round(8 + Math.min(20, finalDamage * 0.8)),
    intensity: clamp(finalDamage / Math.max(1, stickman.maxHealth ?? 100))
  });
}

  if (finalDamage > 0 && stickman.health === 0 && stickman.deadTimer <= 0) {
    stickman.deadTimer = 2.6;
    stickman.attacking = false;
    stickman.activeHitboxes = [];
    stickman.comboWindowOpen = false;
    stickman.attackIndex = -1;
    stickman.rolling = false;
    spawnRagdoll("player", stickman.x, stickman.y, -finalFacing, stickman.vx, stickman.vy);
  }
}

export { applyDamageToDummy, applyDamageToEnemy, applyDamageToPlayer };






