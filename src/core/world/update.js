import { SPEED, JUMP_SPEED, ROLL_SPEED, GRAVITY, POSES } from "../../config/constants.js";
import { canvas, GROUND_Y } from "../../environment/canvas.js";
import { getEnvironmentWidth, setEnvironment } from "../../state/environment.js";
import { setCameraTargetX, updateCamera } from "../../state/camera.js";
import { setMaterialCount } from "../../state/resources.js";
import { input } from "../input/index.js";
import { stickman, trainingDummy, enemies, getTotalHeight, getRemotePlayers, squadmates } from "../../state/entities.js";
import { determinePose, startRoll, attemptAttack, advanceAttack } from "../combat/playerActions.js";
import { spawnHitbox, updateHitboxes, resolveHitDetection, fireEquippedWeaponProjectile } from "../combat/melee.js";
import { throwEquippedWeapon, updateThrowables } from "../combat/throwables.js";
import { deployGadget, updateGadgets, updateGadgetMovement, clearGadgets } from "../gadgets/index.js";
import { updateTrainingDummy } from "./trainingDummy.js";
import { updateSalvagePickups } from "../resources/index.js";
import { updateSurvival } from "../survival/index.js";
import { updateMassiveCoop } from "../coop/index.js";
import { updateSandboxSkirmish } from "../sandbox/index.js";
import { updateCampaign } from "../campaign/index.js";
import { updateBuildingSystem } from "../building/index.js";
import { updateDamagePopups } from "../effects/damage.js";
import { updateParticles } from "../effects/particles.js";
import { updateLighting } from "../effects/lighting.js";
import { updateEnemies } from "./enemyAI.js";
import { updateProjectiles } from "../combat/projectiles.js";
import { updateVehicles, handleVehicleInteraction, getPlayerVehicle, forcePlayerExitVehicle } from "../vehicles/index.js";
import { updateSupplyDrops } from "./supplyDrops.js";
import { updateDestructibles } from "./destructibles.js";
import { updateInteractables } from "./interactables.js";
import { updateEnemySpawner, spawnEnemies } from "./enemySpawner.js";
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
import { updateAimSystem } from "../aim/index.js";
import { updateLoadoutSystem, isLoadoutEditorVisible } from "../loadout/index.js";
import { updateCosmeticSystem, isCosmeticEditorVisible } from "../cosmetics/index.js";
import { updateScenarioSystem, isScenarioEditorVisible, consumeScenarioApplication, setScenarioRuntimeApplied } from "../scenario/index.js";


function clampPlayerX() {
  const envWidth = getEnvironmentWidth();
  const margin = 40;
  const maxX = Math.max(margin, envWidth - margin);
  stickman.x = Math.max(margin, Math.min(maxX, stickman.x));
}

function clampToArena(value, margin, envWidth) {
  const width = Math.max(1, envWidth ?? getEnvironmentWidth());
  return Math.max(margin, Math.min(width - margin, value));
}

function applyScenarioConfiguration(request) {
  const scenario = request?.scenario;
  if (!scenario) {
    return;
  }

  setEnvironment(scenario.environmentId);
  const envWidth = getEnvironmentWidth();
  const standingHeight = getTotalHeight(POSES.standing);
  const playerX = clampToArena(envWidth * (scenario.playerSpawnRatio ?? 0.5), 40, envWidth);

  stickman.x = playerX;
  stickman.y = GROUND_Y - standingHeight;
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
  stickman.hitboxSpawned = false;
  stickman.activeHitboxes.length = 0;
  stickman.throwCooldown = 0;
  stickman.gadgetCooldown = 0;
  stickman.reloading = false;
  stickman.flashBlindTimer = 0;
  stickman.smokeSlowTimer = 0;
  stickman.smokeSlowStrength = 1;
  stickman.health = stickman.maxHealth;
  stickman.invulnerability = 0;

  const dummyX = clampToArena(envWidth * (scenario.dummySpawnRatio ?? 0.8), 80, envWidth);
  trainingDummy.x = dummyX;
  trainingDummy.y = GROUND_Y - trainingDummy.height;
  trainingDummy.health = trainingDummy.maxHealth;
  trainingDummy.flashTimer = 0;
  trainingDummy.shakeTimer = 0;
  trainingDummy.shakeMagnitude = 0;
  trainingDummy.respawnTimer = 0;

  squadmates.forEach((ally, index) => {
    const offset = -140 + index * 90;
    ally.x = clampToArena(playerX + offset, 60, envWidth);
    ally.y = GROUND_Y - getTotalHeight(POSES.standing);
    ally.vx = 0;
    ally.vy = 0;
    ally.onGround = true;
    ally.state = "follow";
    ally.targetEnemyId = null;
    ally.fireCooldown = 0;
  });

  enemies.length = 0;

  const leftSpawn = clampToArena(envWidth * (scenario.enemySpawnRatios?.[0] ?? 0.25), 40, envWidth);
  const rightSpawn = clampToArena(envWidth * (scenario.enemySpawnRatios?.[1] ?? 0.75), 40, envWidth);
  const spawnPoints = [leftSpawn, rightSpawn];

  setMaterialCount(Math.max(0, scenario.startingMaterials ?? 0));
  setScenarioRuntimeApplied({ scenarioId: scenario.id, spawnOverride: { context: "scenario", points: spawnPoints } });

  const count = Math.max(0, Math.round(scenario.enemyCount ?? 0));
  if (count > 0) {
    spawnEnemies(count, { context: "scenario", autoRespawn: false });
  }
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
    const envWidth = getEnvironmentWidth();
    stickman.x = envWidth * 0.5;
    stickman.y = GROUND_Y - standingHeight;
    stickman.vx = 0;
    stickman.vy = 0;
    stickman.onGround = true;
  }
}

function updateGame(delta) {
  advanceTime(delta);
  updateBuildingSystem(delta);
  updateSalvagePickups(delta);
  updateSurvival(delta);
  updateMassiveCoop(delta);
  updateSandboxSkirmish(delta);
  updateCampaign(delta);
  stickman.invulnerability = Math.max(0, stickman.invulnerability - delta);
  stickman.structureShieldTimer = Math.max(0, (stickman.structureShieldTimer ?? 0) - delta);
  if (stickman.structureShieldTimer <= 0) {
    stickman.structureShieldStrength = 0;
  }
  stickman.throwCooldown = Math.max(0, stickman.throwCooldown - delta);
  stickman.gadgetCooldown = Math.max(0, (stickman.gadgetCooldown ?? 0) - delta);
  stickman.stunTimer = Math.max(0, (stickman.stunTimer ?? 0) - delta);
  stickman.flashBlindTimer = Math.max(0, (stickman.flashBlindTimer ?? 0) - delta);
  stickman.smokeSlowTimer = Math.max(0, (stickman.smokeSlowTimer ?? 0) - delta);
  if (stickman.smokeSlowTimer <= 0) {
    stickman.smokeSlowStrength = 1;
  }

  updateLoadoutSystem(delta);
  updateCosmeticSystem(delta);
  updateScenarioSystem(delta);
  const loadoutMenuOpen = isLoadoutEditorVisible();
  const cosmeticMenuOpen = isCosmeticEditorVisible();
  const scenarioMenuOpen = isScenarioEditorVisible();
  const overlayMenuOpen = loadoutMenuOpen || cosmeticMenuOpen || scenarioMenuOpen;

  const scenarioRequest = consumeScenarioApplication();
  if (scenarioRequest) {
    applyScenarioConfiguration(scenarioRequest);
  }

  const interactRequested = overlayMenuOpen ? false : input.interactBuffered;
  input.interactBuffered = false;
  const squadCycleRequested = overlayMenuOpen ? false : input.squadCommandCycleBuffered;
  const squadSelectRequested = overlayMenuOpen ? null : input.squadCommandSelect;
  const serverBrowserToggleRequested = overlayMenuOpen ? false : input.serverBrowserToggleBuffered;
  const serverBrowserNavigate = overlayMenuOpen ? 0 : input.serverBrowserNavigate;
  const serverBrowserJoinRequested = overlayMenuOpen ? false : input.serverBrowserJoinBuffered;
  const serverBrowserHostRequested = overlayMenuOpen ? false : input.serverBrowserHostBuffered;
  const serverBrowserStopRequested = overlayMenuOpen ? false : input.serverBrowserStopHostBuffered;
  const serverBrowserCopyOfferRequested = overlayMenuOpen ? false : input.serverBrowserCopyOfferBuffered;
  const serverBrowserPasteOfferRequested = overlayMenuOpen ? false : input.serverBrowserPasteOfferBuffered;
  const serverBrowserAcceptAnswerRequested = overlayMenuOpen ? false : input.serverBrowserAcceptAnswerBuffered;
  const serverBrowserCopyCandidatesRequested = overlayMenuOpen ? false : input.serverBrowserCopyCandidatesBuffered;
  const serverBrowserPasteCandidatesRequested = overlayMenuOpen ? false : input.serverBrowserPasteCandidatesBuffered;
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
  input.serverBrowserCopyCandidatesBuffered = false;
  input.serverBrowserPasteCandidatesBuffered = false;

  const rawAttackRequested = !overlayMenuOpen && stickman.health > 0 ? input.attackBuffered : false;
  const rawThrowRequested = !overlayMenuOpen && stickman.health > 0 ? input.throwBuffered : false;
  const rawReloadRequested = !overlayMenuOpen && stickman.health > 0 ? input.reloadBuffered : false;

  input.attackBuffered = false;
  input.throwBuffered = false;
  input.reloadBuffered = false;

  const rollAttempted = overlayMenuOpen ? false : input.roll;
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

  const canAct = !overlayMenuOpen && !inVehicle && stickman.stunTimer <= 0 && !stickman.reloading;

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
  updateInteractables(delta);
  updateEnemySpawner(delta);
  updateServerBrowser(delta, timestampNow);
  updateP2P(delta);
  updateSquadmates(delta);
  for (const ally of squadmates) {
    if (!ally) {
      continue;
    }
    ally.structureShieldTimer = Math.max(0, (ally.structureShieldTimer ?? 0) - delta);
    if (ally.structureShieldTimer <= 0) {
      ally.structureShieldStrength = 0;
    }
  }
  playerVehicle = getPlayerVehicle();
  inVehicle = Boolean(playerVehicle);
  if (inVehicle) {
    stickman.controlMode = "vehicle";
  }

  updateAimSystem(delta);

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

  stickman.fireCooldown = Math.max(0, (stickman.fireCooldown ?? 0) - delta);

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
      const fireInterval = Math.max(weapon.fireInterval ?? 0.26, 0.05);
      const isAutoFire = weapon.auto === true;
      const holdFire = isAutoFire && input.attackDown && canAct;
      if (reloadRequested) {
        if (requestReload(weapon.id)) {
          stickman.attacking = false;
          stickman.currentAttack = null;
          stickman.attackIndex = -1;
        }
      }
      const shouldAttemptShot = (attackRequested || holdFire) && stickman.fireCooldown <= 0;
      if (shouldAttemptShot) {
        const fired = fireEquippedWeaponProjectile();
        if (fired) {
          stickman.fireCooldown = fireInterval;
        }
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
    if (isRangedWeapon) {
      const fireInterval = Math.max(weapon?.fireInterval ?? 0.26, 0.05);
      const isAutoFire = weapon?.auto === true;
      const holdFire = isAutoFire && input.attackDown && canAct;
      const shouldAttemptShot = (attackRequested || holdFire) && stickman.fireCooldown <= 0;
      if (shouldAttemptShot) {
        const fired = fireEquippedWeaponProjectile();
        if (fired) {
          stickman.fireCooldown = fireInterval;
        }
      }
    }
  }

  setCameraTargetX(stickman.x);
  updateCamera(delta);

  updateTrainingDummy(delta);
  updateThrowables(delta);
  updateGadgets(delta);
  updateGadgetMovement(delta);
  updateAmmoTimers(delta, weapon?.id ?? null);
  updateRecoil(delta);
  updateDamagePopups(delta);
  updateParticles(delta);
  updateLighting(delta);
  updatePolishDebug(delta);
  updateProjectiles(delta);
  updateRagdolls(delta, GROUND_Y);
  updateEnemies(delta);
}

export { updateGame };































