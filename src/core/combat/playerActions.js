import { stickman } from "../../state/entities.js";
import { POSES, ROLL_DURATION } from "../../config/constants.js";
import { getCurrentWeapon } from "./weapons.js";

function determinePose() {
  if (stickman.rolling) {
    return POSES.rolling;
  }
  if (stickman.crouching) {
    return POSES.crouching;
  }
  return POSES.standing;
}

function startRoll(direction) {
  if (stickman.vehicleId) {
    return;
  }
  if (!stickman.onGround || stickman.rolling || stickman.attacking || stickman.health <= 0 || (stickman.stunTimer ?? 0) > 0) {
    return;
  }

  const { left, right } = direction;
  if (left && !right) {
    stickman.facing = -1;
  } else if (right && !left) {
    stickman.facing = 1;
  }

  stickman.rolling = true;
  stickman.rollTimer = ROLL_DURATION;
  stickman.crouching = false;
  stickman.vy = 0;
}

function startAttack(index) {
  const weapon = getCurrentWeapon();
  const attackChain = weapon?.attackChain ?? [];
  const attack = attackChain[index];
  if (!attack) {
    return;
  }

  stickman.attacking = true;
  stickman.attackIndex = index;
  stickman.currentAttack = attack;
  stickman.attackElapsed = 0;
  stickman.comboWindowOpen = false;
  stickman.comboWindowTimer = 0;
  stickman.nextAttackQueued = false;
  stickman.hitboxSpawned = false;
  stickman.attackInstanceId += 1;
}

function attemptAttack() {
  if (stickman.vehicleId) {
    return;
  }
  if (stickman.rolling || stickman.health <= 0 || (stickman.stunTimer ?? 0) > 0 || stickman.reloading) {
    return;
  }

  const weapon = getCurrentWeapon();
  const attackChain = weapon?.attackChain ?? [];
  if (attackChain.length === 0) {
    return;
  }

  if (!stickman.attacking) {
    startAttack(0);
    return;
  }

  if (stickman.comboWindowOpen && stickman.attackIndex + 1 < attackChain.length) {
    stickman.nextAttackQueued = true;
  }
}

function advanceAttack(delta, spawnHitboxFn) {
  if (stickman.vehicleId) {
    stickman.attacking = false;
    stickman.currentAttack = null;
    stickman.attackElapsed = 0;
    stickman.comboWindowOpen = false;
    stickman.comboWindowTimer = 0;
    stickman.hitboxSpawned = false;
    stickman.attackIndex = -1;
    return;
  }
  const attack = stickman.currentAttack;
  if (!attack) {
    return;
  }
  if ((stickman.stunTimer ?? 0) > 0 || stickman.reloading) {
    stickman.attacking = false;
    stickman.currentAttack = null;
    stickman.attackElapsed = 0;
    stickman.comboWindowOpen = false;
    stickman.comboWindowTimer = 0;
    stickman.hitboxSpawned = false;
    return;
  }

  stickman.attackElapsed += delta;

  if (!stickman.hitboxSpawned && stickman.attackElapsed >= attack.windup) {
    spawnHitboxFn(attack);
    stickman.hitboxSpawned = true;
  }

  if (!stickman.comboWindowOpen && stickman.attackElapsed >= attack.comboStart) {
    stickman.comboWindowOpen = true;
    stickman.comboWindowTimer = attack.comboWindow;
  }

  if (stickman.comboWindowOpen) {
    stickman.comboWindowTimer -= delta;
    if (stickman.comboWindowTimer <= 0) {
      stickman.comboWindowOpen = false;
    }
  }

  const weapon = getCurrentWeapon();
  const attackChain = weapon?.attackChain ?? [];

  if (stickman.attackElapsed >= attack.windup + attack.active + attack.recovery) {
    const nextIndex = stickman.attackIndex + 1;
    const shouldChain = stickman.nextAttackQueued && nextIndex < attackChain.length;

    stickman.attacking = false;
    stickman.currentAttack = null;
    stickman.attackElapsed = 0;
    stickman.comboWindowOpen = false;
    stickman.comboWindowTimer = 0;
    stickman.hitboxSpawned = false;
    stickman.nextAttackQueued = false;

    if (shouldChain) {
      startAttack(nextIndex);
    } else {
      stickman.attackIndex = -1;
    }
  }
}

export { determinePose, startRoll, attemptAttack, advanceAttack };
