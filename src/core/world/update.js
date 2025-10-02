import { SPEED, JUMP_SPEED, ROLL_SPEED, GRAVITY, POSES } from "../../config/constants.js";
import { canvas, GROUND_Y } from "../../environment/canvas.js";
import { input } from "../input/index.js";
import { stickman, trainingDummy, enemies, getTotalHeight, getRemotePlayers, squadmates } from "../../state/entities.js";
import { determinePose, startRoll, attemptAttack, advanceAttack } from "../combat/playerActions.js";
import { spawnHitbox, updateHitboxes, resolveHitDetection, fireEquippedWeaponProjectile } from "../combat/melee.js";
import { throwEquippedWeapon, updateThrowables } from "../combat/throwables.js";
import { deployGadget, updateGadgets, updateGadgetMovement, clearGadgets } from "../gadgets/index.js";
import { updateTrainingDummy } from "./trainingDummy.js";
import { updateDamagePopups } from "../effects/damage.js";
import { updateParticles } from "../effects/particles.js";
import { updateEnemies } from "./enemyAI.js";
import { updateProjectiles } from "../combat/projectiles.js";
import { updateVehicles, handleVehicleInteraction, getPlayerVehicle, forcePlayerExitVehicle } from "../vehicles/index.js";
import { updateSupplyDrops } from "./supplyDrops.js";
import { updateDestructibles } from "./destructibles.js";
import { updateEnemySpawner } from "./enemySpawner.js";
import { updateServerBrowser, showServerBrowser, hideServerBrowser, selectNext as selectServerBrowser, attemptJoinSession, getServerBrowserState, setHostingMetrics, attemptHostSession, attemptStopHosting, copyHostOffer, promptForHostOffer, promptForJoinerAnswer, copyLocalCandidates, promptForRemoteCandidates } from "../network/serverBrowser.js";
import { updateP2P } from "../network/p2p.js";
import { updateSquadmates, cycleSquadCommand, setSquadCommandById } from "../squad/index.js";
import { updateRagdolls } from "../effects/ragdoll.js";
import { updatePolishDebug } from "../events/polishDebug.js";
import { resolvePlatformLanding } from "./arena.js";
import { advanceTime } from "../utils/time.js";
import { getCurrentWeapon } from "../combat/weapons.js";
import { updateRecoil } from "../../state/recoil.js";
import { updateAmmoTimers, getAmmoStatus, startReload as requestReload } from "../../state/ammo.js";

function clampPlayerX() {
  stickman.x = Math.max(40, Math.min(canvas.width - 40, stickman.x));
}

function updatePlayerAlive(delta) {
  if (stickman.vehicleId) {
    return;
  }

  stickman.crouching = input.down && stickman.onGround && !stickman.rolling && !stickman.attacking;

  if (stickman.rolling) {
    stickman.vx = stickman.facing * ROLL_SPEED;
    stickman.vy = 0;
    stickman.rollTimer -= delta;
    if (stickman.rollTimer <= 0) {
      stickman.rolling = false;
    }
  } else {
    let moveSpeed = SPEED;
    if (stickman.crouching) {
      moveSpeed *= 0.55;
    }
    if (stickman.attacking) {
      moveSpeed *= 0.7;
    }
    if (stickman.reloading) {
      moveSpeed *= 0.8;
    }
    if (stickman.smokeSlowTimer > 0) {
      const slowFactor = stickman.smokeSlowStrength ?? 0.6;
      moveSpeed *= Math.max(0.1, Math.min(1, slowFactor));
    }
    if (stickman.stunTimer > 0) {
      moveSpeed *= 0.25;
    }

    stickman.vx = 0;
    if (input.left) {
      stickman.vx -= moveSpeed;
      stickman.facing = -1;
    }
    if (input.right) {
      stickman.vx += moveSpeed;
      stickman.facing = 1;
    }

    const canJump = stickman.stunTimer <= 0;
    if (stickman.onGround && canJump && input.jump && !stickman.crouching && !stickman.attacking) {
      stickman.vy = -JUMP_SPEED;
      stickman.onGround = false;
    }

    stickman.vy += GRAVITY * delta;
  }

  const previousY = stickman.y;
  stickman.x += stickman.vx * delta;
  stickman.y += stickman.vy * delta;
  stickman.onGround = false;

  const standingHeight = getTotalHeight(POSES.standing);
  const landedPlatform = resolvePlatformLanding(stickman, previousY, standingHeight);

  if (!landedPlatform) {
    const feetY = stickman.y + standingHeight;
    if (feetY >= GROUND_Y) {
      stickman.y = GROUND_Y - standingHeight;
      stickman.vy = 0;
      stickman.onGround = true;
    }
  }

  clampPlayerX();
}

function updatePlayerInVehicle() {
  const vehicle = getPlayerVehicle();
  if (!vehicle) {
    stickman.vehicleId = null;
    stickman.controlMode = "onFoot";
    return;
  }
  stickman.controlMode = "vehicle";
  stickman.crouching = false;
  stickman.rolling = false;
  stickman.onGround = vehicle.onGround || vehicle.waterLineY != null;
}


function updatePlayerDead(delta) {
  const standingHeight = getTotalHeight(POSES.standing);
  stickman.vehicleId = null;
  stickman.controlMode = "onFoot";
  stickman.vehicleCandidateId = null;
  stickman.deadTimer = Math.max(0, stickman.deadTimer - delta);
  stickman.vx *= 0.9;
  stickman.vy += GRAVITY * delta;
  stickman.x += stickman.vx * delta;
  stickman.y += stickman.vy * delta;

  const feetY = stickman.y + standingHeight;
  if (feetY >= GROUND_Y) {
    stickman.y = GROUND_Y - standingHeight;
    stickman.vy = 0;
    stickman.onGround = true;
  }

  clampPlayerX();

  if (stickman.deadTimer === 0) {
    stickman.health = stickman.maxHealth;
    stickman.invulnerability = 1.2;
    stickman.throwCooldown = 0;
    stickman.gadgetCooldown = 0;
    stickman.reloading = false;
    stickman.stunTimer = 0;
    stickman.flashBlindTimer = 0;
    stickman.smokeSlowTimer = 0;
    stickman.smokeSlowStrength = 1;
    clearGadgets();
    stickman.x = canvas.width * 0.5;
    stickman.y = GROUND_Y - standingHeight;
    stickman.vx = 0;
    stickman.vy = 0;
    stickman.onGround = true;
  }
}

function updateGame(delta) {
  advanceTime(delta);
  stickman.invulnerability = Math.max(0, stickman.invulnerability - delta);
  stickman.throwCooldown = Math.max(0, stickman.throwCooldown - delta);
  stickman.gadgetCooldown = Math.max(0, (stickman.gadgetCooldown ?? 0) - delta);
  stickman.stunTimer = Math.max(0, (stickman.stunTimer ?? 0) - delta);
  stickman.flashBlindTimer = Math.max(0, (stickman.flashBlindTimer ?? 0) - delta);
  stickman.smokeSlowTimer = Math.max(0, (stickman.smokeSlowTimer ?? 0) - delta);
  if (stickman.smokeSlowTimer <= 0) {
    stickman.smokeSlowStrength = 1;
  }

  const interactRequested = input.interactBuffered;
  input.interactBuffered = false;
  const squadCycleRequested = input.squadCommandCycleBuffered;
  const squadSelectRequested = input.squadCommandSelect;
  const serverBrowserToggleRequested = input.serverBrowserToggleBuffered;
  const serverBrowserNavigate = input.serverBrowserNavigate;
  const serverBrowserJoinRequested = input.serverBrowserJoinBuffered;
  const serverBrowserHostRequested = input.serverBrowserHostBuffered;
  const serverBrowserStopRequested = input.serverBrowserStopHostBuffered;
  const serverBrowserCopyOfferRequested = input.serverBrowserCopyOfferBuffered;
  const serverBrowserPasteOfferRequested = input.serverBrowserPasteOfferBuffered;
  const serverBrowserAcceptAnswerRequested = input.serverBrowserAcceptAnswerBuffered;
  const serverBrowserCopyCandidatesRequested = input.serverBrowserCopyCandidatesBuffered;
  const serverBrowserPasteCandidatesRequested = input.serverBrowserPasteCandidatesBuffered;
  input.squadCommandCycleBuffered = false;
  input.squadCommandSelect = null;
  input.serverBrowserToggleBuffered = false;
  input.serverBrowserNavigate = 0;
  input.serverBrowserJoinBuffered = false;
  input.serverBrowserHostBuffered = false;
  input.serverBrowserStopHostBuffered = false;
  input.serverBrowserCopyOfferBuffered = false;
  input.serverBrowserPasteOfferBuffered = false;
  input.serverBrowserAcceptAnswerBuffered = false;

  const rawAttackRequested = stickman.health > 0 ? input.attackBuffered : false;
  const rawThrowRequested = stickman.health > 0 ? input.throwBuffered : false;
  const rawReloadRequested = stickman.health > 0 ? input.reloadBuffered : false;

  input.attackBuffered = false;
  input.throwBuffered = false;
  input.reloadBuffered = false;

  const rollAttempted = input.roll;
  input.roll = false;

  handleVehicleInteraction(interactRequested);
  if (squadCycleRequested) {
    cycleSquadCommand();
  }
  if (squadSelectRequested) {
    setSquadCommandById(squadSelectRequested);
  }
  if (serverBrowserToggleRequested) {
    const state = getServerBrowserState();
    if (state.visible) {
      hideServerBrowser();
    } else {
      showServerBrowser();
    }
  }
  if (serverBrowserNavigate !== 0) {
    const state = getServerBrowserState();
    if (state.visible) {
      selectServerBrowser(serverBrowserNavigate);
    }
  }
  if (serverBrowserJoinRequested) {
    const state = getServerBrowserState();
    const selectedServer = state.visible ? state.servers[state.selectedIndex] : null;
    if (selectedServer) {
      attemptJoinSession(selectedServer).catch((error) => console.warn("Join failed", error));
    }
  }
  if (serverBrowserHostRequested) {
    const state = getServerBrowserState();
    if (state.visible) {
      attemptHostSession().catch((error) => console.warn("Host failed", error));
    }
  }
  if (serverBrowserStopRequested) {
    const state = getServerBrowserState();
    if (state.visible) {
      attemptStopHosting().catch((error) => console.warn("Stop hosting failed", error));
    }
  }
  if (serverBrowserCopyOfferRequested) {
    const state = getServerBrowserState();
    if (state.visible && state.hosting) {
      copyHostOffer({ forceRegenerate: false, silent: false }).catch((error) => console.warn("Offer copy failed", error));
    }
  }
  if (serverBrowserPasteOfferRequested) {
    const state = getServerBrowserState();
    if (state.visible) {
      promptForHostOffer().catch((error) => console.warn("Offer accept failed", error));
    }
  }
  if (serverBrowserAcceptAnswerRequested) {
    const state = getServerBrowserState();
    if (state.visible && state.hosting) {
      promptForJoinerAnswer().catch((error) => console.warn("Answer apply failed", error));
    }
  }
  if (serverBrowserCopyCandidatesRequested) {
    const state = getServerBrowserState();
    if (state.visible && state.hosting) {
      copyLocalCandidates({ silent: false }).catch((error) => console.warn("Candidate copy failed", error));
    }
  }
  if (serverBrowserPasteCandidatesRequested) {
    const state = getServerBrowserState();
    if (state.visible) {
      promptForRemoteCandidates().catch((error) => console.warn("Candidate apply failed", error));
    }
  }
  let playerVehicle = getPlayerVehicle();
  let inVehicle = Boolean(playerVehicle);

  if (stickman.health <= 0 && inVehicle) {
    forcePlayerExitVehicle({ preferDirection: playerVehicle?.facing });
    playerVehicle = null;
    inVehicle = false;
  }

  if (rollAttempted && stickman.health > 0 && !inVehicle) {
    startRoll({ left: input.left, right: input.right });
  }

  if (!inVehicle && stickman.controlMode === "vehicle") {
    stickman.controlMode = "onFoot";
  }

  const canAct = !inVehicle && stickman.stunTimer <= 0 && !stickman.reloading;

  const attackRequested = canAct ? rawAttackRequested : false;
  const throwRequested = canAct ? rawThrowRequested : false;
  const reloadRequested = canAct ? rawReloadRequested : false;

  if (stickman.health > 0) {
    if (inVehicle) {
      updatePlayerInVehicle();
    } else {
      updatePlayerAlive(delta);
    }
  } else {
    updatePlayerDead(delta);
  }

  stickman.currentPose = determinePose();
  const baseHeight = getTotalHeight(stickman.currentPose);

  const remotePlayerCount = getRemotePlayers().length;
  const aliveEnemies = enemies.reduce((count, enemy) => count + (enemy.health > 0 ? 1 : 0), 0);
  const activeAllies = squadmates.reduce((count, ally) => count + (ally && ally.state !== "defeated" ? 1 : 0), 0);
  setHostingMetrics({
    playerCount: 1 + remotePlayerCount,
    enemyCount: aliveEnemies,
    alliesCount: activeAllies
  });

  const timestampNow = typeof performance !== "undefined" ? performance.now() : Date.now();
  updateVehicles(delta);
  updateSupplyDrops(delta);
  updateDestructibles(delta);
  updateEnemySpawner(delta);
  updateServerBrowser(delta, timestampNow);
  updateP2P(delta);
  updateSquadmates(delta);
  playerVehicle = getPlayerVehicle();
  inVehicle = Boolean(playerVehicle);
  if (inVehicle) {
    stickman.controlMode = "vehicle";
  }

  if (!canAct) {
    stickman.attacking = false;
    stickman.currentAttack = null;
    stickman.attackElapsed = 0;
    stickman.comboWindowOpen = false;
    stickman.comboWindowTimer = 0;
    stickman.nextAttackQueued = false;
    stickman.hitboxSpawned = false;
    stickman.attackIndex = -1;
    stickman.activeHitboxes.length = 0;
  }

  const weapon = getCurrentWeapon();
  const weaponCategory = weapon?.category ?? "";
  const attackChain = weapon?.attackChain ?? [];
  const hasMeleeChain = attackChain.length > 0;
  const isRangedWeapon = weaponCategory.startsWith("ranged");
  const isThrowableWeapon = weaponCategory === "throwable";
  const isGadgetWeapon = weaponCategory === "gadget";

  if (isGadgetWeapon) {
    if (attackRequested || throwRequested) {
      deployGadget(weapon);
    }
    stickman.activeHitboxes.length = 0;
  } else if (isThrowableWeapon) {
    if (attackRequested || throwRequested) {
      throwEquippedWeapon();
    }
    stickman.activeHitboxes.length = 0;
  } else if (isRangedWeapon && !hasMeleeChain) {
    stickman.activeHitboxes.length = 0;
    if (weapon) {
      const ammoStatus = getAmmoStatus(weapon.id);
      if (reloadRequested) {
        if (requestReload(weapon.id)) {
          stickman.attacking = false;
          stickman.currentAttack = null;
          stickman.attackIndex = -1;
        }
      }
      if (attackRequested) {
        fireEquippedWeaponProjectile();
      }
      if (ammoStatus && ammoStatus.magazine <= 0 && ammoStatus.reserve > 0 && !ammoStatus.reloading) {
        requestReload(weapon.id);
      }
    }
  } else if (hasMeleeChain) {
    if (attackRequested) {
      attemptAttack();
    }

    if (stickman.attacking) {
      advanceAttack(delta, spawnHitbox);
    }

    updateHitboxes(delta, baseHeight);
    resolveHitDetection();
  } else {
    stickman.activeHitboxes.length = 0;
    if (isRangedWeapon && attackRequested) {
      fireEquippedWeaponProjectile();
    }
  }

  updateTrainingDummy(delta);
  updateThrowables(delta);
  updateGadgets(delta);
  updateGadgetMovement(delta);
  updateAmmoTimers(delta, weapon?.id ?? null);
  updateRecoil(delta);
  updateDamagePopups(delta);
  updateParticles(delta);
  updatePolishDebug(delta);
  updateProjectiles(delta);
  updateRagdolls(delta, GROUND_Y);
  updateEnemies(delta);
}

export { updateGame };















