import { context, GROUND_Y } from "../../environment/canvas.js";
import { POSES, SPEED } from "../../config/constants.js";
import { stickman, trainingDummy, enemies, squadmates, getRemotePlayers } from "../../state/entities.js";
import { getServerBrowserState } from "../../state/serverBrowser.js";
import { vehicles, VEHICLE_DEFINITIONS, getVehicleById } from "../../state/vehicles.js";
import { clamp } from "../utils/math.js";
import { getElapsedTime } from "../utils/time.js";
import { getCurrentWeapon, getWeaponSlots } from "../combat/weapons.js";
import { getAmmoStatus } from "../../state/ammo.js";
import { drawProjectiles } from "../combat/projectiles.js";
import { drawThrowables } from "../combat/throwables.js";
import { drawGadgets, getGadgetStatus } from "../gadgets/index.js";
import { drawSupplyDrops } from "./supplyDrops.js";
import { drawDestructibles } from "./destructibles.js";
import { drawParticles } from "../effects/particles.js";
import { getPolishDebugState } from "../events/polishDebug.js";
import { getRecoilOffset } from "../../state/recoil.js";
import { getSupplyDropStatus } from "../world/supplyDrops.js";
import { getP2PStatus } from "../network/p2p.js";
import { getSquadStatus } from "../squad/index.js";
import { getPlayerVehicle } from "../vehicles/index.js";

function drawBackground() {
  const skyGradient = context.createLinearGradient(0, 0, 0, context.canvas.height);
  skyGradient.addColorStop(0, "#111a2c");
  skyGradient.addColorStop(0.4, "#182439");
  skyGradient.addColorStop(0.75, "#1f2d44");
  skyGradient.addColorStop(1, "#232f49");
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);

  // distant skyline
  context.fillStyle = "#1a2437";
  context.beginPath();
  context.moveTo(0, GROUND_Y - 220);
  context.lineTo(220, GROUND_Y - 260);
  context.lineTo(420, GROUND_Y - 210);
  context.lineTo(640, GROUND_Y - 280);
  context.lineTo(820, GROUND_Y - 230);
  context.lineTo(1040, GROUND_Y - 260);
  context.lineTo(1220, GROUND_Y - 210);
  context.lineTo(1380, GROUND_Y - 260);
  context.lineTo(context.canvas.width, GROUND_Y - 200);
  context.lineTo(context.canvas.width, GROUND_Y);
  context.lineTo(0, GROUND_Y);
  context.closePath();
  context.fill();

  // far water sheen behind coastline
  const horizon = context.createLinearGradient(0, GROUND_Y - 120, 0, GROUND_Y - 40);
  horizon.addColorStop(0, "rgba(46, 86, 126, 0.25)");
  horizon.addColorStop(1, "rgba(28, 52, 84, 0)");
  context.fillStyle = horizon;
  context.fillRect(0, GROUND_Y - 140, context.canvas.width, 120);

  context.fillStyle = "#1b2231";
  context.fillRect(0, GROUND_Y, context.canvas.width, context.canvas.height - GROUND_Y);
}

function drawVehicles() {
  const playerVehicle = getPlayerVehicle();
  const candidateId = stickman.vehicleCandidateId;

  for (const vehicle of vehicles) {
    const definition = VEHICLE_DEFINITIONS[vehicle.type];
    if (!definition) {
      continue;
    }

    const isPlayerVehicle = playerVehicle?.id === vehicle.id;
    const isCandidate = !isPlayerVehicle && candidateId === vehicle.id;
    const bodyWidth = definition.width ?? 120;
    const bodyHeight = definition.height ?? 48;
    const bodyColor = definition.colorBody ?? "#2c3245";
    const accentColor = definition.colorAccent ?? "#f0b239";

    context.save();
    context.translate(vehicle.x, vehicle.y);
    context.rotate(((vehicle.tilt ?? 0) * Math.PI) / 180);

    context.fillStyle = bodyColor;
    context.fillRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight);

    context.fillStyle = accentColor;
    context.fillRect(-bodyWidth / 2, -bodyHeight / 2 - 6, bodyWidth * 0.6, 8);

    context.restore();

    if (isPlayerVehicle || isCandidate) {
      context.save();
      context.lineWidth = isPlayerVehicle ? 4 : 3;
      context.strokeStyle = isPlayerVehicle ? "#8cffd4" : "#ffc66d";
      context.setLineDash(isPlayerVehicle ? [] : [8, 8]);
      context.strokeRect(
        vehicle.x - bodyWidth / 2 - 10,
        vehicle.y - bodyHeight / 2 - 12,
        bodyWidth + 20,
        bodyHeight + 24
      );
      context.restore();
    }
  }
}

function drawRemotePlayers() {
  const players = getRemotePlayers();
  for (const remote of players) {
    const pose = POSES.standing;
    const headRadius = pose.headRadius;
    const bodyLength = pose.bodyLength;
    const legLength = pose.legLength;
    const armLength = pose.armLength;
    context.save();
    context.strokeStyle = "#ff9cf7";
    context.lineWidth = 4;
    const headCenterY = remote.y + headRadius;
    context.beginPath();
    context.arc(remote.x, headCenterY, headRadius, 0, Math.PI * 2);
    context.stroke();
    const neckY = remote.y + headRadius * 2;
    const torsoBottomY = neckY + bodyLength;
    context.beginPath();
    context.moveTo(remote.x, neckY);
    context.lineTo(remote.x, torsoBottomY);
    context.stroke();
    context.beginPath();
    context.moveTo(remote.x, neckY + 4);
    context.lineTo(remote.x - armLength, neckY + armLength * 0.8);
    context.moveTo(remote.x, neckY + 4);
    context.lineTo(remote.x + armLength, neckY + armLength * 0.6);
    context.stroke();
    const legReach = Math.max(armLength * 0.7, 14);
    const leftFootY = Math.min(GROUND_Y, torsoBottomY + legLength);
    const rightFootY = Math.min(GROUND_Y, torsoBottomY + legLength * 0.95);
    context.beginPath();
    context.moveTo(remote.x, torsoBottomY);
    context.lineTo(remote.x - legReach, leftFootY);
    context.moveTo(remote.x, torsoBottomY);
    context.lineTo(remote.x + legReach, rightFootY);
    context.stroke();
    context.fillStyle = "#ffd6ff";
    context.font = "13px 'Segoe UI', Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(remote.name ?? remote.id ?? "Peer", remote.x, remote.y - 16);
    context.restore();
  }
}

function drawSquadmates() {
  const squadStatus = getSquadStatus();
  const commandId = squadStatus?.command?.id ?? "hold";
  const commandColors = {
    hold: "#8cffd4",
    defend: "#66b3ff",
    attack: "#ff9f7a",
    flank: "#ffdd6f"
  };
  for (const ally of squadmates) {
    const pose = POSES.standing;
    const headRadius = pose.headRadius;
    const bodyLength = pose.bodyLength;
    const legLength = pose.legLength;
    const armLength = pose.armLength;

    context.save();
    const outline = commandColors[commandId] ?? "#8cffd4";
    context.strokeStyle = outline;
    context.lineWidth = 4;
    context.lineCap = "round";

    const headCenterY = ally.y + headRadius;
    context.beginPath();
    context.arc(ally.x, headCenterY, headRadius, 0, Math.PI * 2);
    context.stroke();

    const neckY = ally.y + headRadius * 2;
    const torsoBottomY = neckY + bodyLength;
    context.beginPath();
    context.moveTo(ally.x, neckY);
    context.lineTo(ally.x, torsoBottomY);
    context.stroke();

    context.beginPath();
    context.moveTo(ally.x, neckY + 4);
    context.lineTo(ally.x - armLength, neckY + armLength * 0.8);
    context.moveTo(ally.x, neckY + 4);
    context.lineTo(ally.x + armLength, neckY + armLength * 0.6);
    context.stroke();

    const legReach = Math.max(armLength * 0.7, 14);
    const leftFootY = Math.min(GROUND_Y, torsoBottomY + legLength);
    const rightFootY = Math.min(GROUND_Y, torsoBottomY + legLength * 0.95);

    context.beginPath();
    context.moveTo(ally.x, torsoBottomY);
    context.lineTo(ally.x - legReach, leftFootY);
    context.moveTo(ally.x, torsoBottomY);
    context.lineTo(ally.x + legReach, rightFootY);
    context.stroke();

    if ((ally.flashTimer ?? 0) > 0) {
      const alpha = Math.min(1, ally.flashTimer / 0.12);
      context.fillStyle = `rgba(140, 255, 212, ${alpha})`;
      context.beginPath();
      context.arc(ally.x + ally.facing * 30, neckY + armLength * 0.2, 12, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = outline;
    context.font = "14px 'Segoe UI', Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(ally.name ?? "Ally", ally.x, ally.y - 12);
    context.restore();
  }
}

function drawStickman() {
  if (stickman.health <= 0 || stickman.vehicleId) {
    return;
  }

  const pose = stickman.currentPose || POSES.standing;
  const attack = stickman.currentAttack;
  const { headRadius, bodyLength, legLength, armLength, strideMultiplier, armSwingAmplitude, legSwingAmplitude } = pose;
  const elapsed = getElapsedTime();

  const baseStride = Math.min(1, Math.abs(stickman.vx) / SPEED);
  const strideStrength = baseStride * strideMultiplier;

  let swing = Math.sin(elapsed * 8) * armSwingAmplitude * strideStrength;
  if (stickman.attacking && attack) {
    const totalDuration = attack.windup + attack.active + attack.recovery;
    const progress = clamp(stickman.attackElapsed / totalDuration, 0, 1);
    swing += Math.sin(progress * Math.PI) * 28 * stickman.facing;
  }

  context.lineWidth = 4;
  context.strokeStyle = "#f4f7ff";
  context.lineCap = "round";

  const headCenterY = stickman.y + headRadius;
  context.beginPath();
  context.arc(stickman.x, headCenterY, headRadius, 0, Math.PI * 2);
  context.stroke();

  const neckY = stickman.y + headRadius * 2;
  const torsoBottomY = neckY + bodyLength;
  context.beginPath();
  context.moveTo(stickman.x, neckY);
  context.lineTo(stickman.x, torsoBottomY);
  context.stroke();

  context.beginPath();
  context.moveTo(stickman.x, neckY + 6);
  context.lineTo(stickman.x - armLength, neckY + armLength + swing);
  context.moveTo(stickman.x, neckY + 6);
  context.lineTo(stickman.x + armLength, neckY + armLength - swing);
  context.stroke();

  const phaseOffset = Math.PI / 2;
  const legSwingBase = Math.sin(elapsed * 8 + phaseOffset) * legSwingAmplitude * strideStrength;
  const legReach = Math.max(armLength * 0.7, 14);
  const leftFootY = Math.min(GROUND_Y, torsoBottomY + legLength + legSwingBase);
  const rightFootY = Math.min(GROUND_Y, torsoBottomY + legLength - legSwingBase);

  context.beginPath();
  context.moveTo(stickman.x, torsoBottomY);
  context.lineTo(stickman.x - legReach, leftFootY);
  context.moveTo(stickman.x, torsoBottomY);
  context.lineTo(stickman.x + legReach, rightFootY);
  context.stroke();

  if (stickman.rolling) {
    context.strokeStyle = "#9aa2b1";
    context.beginPath();
    context.arc(stickman.x, torsoBottomY - legLength * 0.5, headRadius + 4, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = "#f4f7ff";
  }
}

function drawHitboxes() {
  for (const hitbox of stickman.activeHitboxes) {
    const alpha = clamp(hitbox.remaining / hitbox.duration, 0, 1);
    context.fillStyle = `rgba(255, 153, 102, ${0.2 * alpha})`;
    context.beginPath();
    context.arc(hitbox.x, hitbox.y, hitbox.radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = `rgba(255, 198, 141, ${alpha})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(hitbox.x, hitbox.y, hitbox.radius, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawTrainingDummy() {
  const dummy = trainingDummy;
  const elapsed = getElapsedTime();
  const headRadius = 20;
  const topY = dummy.y;
  const shake = dummy.shakeTimer > 0 ? Math.sin(elapsed * 40) * dummy.shakeMagnitude * clamp(dummy.shakeTimer / 0.4, 0, 1) : 0;
  const offsetX = dummy.health > 0 ? shake : 0;
  const bodyColor = dummy.health > 0 ? (dummy.flashTimer > 0 ? "#ffe3af" : "#9ca4b8") : "#3b3f49";

  context.lineWidth = 5;
  context.strokeStyle = bodyColor;
  context.lineCap = "round";

  const centerX = dummy.x + offsetX;
  context.beginPath();
  context.arc(centerX, topY + headRadius, headRadius, 0, Math.PI * 2);
  context.stroke();

  context.beginPath();
  context.moveTo(centerX, topY + headRadius * 2);
  context.lineTo(centerX, GROUND_Y - headRadius);
  context.stroke();

  context.beginPath();
  context.moveTo(centerX, GROUND_Y - headRadius);
  context.lineTo(centerX - 28, GROUND_Y);
  context.moveTo(centerX, GROUND_Y - headRadius);
  context.lineTo(centerX + 28, GROUND_Y);
  context.stroke();

  const armY = topY + headRadius * 2.4;
  context.beginPath();
  context.moveTo(centerX, armY);
  context.lineTo(centerX - 36, armY + 18);
  context.moveTo(centerX, armY);
  context.lineTo(centerX + 36, armY + 18);
  context.stroke();

  const barWidth = 140;
  const barHeight = 10;
  const barX = centerX - barWidth / 2;
  const barY = topY - 24;
  context.fillStyle = "#23262d";
  context.fillRect(barX, barY, barWidth, barHeight);
  const healthRatio = dummy.health / dummy.maxHealth;
  context.fillStyle = dummy.health > 0 ? "#5fffb5" : "#44474f";
  context.fillRect(barX, barY, barWidth * clamp(healthRatio, 0, 1), barHeight);
  context.strokeStyle = "#50535b";
  context.strokeRect(barX, barY, barWidth, barHeight);

  context.fillStyle = "#cfd3df";
  context.font = "14px 'Segoe UI', Arial, sans-serif";
  context.textAlign = "center";
  const label = dummy.health > 0 ? `Training Dummy ${Math.round(dummy.health)}/${dummy.maxHealth}` : "Respawning...";
  context.fillText(label, centerX, barY - 6);
  context.textAlign = "left";
}

function drawEnemies() {
  const elapsed = getElapsedTime();
  for (const enemy of enemies) {
    if (enemy.health <= 0) {
      continue;
    }

    const shake = enemy.shakeTimer > 0 ? Math.sin(elapsed * 32) * enemy.shakeMagnitude * clamp(enemy.shakeTimer / 0.4, 0, 1) : 0;
    const centerX = enemy.x + shake;
    const headRadius = 18;
    const bodyColor = enemy.stunTimer > 0 ? "#ffd166" : (enemy.flashTimer > 0 ? "#ff9488" : "#fa5b4a");

    context.lineWidth = 5;
    context.strokeStyle = bodyColor;
    context.lineCap = "round";

    const topY = enemy.y;
    context.beginPath();
    context.arc(centerX, topY + headRadius, headRadius, 0, Math.PI * 2);
    context.stroke();

    context.beginPath();
    context.moveTo(centerX, topY + headRadius * 2);
    context.lineTo(centerX, topY + enemy.height - 24);
    context.stroke();

    context.beginPath();
    context.moveTo(centerX, topY + headRadius * 2.4);
    context.lineTo(centerX - 30, topY + headRadius * 3);
    context.moveTo(centerX, topY + headRadius * 2.4);
    context.lineTo(centerX + 30, topY + headRadius * 3);
    context.stroke();

    context.beginPath();
    context.moveTo(centerX, enemy.y + enemy.height - 26);
    context.lineTo(centerX - 24, enemy.y + enemy.height);
    context.moveTo(centerX, enemy.y + enemy.height - 26);
    context.lineTo(centerX + 24, enemy.y + enemy.height);
    context.stroke();

    const barWidth = 110;
    const barHeight = 8;
    const barX = centerX - barWidth / 2;
    const barY = topY - 20;
    context.fillStyle = "#230c0a";
    context.fillRect(barX, barY, barWidth, barHeight);
    const ratio = enemy.health / enemy.maxHealth;
    context.fillStyle = "#ff6f61";
    context.fillRect(barX, barY, barWidth * clamp(ratio, 0, 1), barHeight);
    context.strokeStyle = "#5c3029";
    context.strokeRect(barX, barY, barWidth, barHeight);
  }
}

function drawHud() {
  const currentWeapon = getCurrentWeapon();
  const weaponName = currentWeapon?.name ?? "Unarmed";
  const weaponSlots = getWeaponSlots();
  const ammoStatus = currentWeapon ? getAmmoStatus(currentWeapon.id) : null;
  const recoilOffset = getRecoilOffset();

  if ((stickman.flashBlindTimer ?? 0) > 0) {
    const overlayAlpha = Math.min(0.55, (stickman.flashBlindTimer ?? 0) / 1.2);
    context.fillStyle = `rgba(255, 255, 224, ${overlayAlpha})`;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  }

  context.fillStyle = "#d0d4de";
  context.font = "16px 'Segoe UI', Arial, sans-serif";
  context.textAlign = "left";
  context.fillText("Move: WASD/Arrows   Jump: Space   Crouch: S   Roll: Shift   Attack: J or Left Click   Throw: G or Right Click", 24, 32);
  context.fillText("Server Browser: L (toggle)  |  Join: Enter  |  Host: H  |  Offer: O  |  Paste: P  |  Apply: I  |  ICE Copy: M  |  ICE Apply: N", 24, 48);

  const comboText = stickman.attacking && stickman.currentAttack ? `Combo: ${stickman.currentAttack.name}` : "Combo: Ready";
  context.fillText(comboText, 24, 52);

  context.fillText(`Weapon: ${weaponName}`, 24, 72);

  let infoY = 92;
  const playerVehicle = getPlayerVehicle();
  if (playerVehicle) {
    const vehicleDefinition = VEHICLE_DEFINITIONS[playerVehicle.type];
    const vehicleLabel = vehicleDefinition?.label ?? playerVehicle.type;
    const movementType = vehicleDefinition?.movementType ?? "ground";
    context.fillStyle = "#8cffd4";
    context.fillText(`Vehicle: ${vehicleLabel} (E to exit)`, 24, infoY);
    infoY += 20;
    context.fillStyle = "#9aa2b1";
    if (movementType === "air") {
      context.fillText("Controls: A/D strafe   Space rise   S descend", 24, infoY);
    } else if (movementType === "water") {
      context.fillText("Controls: A/D throttle   S brake/reverse", 24, infoY);
    } else {
      context.fillText("Controls: A/D drive   S brake", 24, infoY);
    }
    infoY += 20;
    const mountedWeapons = vehicleDefinition?.mountedWeapons ?? [];
    if (mountedWeapons.length > 0) {
      for (const mount of mountedWeapons) {
        const bindingLabel = (mount.binding ?? "primary").toLowerCase() === "secondary" ? "Secondary" : "Primary";
        const mountLabel = mount.label ?? mount.id ?? "Mounted Weapon";
        context.fillStyle = bindingLabel === "Primary" ? "#cfe3ff" : "#ffd3a3";
        context.fillText(`${bindingLabel}: ${mountLabel}`, 24, infoY);
        infoY += 18;
      }
    }
  } else if (stickman.vehicleCandidateId) {
    const candidate = getVehicleById(stickman.vehicleCandidateId);
    if (candidate) {
      const candidateDefinition = VEHICLE_DEFINITIONS[candidate.type];
      const candidateLabel = candidateDefinition?.label ?? candidate.type;
      const movementType = candidateDefinition?.movementType ?? "ground";
      context.fillStyle = "#ffc66d";
      context.fillText(`Nearby: ${candidateLabel} [E to enter]`, 24, infoY);
      infoY += 20;
      context.fillStyle = "#9aa2b1";
      if (movementType === "air") {
        context.fillText("Tip: Space rises, S descends when piloting", 24, infoY);
        infoY += 20;
      } else if (movementType === "water") {
        context.fillText("Tip: Boats use A/D throttle, S to brake/reverse", 24, infoY);
        infoY += 20;
      } else {
        context.fillText("Tip: Hold S to brake while driving", 24, infoY);
        infoY += 20;
      }
      const candidateWeapons = candidateDefinition?.mountedWeapons ?? [];
      if (candidateWeapons.length > 0) {
        context.fillStyle = "#d6e2ff";
        for (const mount of candidateWeapons) {
          const bindingLabel = (mount.binding ?? "primary").toLowerCase() === "secondary" ? "Secondary" : "Primary";
          const mountLabel = mount.label ?? mount.id ?? "Mounted Weapon";
          context.fillText(`${bindingLabel}: ${mountLabel}`, 24, infoY);
          infoY += 18;
        }
      }
    }
  }
  context.fillStyle = "#d0d4de";

  const supplyStatus = getSupplyDropStatus();
  if (supplyStatus) {
    if (supplyStatus.incomingMessage) {
      const alpha = clamp(0.35 + 0.65 * (supplyStatus.incomingAlpha ?? 0), 0, 1);
      context.fillStyle = `rgba(176, 210, 255, ${alpha})`;
      context.fillText(supplyStatus.incomingMessage, 24, infoY);
      infoY += 20;
      context.fillStyle = "#d0d4de";
    }
    if ((supplyStatus.timeUntilNext ?? 0) > 0.2 && supplyStatus.nextDropLabel) {
      const eta = supplyStatus.timeUntilNext;
      context.fillText(`Next Drop (${supplyStatus.nextDropLabel}): ${eta.toFixed(1)}s`, 24, infoY);
      infoY += 20;
    }
    if ((supplyStatus.activeCount ?? 0) > 0) {
      context.fillStyle = "#8cffd4";
      context.fillText(`Drops on field: ${supplyStatus.activeCount}`, 24, infoY);
      infoY += 20;
      context.fillStyle = "#d0d4de";
    }
    if (supplyStatus.rewardMessage) {
      const rewardAlpha = clamp(0.3 + 0.7 * (supplyStatus.rewardAlpha ?? 0), 0, 1);
      context.fillStyle = `rgba(140, 255, 212, ${rewardAlpha})`;
      context.fillText(`Reward: ${supplyStatus.rewardMessage}`, 24, infoY);
      infoY += 20;
      context.fillStyle = "#d0d4de";
    }
  }

  const squadStatus = getSquadStatus();
  if (squadStatus?.command) {
    context.fillStyle = "#cfe3ff";
    context.fillText(`Squad: ${squadStatus.command.label}`, 24, infoY);
    infoY += 18;
    context.fillStyle = "#9aa2b1";
    context.fillText("Commands: Z Hold   X Defend   C Attack   V Flank   T Cycle", 24, infoY);
    infoY += 18;
    if ((squadStatus.cooldown ?? 0) > 0.05) {
      context.fillText(`Command cooldown: ${squadStatus.cooldown.toFixed(1)}s`, 24, infoY);
      infoY += 18;
    }
    if (Array.isArray(squadStatus.members) && squadStatus.members.length > 0) {
      context.fillStyle = "#8cffd4";
      const maxShown = Math.min(3, squadStatus.members.length);
      for (let i = 0; i < maxShown; i += 1) {
        const member = squadStatus.members[i];
        const distance = Math.abs(member.x - stickman.x);
        const status = member.targetEnemyId ? "engaging" : "ready";
        context.fillText(`${member.name ?? "Ally"}: ${distance.toFixed(0)}u (${status})`, 24, infoY);
        infoY += 18;
      }
      context.fillStyle = "#d0d4de";
    }
  }

  const p2pStatus = getP2PStatus?.();
  if (p2pStatus) {
    context.fillStyle = "#b6c9ff";
    context.fillText(`P2P: ${p2pStatus.status ?? "unknown"}`, 24, infoY);
    infoY += 18;
    if (p2pStatus.status !== "connected") {
      context.fillStyle = "#8495c9";
      context.fillText("Use window.P2P.createOffer() / createAnswer() in console", 24, infoY);
      infoY += 18;
      context.fillText("window.P2P.getLocalDescription() to copy SDP", 24, infoY);
      infoY += 18;
    } else {
      context.fillStyle = "#8cffd4";
      context.fillText("Remote peers: " + getRemotePlayers().length, 24, infoY);
      infoY += 18;
    }
    context.fillStyle = "#d0d4de";
  }

  if (ammoStatus) {


    const isInfinite = ammoStatus.capacity === Number.POSITIVE_INFINITY;
    const magazineDisplay = isInfinite ? "INF" : `${Math.max(0, ammoStatus.magazine)}`;
    const reserveDisplay = isInfinite ? "INF" : `${Math.max(0, ammoStatus.reserve)}`;
    let ammoLabel = `Ammo: ${magazineDisplay}/${reserveDisplay}`;
    if (ammoStatus.reloading) {
      ammoLabel += ` (Reloading ${Math.max(0, ammoStatus.reloadTimer).toFixed(1)}s)`;
    }
    context.fillText(ammoLabel, 24, infoY);
    infoY += 20;
  }

  const recoilMagnitude = Math.hypot(recoilOffset?.horizontal ?? 0, recoilOffset?.vertical ?? 0);
  if (recoilMagnitude > 0.05) {
    const recoilLabel = `Recoil Kick: H ${(recoilOffset.horizontal ?? 0).toFixed(2)}  V ${(recoilOffset.vertical ?? 0).toFixed(2)}`;
    context.fillText(recoilLabel, 24, infoY);
    infoY += 20;
  }

  context.fillText(`Player HP: ${stickman.health}/${stickman.maxHealth}`, 24, infoY);
  infoY += 20;
  context.fillText(`Dummy HP: ${Math.round(trainingDummy.health)}/${trainingDummy.maxHealth}`, 24, infoY);
  infoY += 20;
  const aliveEnemies = enemies.filter((enemy) => enemy.health > 0).length;
  context.fillText(`Enemies Alive: ${aliveEnemies}`, 24, infoY);
  infoY += 20;

  if (weaponSlots.length > 0) {
    const slotLabel = weaponSlots
      .map((weapon, index) => {
        const label = `${index + 1}: ${weapon.name}`;
        return weapon.id === currentWeapon?.id ? `[${label}]` : label;
      })
      .join("   ");
    context.fillStyle = "#9aa2b1";
    context.fillText(`Loadout ${slotLabel}`, 24, 152);
  }

  let nextHudY = 172;
  const gadgetStatus = getGadgetStatus();

  if (stickman.comboWindowOpen) {
    context.fillStyle = "#ffcf7a";
    context.fillText("Press attack now to chain!", 24, nextHudY);
    nextHudY += 20;
  }

  if (currentWeapon?.category === "throwable") {
    const ready = stickman.throwCooldown <= 0;
    const cooldownLabel = ready ? "Ready" : `${stickman.throwCooldown.toFixed(1)}s`;
    context.fillStyle = ready ? "#8cffd4" : "#ffcf7a";
    context.fillText(`Grenade: ${cooldownLabel}`, 24, nextHudY);
    nextHudY += 20;
  }

  if (currentWeapon?.category === "gadget") {
    const ready = (gadgetStatus.gadgetCooldown ?? 0) <= 0.01;
    const label = ready ? "Ready" : `${gadgetStatus.gadgetCooldown.toFixed(1)}s`;
    context.fillStyle = ready ? "#8cffd4" : "#ffcf7a";
    context.fillText(`Gadget: ${label}`, 24, nextHudY);
    nextHudY += 20;
  }

  if ((gadgetStatus.turretCount ?? 0) > 0) {
    context.fillStyle = "#9ae9ff";
    context.fillText(`Turrets Active: ${gadgetStatus.turretCount}`, 24, nextHudY);
    nextHudY += 20;
  }

  if (gadgetStatus.shieldActive) {
    const maxShield = gadgetStatus.shieldMaxStrength ?? 0;
    const shieldValue = Math.max(0, gadgetStatus.shieldStrength ?? 0);
    const ratio = maxShield > 0 ? Math.max(0, Math.min(1, shieldValue / maxShield)) : 0;
    context.fillStyle = "#7cd6ff";
    const label = maxShield > 0 ? `${Math.ceil(shieldValue)}/${Math.ceil(maxShield)}` : "Active";
    context.fillText(`Shield: ${label}`, 24, nextHudY);
    nextHudY += 14;
    const barWidth = 120;
    context.fillStyle = "#2d3c4d";
    context.fillRect(24, nextHudY, barWidth, 6);
    context.fillStyle = "#7cd6ff";
    context.fillRect(24, nextHudY, barWidth * ratio, 6);
    nextHudY += 14;
  }

  if ((stickman.stunTimer ?? 0) > 0) {
    context.fillStyle = "#ffb48a";
    context.fillText(`Stunned: ${stickman.stunTimer.toFixed(1)}s`, 24, nextHudY);
    nextHudY += 20;
  }

  if ((stickman.flashBlindTimer ?? 0) > 0) {
    context.fillStyle = "#ffe27a";
    context.fillText(`Blinded: ${stickman.flashBlindTimer.toFixed(1)}s`, 24, nextHudY);
    nextHudY += 20;
  }

  if ((stickman.smokeSlowTimer ?? 0) > 0) {
    context.fillStyle = "#b8c7dd";
    context.fillText(`In Smoke: ${stickman.smokeSlowTimer.toFixed(1)}s`, 24, nextHudY);
    nextHudY += 20;
  }

  if (stickman.health <= 0) {
    context.fillStyle = "#ff8c7a";
    context.fillText("Respawning soon...", 24, nextHudY);
  }

  const debugState = getPolishDebugState();
  const activeNotices = debugState.notices.slice(-4).reverse();
  if (activeNotices.length > 0 || debugState.shotIndicators.length > 0 || debugState.filters) {
    context.save();
    const rightMargin = context.canvas.width - 24;
    context.textAlign = "right";
    let debugY = 32;
    for (const notice of activeNotices) {
      const life = notice.maxTtl > 0 ? clamp(notice.ttl / notice.maxTtl, 0, 1) : 0;
      context.globalAlpha = clamp(life, 0.25, 1);
      context.fillStyle = "#c3cdea";
      context.fillText(notice.message, rightMargin, debugY);
      debugY += 18;
    }
    if (debugState.shotIndicators.length > 0) {
      if (activeNotices.length > 0) {
        debugY += 6;
      }
      for (const entry of debugState.shotIndicators) {
        const life = entry.maxTtl > 0 ? clamp(entry.ttl / entry.maxTtl, 0, 1) : 0;
        context.globalAlpha = clamp(life, 0.3, 0.85);
        context.fillStyle = "#9aa2b1";
        context.fillText("Shot: " + entry.weaponId, rightMargin, debugY);
        debugY += 16;
      }
    }
    const filters = debugState.filters;
    if (filters) {
      if (debugY > 32) {
        debugY += 6;
      }
      context.globalAlpha = 0.6;
      context.fillStyle = "#7f8aad";
      context.fillText("Filters (Alt+6/7/8)", rightMargin, debugY);
      debugY += 16;
      const filterLines = [
        { label: "Weapons", value: filters.weapons },
        { label: "Shield", value: filters.shield },
        { label: "Throwables", value: filters.throwables }
      ];
      for (const line of filterLines) {
        context.globalAlpha = line.value ? 0.85 : 0.35;
        context.fillStyle = line.value ? "#c3cdea" : "#6c7389";
        context.fillText(line.label + ": " + (line.value ? "ON" : "OFF"), rightMargin, debugY);
        debugY += 16;
      }
    }
    context.globalAlpha = 1;
    context.restore();
  }
}
function drawGadgetsLayer() {
  drawGadgets();
}

function drawPolishDebugEffects() {
  const { muzzleFlashes, shieldBursts, throwableBursts } = getPolishDebugState();
  if (muzzleFlashes.length === 0 && shieldBursts.length === 0 && throwableBursts.length === 0) {
    return;
  }

  context.save();

  for (const flash of muzzleFlashes) {
    const life = clamp(flash.ttl / flash.maxTtl, 0, 1);
    const alpha = 0.25 + life * 0.6;
    const radius = 12 + (1 - life) * 14;
    const offset = (flash.facing ?? 1) * (10 + (1 - life) * 6);
    context.globalAlpha = alpha;
    context.fillStyle = "#ffd27a";
    context.beginPath();
    context.arc(flash.x + offset, flash.y, radius, 0, Math.PI * 2);
    context.fill();
  }

  for (const burst of shieldBursts) {
    const life = clamp(burst.ttl / burst.maxTtl, 0, 1);
    const alpha = (burst.type === "shatter" ? 0.55 : 0.35) * life;
    if (alpha <= 0) {
      continue;
    }
    const radiusBase = burst.type === "shatter" ? 120 : 80;
    const radius = radiusBase * (1 - life * 0.35);
    context.globalAlpha = alpha;
    context.lineWidth = burst.type === "shatter" ? 6 : 3;
    context.strokeStyle = burst.type === "shatter" ? "#7cd6ff" : "#9be9ff";
    context.beginPath();
    context.arc(burst.center.x, burst.center.y, radius, 0, Math.PI * 2);
    context.stroke();
  }

  for (const burst of throwableBursts) {
    const life = clamp(burst.ttl / burst.maxTtl, 0, 1);
    if (life <= 0) {
      continue;
    }
    let stroke = "#ffb347";
    if (burst.type === "flash") {
      stroke = "#fff6d0";
    } else if (burst.type === "smoke" || burst.type === "smoke-fade") {
      stroke = "#9db8ca";
    }
    const radius = burst.radius * (1 + (1 - life) * 0.35);
    context.globalAlpha = (burst.type === "smoke-fade" ? 0.3 : 0.45) * life;
    context.lineWidth = burst.type === "flash" ? 5 : 4;
    context.strokeStyle = stroke;
    context.beginPath();
    context.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawProjectilesLayer() {
  drawProjectiles();
  drawThrowables();
  drawParticles();
  drawPolishDebugEffects();
}

function drawServerBrowser() {
  const state = getServerBrowserState();
  if (!state.visible) {
    return;
  }

  const panelWidth = 480;
  const panelHeight = 420;
  const x = context.canvas.width * 0.5 - panelWidth * 0.5;
  const y = context.canvas.height * 0.5 - panelHeight * 0.5;

  context.save();
  context.fillStyle = "rgba(12, 16, 24, 0.82)";
  context.fillRect(x, y, panelWidth, panelHeight);
  context.strokeStyle = "#6f7fa0";
  context.lineWidth = 3;
  context.strokeRect(x, y, panelWidth, panelHeight);

  context.fillStyle = "#cfe3ff";
  context.font = "18px 'Segoe UI', Arial, sans-serif";
  context.textAlign = "left";
  context.fillText("Server Browser", x + 20, y + 32);

  context.font = "13px 'Segoe UI', Arial, sans-serif";
  context.fillStyle = "#9aa9c7";
  context.fillText("Join: Enter  |  Navigate: [ / ]  |  Close: L", x + 20, y + 52);
  context.fillText("Host: H  |  Stop: U  |  Offer: O  |  Paste Offer: P  |  Answer: I  |  ICE Copy: M  |  ICE Apply: N", x + 20, y + 68);

  let statusY = y + 88;
  if (state.error) {
    context.fillStyle = "#ff8080";
    context.fillText(state.error, x + 20, statusY);
    statusY += 18;
  }
  if (state.statusMessage) {
    context.fillStyle = "#8cffd4";
    context.fillText(state.statusMessage, x + 20, statusY);
    statusY += 18;
  }
  if (state.joinError) {
    context.fillStyle = "#ff9a9a";
    context.fillText(state.joinError, x + 20, statusY);
    statusY += 18;
  }
  if (state.joinStatus) {
    context.fillStyle = "#cfe3ff";
    context.fillText(state.joinStatus, x + 20, statusY);
    statusY += 18;
  }

  const listTop = statusY + 12;
  const rowHeight = 34;
  const listBottom = y + panelHeight - 140;
  const servers = state.servers ?? [];
  const maxRows = Math.max(0, Math.floor((listBottom - listTop) / rowHeight));
  const rowsToDraw = Math.min(servers.length, Math.min(maxRows, 8));

  context.font = "14px 'Segoe UI', Arial, sans-serif";
  for (let i = 0; i < rowsToDraw; i += 1) {
    const server = servers[i];
    const rowY = listTop + i * rowHeight;
    const isSelected = i === state.selectedIndex;
    if (isSelected) {
      context.fillStyle = "rgba(108, 132, 220, 0.4)";
      context.fillRect(x + 12, rowY - 6, panelWidth - 24, rowHeight - 4);
    }
    context.fillStyle = "#e4ecff";
    context.fillText(server.name ?? server.id ?? "Server", x + 24, rowY + 8);
    context.fillStyle = "#9aa9c7";
    const details = `${server.map ?? "Unknown"} | ${server.players ?? "?"}/${server.maxPlayers ?? "?"} | ${server.region ?? "--"}`;
    context.fillText(details, x + 24, rowY + 22);
  }

  if (servers.length === 0) {
    context.fillStyle = "#a6b2cf";
    context.fillText("No servers available.", x + 24, listTop + 16);
  }

  const snippet = (value, limit = 64) => {
    if (typeof value !== "string") {
      return "";
    }
    return value.length > limit ? `${value.slice(0, limit)}...` : value;
  };

  const p2p = state.p2p ?? {};
  let p2pY = y + panelHeight - 120;
  context.font = "12px 'Segoe UI', Arial, sans-serif";
  context.fillStyle = "#9aa9c7";
  context.fillText("P2P Handshake", x + 20, p2pY);
  p2pY += 16;

  if (p2p.error) {
    context.fillStyle = "#ff8080";
    context.fillText(p2p.error, x + 20, p2pY);
    p2pY += 16;
  }

  if (state.hosting) {
    if (p2p.pendingOffer) {
      context.fillStyle = "#ffd27f";
      context.fillText("Generating offer...", x + 20, p2pY);
      p2pY += 16;
    } else if (p2p.offer) {
      context.fillStyle = "#8cffd4";
      context.fillText("Offer ready (press O to copy).", x + 20, p2pY);
      p2pY += 16;
      context.fillStyle = "#9aa9c7";
      context.fillText(snippet(p2p.offer), x + 20, p2pY);
      p2pY += 16;
    } else {
      context.fillStyle = "#9aa9c7";
      context.fillText("Press O to generate an offer for peers.", x + 20, p2pY);
      p2pY += 16;
    }

    if (p2p.pendingAnswer) {
      context.fillStyle = "#ffd27f";
      context.fillText("Waiting for a joiner answer...", x + 20, p2pY);
      p2pY += 16;
    }
  } else {
    if (p2p.pendingAnswer) {
      context.fillStyle = "#ffd27f";
      context.fillText("Generating answer...", x + 20, p2pY);
      p2pY += 16;
    } else if (p2p.answer) {
      context.fillStyle = "#8cffd4";
      context.fillText("Answer ready. Share it with the host.", x + 20, p2pY);
      p2pY += 16;
      context.fillStyle = "#9aa9c7";
      context.fillText(snippet(p2p.answer), x + 20, p2pY);
      p2pY += 16;
    } else {
      context.fillStyle = "#9aa9c7";
      context.fillText("Press P after copying the host offer JSON.", x + 20, p2pY);
      p2pY += 16;
    }
  }

  const localCandidates = Array.isArray(p2p.localCandidates) ? p2p.localCandidates : [];
  const remoteCandidates = Array.isArray(p2p.remoteCandidates) ? p2p.remoteCandidates : [];

  if (p2p.pendingCandidates) {
    context.fillStyle = "#ffd27f";
    context.fillText("Processing ICE candidates...", x + 20, p2pY);
    p2pY += 16;
  }

  const candidateSummary =
    "Local ICE ready: " + localCandidates.length + "  |  Remote applied: " + remoteCandidates.length;
  context.fillStyle = "#9aa9c7";
  context.fillText(candidateSummary, x + 20, p2pY);
  p2pY += 16;

  if (localCandidates.length > 0) {
    const lastLocalLabel = "Last local: " + snippet(localCandidates[localCandidates.length - 1], 54);
    context.fillStyle = "#6f86d0";
    context.fillText(lastLocalLabel, x + 20, p2pY);
    p2pY += 16;
  } else if (!p2p.pendingCandidates) {
    context.fillStyle = "#9aa9c7";
    context.fillText("Local ICE will appear shortly after offer/answer.", x + 20, p2pY);
    p2pY += 16;
  }

  if (remoteCandidates.length > 0) {
    const lastRemoteLabel = "Last remote: " + snippet(remoteCandidates[remoteCandidates.length - 1], 54);
    context.fillStyle = "#6fd0c5";
    context.fillText(lastRemoteLabel, x + 20, p2pY);
    p2pY += 16;
  } else if (!p2p.pendingCandidates) {
    context.fillStyle = "#9aa9c7";
    if (state.hosting) {
      context.fillText("Press N after players send their ICE (M).", x + 20, p2pY);
    } else {
      context.fillText("Press M to copy your ICE and send it to the host.", x + 20, p2pY);
    }
    p2pY += 16;
  }

  context.restore();
}
export { drawBackground, drawDestructibles, drawVehicles, drawSupplyDrops, drawRemotePlayers, drawServerBrowser, drawSquadmates, drawStickman, drawHitboxes, drawTrainingDummy, drawEnemies, drawHud, drawProjectilesLayer, drawGadgetsLayer };


















