import { context, GROUND_Y } from "../../environment/canvas.js";
import { POSES, SPEED } from "../../config/constants.js";
import { getEnvironmentDefinition } from "../../state/environment.js";
import { stickman, trainingDummy, enemies, squadmates, getRemotePlayers } from "../../state/entities.js";
import { getServerBrowserState } from "../../state/serverBrowser.js";
import { vehicles, VEHICLE_DEFINITIONS, getVehicleById } from "../../state/vehicles.js";
import { clamp } from "../utils/math.js";
import { getElapsedTime } from "../utils/time.js";
import { getCurrentWeapon, getWeaponSlots } from "../combat/weapons.js";
import { getAmmoStatus } from "../../state/ammo.js";
import { getCosmeticSelections, getCosmeticOption } from "../../state/cosmetics.js";
import { drawProjectiles } from "../combat/projectiles.js";
import { drawThrowables } from "../combat/throwables.js";
import { drawGadgets, getGadgetStatus } from "../gadgets/index.js";
import { drawSupplyDrops } from "./supplyDrops.js";
import { renderStickFigure, getWeaponVisual } from "./stickFigure.js";
import { drawDestructibles } from "./destructibles.js";
import { drawBuildings, drawBuildPreview } from "./buildings.js";
import { drawSalvagePickups } from "./resources.js";
import { getSurvivalHudStatus } from "../survival/index.js";
import { getCoopHudStatus } from "../../state/coop.js";
import { getSandboxHudStatus } from "../sandbox/index.js";
import { getCampaignHudStatus } from "../campaign/index.js";
import { drawInteractables } from "./interactables.js";
import { getBuildingHudStatus } from "../building/index.js";
import { drawParticles } from "../effects/particles.js";
import { getPolishDebugState } from "../events/polishDebug.js";
import { getRecoilOffset } from "../../state/recoil.js";
import { getSupplyDropStatus } from "../world/supplyDrops.js";
import { getP2PStatus } from "../network/p2p.js";
import { getSquadStatus } from "../squad/index.js";
import { setActiveCamera, isWithinView, resetPerformanceStats, recordVisibility, performanceStats } from "./culling.js";
import { getPlayerVehicle } from "../vehicles/index.js";
import { getStickmanShoulderAnchor } from "../aim/index.js";

const SQUAD_WEAPON_TEMPLATE = { id: "squadCarbine", name: "Support Carbine", category: "ranged-mid" };


const UI_TITLE_FONT = "16px 'Segoe UI Semibold', 'Segoe UI', Arial, sans-serif";
const UI_TEXT_FONT = "14px 'Segoe UI', Arial, sans-serif";
const UI_SMALL_FONT = "12px 'Segoe UI', Arial, sans-serif";

function drawRoundedRectPath(ctx, x, y, width, height, radius = 8) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawUiPanel(x, y, width, height, options = {}) {
  const ctx = context;
  ctx.save();
  const radius = options.radius ?? 12;
  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = options.fill ?? "rgba(12, 18, 28, 0.78)";
  ctx.fill();
  if (options.stroke !== false) {
    ctx.strokeStyle = options.stroke ?? "rgba(140, 170, 210, 0.22)";
    ctx.lineWidth = options.strokeWidth ?? 1.4;
    ctx.stroke();
  }
  if (options.accent) {
    ctx.fillStyle = options.accent;
    ctx.fillRect(x, y, width, options.accentHeight ?? 3);
  }
  ctx.restore();
}

function drawUiProgressBar(x, y, width, height, progress, options = {}) {
  const ctx = context;
  const radius = options.radius ?? height * 0.5;
  const clampedProgress = clamp(progress ?? 0, 0, 1);
  ctx.save();
  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = options.background ?? "rgba(255, 255, 255, 0.08)";
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = options.fill ?? "#8cffd4";
  ctx.fillRect(x, y, width * clampedProgress, height);
  ctx.restore();
  if (options.border !== false) {
    ctx.save();
    drawRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.strokeStyle = options.border ?? "rgba(140, 170, 210, 0.35)";
    ctx.lineWidth = options.borderWidth ?? 1;
    ctx.stroke();
    ctx.restore();
  }
}

function drawUiTag(text, x, y, options = {}) {
  const ctx = context;
  ctx.save();
  ctx.font = UI_SMALL_FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const paddingX = options.paddingX ?? 10;
  const height = options.height ?? 20;
  const width = Math.ceil(ctx.measureText(text).width) + paddingX * 2;
  drawRoundedRectPath(ctx, x, y, width, height, height * 0.5);
  ctx.fillStyle = options.background ?? "rgba(140, 170, 220, 0.32)";
  ctx.fill();
  if (options.border) {
    ctx.strokeStyle = options.border;
    ctx.stroke();
  }
  ctx.fillStyle = options.color ?? "#e0e8ff";
  ctx.fillText(text, x + paddingX, y + height * 0.5 + (options.offsetY ?? 0));
  ctx.restore();
  return width;
}

function getCategoryAccent(category) {
  if (!category) {
    return "rgba(146, 166, 210, 0.35)";
  }
  if (category.startsWith("melee")) {
    return "rgba(255, 139, 139, 0.45)";
  }
  if (category.startsWith("ranged")) {
    return "rgba(124, 214, 255, 0.45)";
  }
  if (category === "throwable") {
    return "rgba(255, 205, 135, 0.45)";
  }
  if (category === "gadget") {
    return "rgba(140, 255, 212, 0.45)";
  }
  return "rgba(146, 166, 210, 0.35)";
}

function drawWeaponHotbar(slots, currentWeapon, ammoStatus, canvasWidth, canvasHeight) {
  if (!slots || slots.length === 0) {
    return;
  }
  const spacing = 12;
  const maxSlots = slots.length;
  const availableWidth = Math.min(canvasWidth * 0.9, 560);
  const slotWidth = Math.min(118, Math.max(72, (availableWidth - spacing * (maxSlots - 1)) / maxSlots));
  const slotHeight = slotWidth * 0.6;
  const totalWidth = slotWidth * maxSlots + spacing * (maxSlots - 1);
  const startX = (canvasWidth - totalWidth) / 2;
  const y = canvasHeight - slotHeight - 16;

  slots.forEach((slot, index) => {
    const x = startX + index * (slotWidth + spacing);
    const isActive = slot.id === currentWeapon?.id;
    drawUiPanel(x, y, slotWidth, slotHeight, {
      accent: isActive ? getCategoryAccent(slot.category ?? "") : "rgba(255, 255, 255, 0.06)",
      fill: isActive ? "rgba(18, 28, 40, 0.94)" : "rgba(12, 18, 28, 0.78)",
      radius: 10,
      stroke: "rgba(140, 170, 210, 0.18)"
    });
    context.save();
    context.textAlign = "left";
    context.font = UI_SMALL_FONT;
    context.fillStyle = isActive ? "#f5f8ff" : "#aeb7cc";
    context.fillText(`${index + 1}`, x + 12, y + 18);
    context.font = UI_TEXT_FONT;
    context.fillStyle = isActive ? "#f5f8ff" : "#d7dff1";
    const label = slot.name.length > 16 ? `${slot.name.slice(0, 15)}...` : slot.name;
    context.fillText(label, x + 12, y + 38);
    if (isActive && ammoStatus) {
      const isInfinite = ammoStatus.capacity === Number.POSITIVE_INFINITY;
      const magazineDisplay = isInfinite ? "INF" : `${Math.max(0, ammoStatus.magazine)}`;
      const reserveDisplay = isInfinite ? "INF" : `${Math.max(0, ammoStatus.reserve)}`;
      context.font = UI_SMALL_FONT;
      context.fillStyle = "#9aa6bf";
      context.fillText(`${magazineDisplay}/${reserveDisplay}`, x + 12, y + slotHeight - 12);
    }
    context.restore();
  });
}

function drawUiCardStack(cards, x, startY, width) {
  let y = startY;
  for (const card of cards) {
    const lines = card.lines ?? [];
    const lineCount = lines.length;
    const footer = card.footer ? 1 : 0;
    const baseHeight = 40 + lineCount * 18 + footer * 20;
    const height = Math.max(card.minHeight ?? 64, baseHeight);
    drawUiPanel(x, y, width, height, { accent: card.accent ?? "rgba(146, 166, 210, 0.35)", fill: card.fill });
    context.save();
    context.textAlign = "left";
    context.font = UI_TITLE_FONT;
    context.fillStyle = card.titleColor ?? "#f4f7ff";
    context.fillText(card.title, x + 16, y + 28);
    context.font = UI_TEXT_FONT;
    let lineY = y + 52;
    for (const line of lines) {
      const text = typeof line === "string" ? line : line.text;
      const color = typeof line === "string" ? "#d7dff1" : (line.color ?? "#d7dff1");
      context.fillStyle = color;
      context.fillText(text, x + 16, lineY);
      lineY += 18;
    }
    if (card.footer) {
      context.font = UI_SMALL_FONT;
      context.fillStyle = card.footerColor ?? "#9aa6bf";
      context.fillText(card.footer, x + 16, y + height - 12);
    }
    context.restore();
    y += height + 16;
  }
  return y;
}

function formatSeconds(seconds) {
  const value = Math.max(0, seconds ?? 0);
  return value >= 10 ? `${Math.round(value)}s` : `${value.toFixed(1)}s`;
}
function drawBackground(camera) {
  resetPerformanceStats();
  setActiveCamera(camera);
  const environment = getEnvironmentDefinition();
  const background = environment?.background ?? {};
  const offsetX = camera?.offsetX ?? 0;
  const gradientStops = Array.isArray(background.gradientStops) && background.gradientStops.length > 0
    ? background.gradientStops
    : [
        { offset: 0, color: "#111a2c" },
        { offset: 0.4, color: "#182439" },
        { offset: 0.75, color: "#1f2d44" },
        { offset: 1, color: "#232f49" }
      ];
  const skyGradient = context.createLinearGradient(0, 0, 0, context.canvas.height);
  for (const stop of gradientStops) {
    const offset = typeof stop.offset === "number" ? Math.min(Math.max(stop.offset, 0), 1) : 0;
    const color = stop.color ?? "#111a2c";
    skyGradient.addColorStop(offset, color);
  }
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);

  const silhouettes = Array.isArray(background.silhouettes) ? background.silhouettes : [];
  for (const silhouette of silhouettes) {
    const points = Array.isArray(silhouette.points) ? silhouette.points : [];
    if (points.length < 3) {
      continue;
    }
    context.fillStyle = silhouette.color ?? "rgba(0, 0, 0, 0.45)";
    context.beginPath();
    context.moveTo(points[0].x - offsetX, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      context.lineTo(points[i].x - offsetX, points[i].y);
    }
    context.closePath();
    context.fill();
  }

  const horizon = background.horizonBand;
  if (horizon) {
    const height = horizon.height ?? 120;
    const start = horizon.start ?? GROUND_Y - height - 30;
    const band = context.createLinearGradient(0, start, 0, start + height);
    band.addColorStop(0, horizon.topColor ?? "rgba(46, 86, 126, 0.25)");
    band.addColorStop(1, horizon.bottomColor ?? "rgba(28, 52, 84, 0)");
    context.fillStyle = band;
    context.fillRect(0, start, context.canvas.width, height);
  }

  if (environment?.theme === "desert") {
    const sunX = background.sun?.x ?? context.canvas.width * 0.72;
    const sunY = background.sun?.y ?? context.canvas.height * 0.18;
    const sunRadius = background.sun?.radius ?? 70;
    const sunGradient = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunGradient.addColorStop(0, "rgba(255, 214, 128, 0.9)");
    sunGradient.addColorStop(1, "rgba(255, 214, 128, 0)");
    context.fillStyle = sunGradient;
    context.beginPath();
    context.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    context.fill();
  } else if (environment?.theme === "sci-fi") {
    const step = 110;
    context.fillStyle = "#a8c2ff";
    context.globalAlpha = 0.35;
    for (let x = 0; x < context.canvas.width; x += step) {
      for (let y = 0; y < GROUND_Y - 40; y += step) {
        const jitterX = (Math.sin(x * 13.37 + y) * 8) % 18;
        const jitterY = (Math.cos(y * 7.91 + x) * 6) % 14;
        context.fillRect(x + jitterX, y + jitterY, 2, 2);
      }
    }
    context.globalAlpha = 1;
  }

  if (environment?.theme === "jungle") {
    const mistStart = GROUND_Y - 140;
    const mistGradient = context.createLinearGradient(0, mistStart, 0, GROUND_Y);
    mistGradient.addColorStop(0, "rgba(60, 120, 80, 0.18)");
    mistGradient.addColorStop(1, "rgba(40, 70, 50, 0)");
    context.fillStyle = mistGradient;
    context.fillRect(0, mistStart, context.canvas.width, GROUND_Y - mistStart);
  }

  context.fillStyle = background.groundColor ?? "#1b2231";
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

    const halfWidth = (definition.width ?? 120) * 0.5 + 30;
    const culled = !isWithinView(vehicle.x, halfWidth, 320);
    recordVisibility("vehicle", culled);
    if (culled) {
      continue;
    }

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
    const culled = !isWithinView(remote.x, 36, 240);
    recordVisibility("remote", culled);
    if (culled) {
      continue;
    }
    renderStickFigure({
      entity: remote,
      pose: POSES.standing,
      aim: remote.aim ?? null,
      weapon: null,
      primaryColor: "#ff9cf7",
      supportColor: "#ffc5ff",
      lineWidth: 3.2,
      label: remote.name ?? remote.id ?? "Peer",
      labelColor: "#ffd6ff"
    });
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
  const outline = commandColors[commandId] ?? "#8cffd4";
  const weaponVisual = getWeaponVisual(SQUAD_WEAPON_TEMPLATE);

  for (const ally of squadmates) {
    const halfWidth = 40;
    const culled = !isWithinView(ally.x, halfWidth, 240);
    recordVisibility("squad", culled);
    if (culled) {
      continue;
    }
    const flashTimer = ally.flashTimer ?? 0;
    const flashAmount = clamp(flashTimer / 0.18, 0, 1);
    const highlight = ally.highlight ?? 0;
    const activeShot = ally.fireCooldown != null ? ally.fireCooldown < 0.08 : false;

    renderStickFigure({
      entity: ally,
      pose: POSES.standing,
      aim: ally.aim,
      weapon: SQUAD_WEAPON_TEMPLATE,
      weaponVisual,
      primaryColor: outline,
      supportColor: outline,
      lineWidth: 3.6,
      attackInfo: ally.targetEnemyId || activeShot
        ? { active: true, progress: activeShot ? 0.7 : 0.4, type: "ranged-mid" }
        : null,
      label: ally.name ?? "Ally",
      labelColor: "#cfe4ff",
      flashColor: flashTimer > 0 ? "rgba(140, 255, 212, 0.85)" : null,
      flashAmount,
      highlightColor: highlight > 0 ? "rgba(140, 255, 212, 0.45)" : null
    });
  }
}

function drawStickman() {
  if (stickman.health <= 0 || stickman.vehicleId) {
    return;
  }

  const pose = stickman.currentPose || POSES.standing;
  const weapon = getCurrentWeapon();
  const attack = stickman.currentAttack;
  const attackDuration = attack ? attack.windup + attack.active + attack.recovery : 0;
  const attackInfo = attack
    ? {
        active: stickman.attacking,
        progress: attackDuration > 0 ? clamp(stickman.attackElapsed / attackDuration, 0, 1) : 0,
        type: weapon?.category ?? ""
      }
    : null;

  const cosmeticSelections = getCosmeticSelections();
  const stickmanCosmetics = {
    helmet: getCosmeticOption(cosmeticSelections.helmet) ?? null,
    armor: getCosmeticOption(cosmeticSelections.armor) ?? null,
    jetpack: getCosmeticOption(cosmeticSelections.jetpack) ?? null
  };

  renderStickFigure({
    entity: stickman,
    pose,
    aim: stickman.aim,
    weapon,
    cosmetics: stickmanCosmetics,
    primaryColor: "#f4f7ff",
    supportColor: "#d0d4de",
    lineWidth: 4,
    crouching: stickman.crouching,
    rolling: stickman.rolling,
    attackInfo,
    flashColor: stickman.flashBlindTimer > 0 ? "rgba(255, 255, 224, 0.7)" : null,
    flashAmount: clamp((stickman.flashBlindTimer ?? 0) / 1.2, 0, 1),
    highlightColor: stickman.structureShieldStrength > 0 ? "rgba(124, 214, 255, 0.55)" : null
  });

  drawPlayerAimDebug();
}

function drawPlayerAimDebug() {
  const aim = stickman.aim;
  if (!aim) {
    return;
  }

  const anchor = getStickmanShoulderAnchor();
  const hasTarget = aim.active && Number.isFinite(aim.targetX) && Number.isFinite(aim.targetY);
  const reach = hasTarget ? Math.max(72, Math.min(320, aim.magnitude || 220)) : 220;
  const directionX = Number.isFinite(aim.vectorX) ? aim.vectorX : (stickman.facing >= 0 ? 1 : -1);
  const directionY = Number.isFinite(aim.vectorY) ? aim.vectorY : 0;
  const norm = Math.hypot(directionX, directionY) || 1;
  const dirX = directionX / norm;
  const dirY = directionY / norm;
  const targetX = hasTarget ? aim.targetX : anchor.x + dirX * reach;
  const targetY = hasTarget ? aim.targetY : anchor.y + dirY * reach;

  context.save();
  context.lineWidth = 2;
  context.setLineDash([6, 6]);
  context.strokeStyle = hasTarget ? "rgba(124, 214, 255, 0.85)" : "rgba(160, 196, 255, 0.7)";
  context.beginPath();
  context.moveTo(anchor.x, anchor.y);
  context.lineTo(targetX, targetY);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = hasTarget ? "rgba(124, 214, 255, 0.9)" : "rgba(160, 196, 255, 0.8)";
  context.beginPath();
  context.arc(targetX, targetY, 4, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = hasTarget ? "rgba(124, 214, 255, 1)" : "rgba(160, 196, 255, 1)";
  context.globalAlpha = 0.45;
  context.beginPath();
  context.arc(anchor.x, anchor.y, 3, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  context.restore();
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
  for (const enemy of enemies) {
    if (enemy.health <= 0) {
      continue;
    }

    const halfWidth = (enemy.radius ?? 22) + 48;
    const culled = !isWithinView(enemy.x, halfWidth, 260);
    recordVisibility("enemies", culled);
    if (culled) {
      continue;
    }

    const headRadius = 18;
    const bodyLength = Math.max(38, (enemy.height ?? 118) - headRadius * 2 - 26);
    const enemyPose = { headRadius, bodyLength, legLength: 42, armLength: 30 };
    const bodyColor = enemy.stunTimer > 0 ? "#ffd166" : (enemy.flashTimer > 0 ? "#ff9488" : "#fa5b4a");
    const flashTimer = enemy.flashTimer ?? 0;
    const flashAmount = clamp(flashTimer / 0.18, 0, 1);
    const highlightColor = enemy.shakeTimer > 0 ? "rgba(255, 139, 126, 0.35)" : null;

    renderStickFigure({
      entity: enemy,
      pose: enemyPose,
      aim: enemy.aim,
      weapon: null,
      primaryColor: bodyColor,
      supportColor: "#fca289",
      lineWidth: 4.4,
      showHealthBar: true,
      healthRatio: enemy.health / enemy.maxHealth,
      healthColor: "#ff6f61",
      flashColor: flashTimer > 0 ? "rgba(255, 148, 136, 0.85)" : null,
      flashAmount,
      highlightColor,
      attackInfo: enemy.state === "attack-active" ? { active: true, progress: 0.8, type: "melee-mid" } : null
    });
  }
}


function drawHud() {
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  const currentWeapon = getCurrentWeapon();
  const weaponSlots = getWeaponSlots();
  const ammoStatus = currentWeapon ? getAmmoStatus(currentWeapon.id) : null;
  const gadgetStatus = getGadgetStatus();
  const recoilOffset = getRecoilOffset();
  const buildingHud = getBuildingHudStatus();
  const materials = Math.max(0, buildingHud?.resources ?? 0);

  if ((stickman.flashBlindTimer ?? 0) > 0) {
    const overlayAlpha = Math.min(0.55, (stickman.flashBlindTimer ?? 0) / 1.2);
    context.fillStyle = `rgba(255, 255, 224, ${overlayAlpha})`;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  context.save();
  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  const maxHealth = Math.max(1, stickman.maxHealth ?? 100);
  const healthRatio = clamp(stickman.health / maxHealth, 0, 1);
  const shieldMax = gadgetStatus?.shieldMaxStrength ?? 0;
  const shieldStrength = gadgetStatus?.shieldStrength ?? 0;
  const shieldRatio = shieldMax > 0 ? clamp(shieldStrength / shieldMax, 0, 1) : 0;
  const shieldActive = (gadgetStatus?.shieldActive ?? false) || shieldStrength > 0;

  const vitalsWidth = 308;
  const vitalsHeight = shieldActive ? 158 : 138;
  const vitalsX = 24;
  const vitalsY = canvasHeight - vitalsHeight - 32;

  drawUiPanel(vitalsX, vitalsY, vitalsWidth, vitalsHeight, { accent: "#5dc2ff" });

  context.font = UI_TITLE_FONT;
  context.fillStyle = "#f4f7ff";
  context.fillText("Player Vitals", vitalsX + 16, vitalsY + 30);

  context.font = UI_TEXT_FONT;
  context.fillStyle = "#d7dff1";
  context.fillText(`Health ${Math.round(stickman.health)} / ${Math.round(maxHealth)}`, vitalsX + 16, vitalsY + 56);
  drawUiProgressBar(vitalsX + 16, vitalsY + 62, vitalsWidth - 32, 10, healthRatio, { fill: "#ff7d7d" });

  let vitalsLineY = vitalsY + 88;

  if (shieldActive) {
    context.fillStyle = "#cbeaff";
    context.fillText(`Shield ${Math.round(shieldStrength)} / ${Math.round(shieldMax)}`, vitalsX + 16, vitalsLineY);
    drawUiProgressBar(vitalsX + 16, vitalsLineY + 6, vitalsWidth - 32, 10, shieldRatio, { fill: "#7cd6ff" });
    vitalsLineY += 32;
  }

  context.fillStyle = "#9aa6bf";
  context.fillText(`Materials ${materials}`, vitalsX + 16, vitalsLineY);
  vitalsLineY += 22;

  const throwable = weaponSlots.find((slot) => slot.category === "throwable");
  const gadgetSlot = weaponSlots.find((slot) => slot.category === "gadget");
  const throwCooldown = Math.max(0, stickman.throwCooldown ?? 0);
  const gadgetCooldown = Math.max(0, gadgetStatus?.gadgetCooldown ?? 0);
  const throwCooldownMax = Math.max(throwable?.throwable?.cooldownSeconds ?? 0, throwCooldown);
  const gadgetCooldownMax = Math.max(gadgetSlot?.gadget?.cooldownSeconds ?? 0, gadgetCooldown);

  const statusTags = [];

  if (stickman.comboWindowOpen) {
    statusTags.push({ text: "Combo window open", background: "rgba(255, 205, 135, 0.32)", color: "#ffe0b8" });
  }
  if (throwable) {
    if (throwCooldown > 0.05) {
      statusTags.push({ text: `Throw ${formatSeconds(throwCooldown)}`, background: "rgba(255, 173, 102, 0.32)", color: "#ffd7a8" });
    } else {
      statusTags.push({ text: "Throw ready", background: "rgba(140, 255, 212, 0.28)", color: "#d6ffee" });
    }
  }
  if (gadgetSlot) {
    if (gadgetCooldown > 0.05) {
      statusTags.push({ text: `Gadget ${formatSeconds(gadgetCooldown)}`, background: "rgba(124, 214, 255, 0.28)", color: "#d6f1ff" });
    } else {
      statusTags.push({ text: "Gadget ready", background: "rgba(124, 214, 255, 0.2)", color: "#d6f1ff" });
    }
  }
  if ((stickman.stunTimer ?? 0) > 0) {
    statusTags.push({ text: `Stunned ${formatSeconds(stickman.stunTimer)}`, background: "rgba(255, 140, 122, 0.32)", color: "#ffe0d6" });
  }
  if ((stickman.flashBlindTimer ?? 0) > 0) {
    statusTags.push({ text: `Blinded ${formatSeconds(stickman.flashBlindTimer)}`, background: "rgba(255, 230, 128, 0.32)", color: "#fff2c4" });
  }
  if ((stickman.smokeSlowTimer ?? 0) > 0) {
    statusTags.push({ text: `Smoke slow ${formatSeconds(stickman.smokeSlowTimer)}`, background: "rgba(168, 186, 208, 0.32)", color: "#e1e7f1" });
  }
  if (stickman.health <= 0) {
    statusTags.push({ text: "Downed", background: "rgba(255, 125, 109, 0.36)", color: "#ffe1d6" });
  }

  if (statusTags.length > 0) {
    let tagX = vitalsX + 16;
    let tagY = vitalsLineY;
    for (const tag of statusTags) {
      const width = drawUiTag(tag.text, tagX, tagY, tag);
      tagX += width + 8;
      if (tagX + width > vitalsX + vitalsWidth - 16) {
        tagX = vitalsX + 16;
        tagY += 24;
      }
    }
    vitalsLineY = tagY + 28;
  }

  const weaponPanelWidth = 320;
  const weaponPanelHeight = 212;
  const weaponPanelX = canvasWidth - weaponPanelWidth - 24;
  const weaponPanelY = 24;
  drawUiPanel(weaponPanelX, weaponPanelY, weaponPanelWidth, weaponPanelHeight, { accent: getCategoryAccent(currentWeapon?.category ?? "") });

  context.font = UI_TITLE_FONT;
  context.fillStyle = "#f4f7ff";
  context.fillText("Weapon", weaponPanelX + 16, weaponPanelY + 30);

  context.font = UI_TEXT_FONT;
  context.fillStyle = "#d7dff1";
  context.fillText(currentWeapon?.name ?? "Unarmed", weaponPanelX + 16, weaponPanelY + 56);

  if (currentWeapon?.category) {
    context.font = UI_SMALL_FONT;
    context.fillStyle = "#9aa6bf";
    context.fillText(currentWeapon.category.replace(/-/g, " ").toUpperCase(), weaponPanelX + 16, weaponPanelY + 74);
  }

  let weaponLineY = weaponPanelY + 100;

  if (ammoStatus) {
    const isInfinite = ammoStatus.capacity === Number.POSITIVE_INFINITY;
    const magazineDisplay = isInfinite ? "INF" : `${Math.max(0, ammoStatus.magazine)}`;
    const reserveDisplay = isInfinite ? "INF" : `${Math.max(0, ammoStatus.reserve)}`;
    context.font = UI_TEXT_FONT;
    context.fillStyle = "#d7dff1";
    context.fillText(`Magazine ${magazineDisplay}   Reserve ${reserveDisplay}`, weaponPanelX + 16, weaponLineY);
    weaponLineY += 18;
    if (!isInfinite && ammoStatus.capacity > 0) {
      drawUiProgressBar(weaponPanelX + 16, weaponLineY, weaponPanelWidth - 32, 8, clamp(ammoStatus.magazine / ammoStatus.capacity, 0, 1), { fill: "#ffd27f" });
      weaponLineY += 20;
    }
    if (ammoStatus.reloading && ammoStatus.reloadSeconds > 0) {
      const reloadProgress = 1 - clamp(ammoStatus.reloadTimer / ammoStatus.reloadSeconds, 0, 1);
      drawUiProgressBar(weaponPanelX + 16, weaponLineY, weaponPanelWidth - 32, 6, reloadProgress, { fill: "#ffcf7a" });
      weaponLineY += 16;
      context.font = UI_SMALL_FONT;
      context.fillStyle = "#ffcf7a";
      context.fillText(`Reloading ${formatSeconds(ammoStatus.reloadTimer)}`, weaponPanelX + 16, weaponLineY + 4);
      weaponLineY += 18;
    }
  } else {
    context.font = UI_TEXT_FONT;
    context.fillStyle = "#9aa6bf";
    context.fillText("No ammunition required", weaponPanelX + 16, weaponLineY);
    weaponLineY += 18;
  }

  if (throwable) {
    const ready = throwCooldown <= 0.05;
    context.font = UI_SMALL_FONT;
    context.fillStyle = ready ? "#8cffd4" : "#ffcf7a";
    context.fillText(`Throw ${ready ? "ready" : formatSeconds(throwCooldown)}`, weaponPanelX + 16, weaponLineY);
    weaponLineY += 14;
    if (throwCooldownMax > 0) {
      const throwProgress = ready ? 1 : 1 - clamp(throwCooldown / throwCooldownMax, 0, 1);
      drawUiProgressBar(weaponPanelX + 16, weaponLineY, weaponPanelWidth - 32, 6, throwProgress, { fill: "#ffd27f" });
      weaponLineY += 16;
    }
  }

  if (gadgetSlot) {
    const ready = gadgetCooldown <= 0.05;
    context.font = UI_SMALL_FONT;
    context.fillStyle = ready ? "#8cffd4" : "#7cd6ff";
    context.fillText(`Gadget ${ready ? "ready" : formatSeconds(gadgetCooldown)}`, weaponPanelX + 16, weaponLineY);
    weaponLineY += 14;
    if (gadgetCooldownMax > 0) {
      const gadgetProgress = ready ? 1 : 1 - clamp(gadgetCooldown / gadgetCooldownMax, 0, 1);
      drawUiProgressBar(weaponPanelX + 16, weaponLineY, weaponPanelWidth - 32, 6, gadgetProgress, { fill: "#7cd6ff" });
      weaponLineY += 16;
    }
  }

  const recoilMagnitude = Math.hypot(recoilOffset?.horizontal ?? 0, recoilOffset?.vertical ?? 0);
  if (recoilMagnitude > 0.05) {
    context.font = UI_SMALL_FONT;
    context.fillStyle = "#9aa6bf";
    context.fillText(`Recoil offset H ${(recoilOffset.horizontal ?? 0).toFixed(2)}  V ${(recoilOffset.vertical ?? 0).toFixed(2)}`, weaponPanelX + 16, weaponLineY);
    weaponLineY += 18;
  }

  const weaponBadges = [];
  if ((gadgetStatus?.turretCount ?? 0) > 0) {
    weaponBadges.push({ text: `Turrets ${gadgetStatus.turretCount}`, background: "rgba(140, 255, 212, 0.25)", color: "#d6ffee" });
  }
  if (gadgetStatus?.grappleActive) {
    weaponBadges.push({ text: "Grapple active", background: "rgba(124, 214, 255, 0.25)", color: "#d6f1ff" });
  }
  if (weaponBadges.length > 0) {
    let badgeX = weaponPanelX + 16;
    const badgeY = weaponPanelY + weaponPanelHeight - 28;
    for (const badge of weaponBadges) {
      const width = drawUiTag(badge.text, badgeX, badgeY, badge);
      badgeX += width + 8;
    }
  }

  const helpLines = [
    "Move: WASD / Arrows   Jump: Space   Roll: Shift",
    "Attack: Left Click or J   Throw: Right Click or G",
    "Build Mode: B toggle   , / . cycle blueprints",
    "Toggle Modes: Y Survival   K Sandbox   F9 Co-Op"
  ];
  const helpHeight = 32 + helpLines.length * 18;
  drawUiPanel(24, 24, 360, helpHeight, { accent: "rgba(146, 166, 210, 0.35)" });
  context.font = UI_TITLE_FONT;
  context.fillStyle = "#f4f7ff";
  context.fillText("Core Controls", 40, 48);
  context.font = UI_TEXT_FONT;
  context.fillStyle = "#d7dff1";
  let helpY = 70;
  for (const line of helpLines) {
    context.fillText(line, 40, helpY);
    helpY += 18;
  }

  const cards = [];
  const campaignHud = getCampaignHudStatus();
  if (campaignHud) {
    if (campaignHud.stage && campaignHud.stage !== "inactive") {
      const lines = [];
      const missionName = campaignHud.missionName ?? "Story Mission";
      const totalMissions = Math.max(0, campaignHud.totalMissions ?? 0);
      const missionIndex = campaignHud.missionIndex ?? -1;
      let missionLabel = missionName;
      if (totalMissions > 0 && missionIndex >= 0) {
        missionLabel += ` (${missionIndex + 1}/${totalMissions})`;
      }
      lines.push({ text: missionLabel, color: "#fce6b3" });
      const objective = campaignHud.objective ?? {};
      if (objective.type === "eliminate" && objective.target > 0) {
        const progress = Math.min(objective.target, Math.round(objective.progress ?? 0));
        lines.push(`${objective.label ?? "Eliminate"}: ${progress}/${objective.target}`);
      } else if (objective.type === "survive" && (objective.remaining ?? 0) > 0) {
        lines.push(`${objective.label ?? "Hold out"}: ${formatSeconds(objective.remaining)}`);
      } else if (objective.label) {
        lines.push(objective.label);
      }
      if (campaignHud.message) {
        lines.push({ text: campaignHud.message, color: "#d7dff1" });
      }
      cards.push({ title: "Campaign", accent: "#ffd66c", lines, footer: "Press Q for briefing" });
    } else {
      cards.push({ title: "Campaign", accent: "rgba(255, 214, 108, 0.22)", lines: ["Press Q to begin missions."] });
    }
  }

  const survivalHud = getSurvivalHudStatus();
  if (survivalHud) {
    const lines = [];
    const active = Boolean(survivalHud.active);
    const waveValue = Math.max(1, survivalHud.wave || survivalHud.bestWave || 1);
    lines.push(active ? `Wave ${Math.max(1, survivalHud.wave || 1)}` : `Best Wave ${Math.max(1, survivalHud.bestWave || waveValue)}`);
    if (active) {
      if (survivalHud.stage === "rest") {
        lines.push(`Resupply ${formatSeconds(survivalHud.timer ?? 0)}`);
      } else if (survivalHud.stage === "countdown") {
        lines.push(`Deploying ${formatSeconds(survivalHud.timer ?? 0)}`);
      } else {
        lines.push(`Enemies ${survivalHud.enemiesAlive}`);
      }
      lines.push(`Kills ${survivalHud.kills ?? 0}`);
    } else if (survivalHud.lastOutcome === "defeat") {
      lines.push("Defeated last run");
      lines.push(`Kills ${survivalHud.kills ?? 0} | Materials ${survivalHud.runReward ?? 0}`);
    } else {
      lines.push("Press Y to launch waves.");
      if ((survivalHud.bestKills ?? 0) > 0) {
        lines.push(`Best kills ${survivalHud.bestKills}`);
      }
    }
    cards.push({
      title: "Survival",
      accent: active ? "#ffd66c" : "rgba(255, 214, 108, 0.18)",
      lines,
      footer: active ? "Press Y to exit Survival" : "Press Y to begin Survival"
    });
  }

  const sandboxHud = getSandboxHudStatus();
  if (sandboxHud) {
    const lines = [];
    const active = Boolean(sandboxHud.active);
    if (active) {
      lines.push(`Wave ${Math.max(1, sandboxHud.wave || 1)}`);
      if (sandboxHud.inRest && (sandboxHud.restTimer ?? 0) > 0) {
        lines.push(`Next wave ${formatSeconds(sandboxHud.restTimer ?? 0)}`);
      } else {
        lines.push(`Enemies ${sandboxHud.enemiesAlive}`);
      }
      lines.push(`Kills ${sandboxHud.kills ?? 0}`);
    } else {
      lines.push("Press K to start full-arsenal skirmish.");
      if ((sandboxHud.bestWave ?? 0) > 0 || (sandboxHud.bestKills ?? 0) > 0) {
        lines.push(`Best Wave ${Math.max(1, sandboxHud.bestWave ?? 0)} | Kills ${sandboxHud.bestKills ?? 0}`);
      }
    }
    cards.push({
      title: "Sandbox",
      accent: active ? "#8cffd4" : "rgba(140, 255, 212, 0.2)",
      lines,
      footer: active ? "Press K to exit Sandbox Skirmish" : "Press K to toggle Sandbox"
    });
  }

  const coopHud = getCoopHudStatus();
  if (coopHud) {
    const lines = [];
    const active = Boolean(coopHud.active);
    if (active) {
      const participants = Math.max(0, coopHud.participants || 1);
      const maxParticipants = Math.max(participants, coopHud.maxParticipants || participants);
      lines.push(`${participants}/${maxParticipants} connected`);
      lines.push(`Latency ${Math.max(0, coopHud.averageLatency ?? 0).toFixed(0)} ms`);
      lines.push(`Throughput ${Math.max(0, coopHud.packetsPerSecond ?? 0).toFixed(1)} pkt/s`);
    } else {
      lines.push("Press F9 to open Massive Co-Op.");
      if (coopHud.lastOutcome && coopHud.lastOutcome !== "inactive") {
        lines.push(`Last session: ${coopHud.lastOutcome}`);
      }
    }
    cards.push({
      title: "Massive Co-Op",
      accent: active ? "#8cffd4" : "rgba(140, 255, 212, 0.18)",
      lines,
      footer: active ? "Press F9 to disconnect" : "Press F9 to connect"
    });
  }

  const supplyStatus = getSupplyDropStatus();
  if (supplyStatus && (supplyStatus.incomingMessage || supplyStatus.rewardMessage || (supplyStatus.activeCount ?? 0) > 0)) {
    const lines = [];
    if (supplyStatus.incomingMessage) {
      lines.push({ text: supplyStatus.incomingMessage, color: "#d6f1ff" });
    }
    if ((supplyStatus.timeUntilNext ?? 0) > 0.2 && supplyStatus.nextDropLabel) {
      lines.push(`Next drop ${supplyStatus.nextDropLabel}: ${formatSeconds(supplyStatus.timeUntilNext ?? 0)}`);
    }
    if ((supplyStatus.activeCount ?? 0) > 0) {
      lines.push(`Drops on field ${supplyStatus.activeCount}`);
    }
    if (supplyStatus.rewardMessage) {
      lines.push({ text: `Reward ${supplyStatus.rewardMessage}`, color: "#8cffd4" });
    }
    cards.push({ title: "Supply Drops", accent: "#8cffd4", lines });
  }

  const p2pStatus = getP2PStatus?.();
  if (p2pStatus && p2pStatus.status && p2pStatus.status !== "inactive") {
    const lines = [];
    lines.push(`Status: ${p2pStatus.status}`);
    if (p2pStatus.status !== "connected") {
      lines.push("Use window.P2P.createOffer() in console");
    } else {
      lines.push(`Remote peers ${getRemotePlayers().length}`);
    }
    cards.push({ title: "P2P Session", accent: "rgba(146, 166, 210, 0.35)", lines });
  }

  const cardsStartY = weaponPanelY + weaponPanelHeight + 16;
  const cardsBottom = drawUiCardStack(cards, weaponPanelX, cardsStartY, weaponPanelWidth);

  drawWeaponHotbar(weaponSlots, currentWeapon, ammoStatus, canvasWidth, canvasHeight);

  const perfMetrics = [
    ["En", "enemies"],
    ["Sq", "squad"],
    ["Veh", "vehicle"],
    ["Net", "remote"],
    ["Dst", "destructible"],
    ["Bld", "building"],
    ["Int", "interactable"],
    ["Res", "resource"]
  ];
  const performanceEntries = [];
  for (const [label, key] of perfMetrics) {
    const totalKey = `${key}Total`;
    const culledKey = `${key}Culled`;
    const total = performanceStats[totalKey] ?? 0;
    if (total <= 0) {
      continue;
    }
    const visible = Math.max(0, total - (performanceStats[culledKey] ?? 0));
    performanceEntries.push(`${label} ${visible}/${total}`);
  }

  let perfPanelTop = canvasHeight - 24;
  if (performanceEntries.length > 0) {
    context.font = UI_SMALL_FONT;
    const perfText = performanceEntries.join("   ");
    const perfWidth = Math.max(200, Math.ceil(context.measureText(perfText).width) + 32);
    const perfHeight = 48;
    const perfX = canvasWidth - perfWidth - 24;
    const perfY = canvasHeight - perfHeight - 24;
    drawUiPanel(perfX, perfY, perfWidth, perfHeight, { accent: "rgba(146, 166, 210, 0.35)", radius: 10 });
    context.save();
    context.font = UI_SMALL_FONT;
    context.fillStyle = "#9aa6bf";
    context.fillText("Performance", perfX + 16, perfY + 20);
    context.fillStyle = "#d0d7e9";
    context.fillText(perfText, perfX + 16, perfY + perfHeight - 12);
    context.restore();
    perfPanelTop = perfY;
  }

  const debugState = getPolishDebugState();
  const notices = debugState?.notices?.slice(-4).reverse() ?? [];
  const shotIndicators = debugState?.shotIndicators ?? [];
  const debugLines = [];
  for (const notice of notices) {
    const life = notice.maxTtl > 0 ? clamp(notice.ttl / notice.maxTtl, 0, 1) : 1;
    debugLines.push({ text: notice.message, alpha: life });
  }
  for (const indicator of shotIndicators) {
    const life = indicator.maxTtl > 0 ? clamp(indicator.ttl / indicator.maxTtl, 0, 1) : 1;
    debugLines.push({ text: `Shot: ${indicator.weaponId}`, alpha: life });
  }
  const activeFilters = Object.entries(debugState?.filters ?? {}).filter(([, value]) => value);
  if (activeFilters.length > 0) {
    debugLines.push({ text: `Filters ${activeFilters.map(([key]) => key).join(', ')}`, alpha: 0.85, color: "#9aa6bf" });
  }
  if (debugLines.length > 0) {
    const debugHeight = 32 + debugLines.length * 18;
    let debugY = cardsBottom + 12;
    const maxDebugY = perfPanelTop - debugHeight - 12;
    if (debugY > maxDebugY) {
      debugY = maxDebugY;
    }
    drawUiPanel(weaponPanelX, debugY, weaponPanelWidth, debugHeight, { accent: "rgba(146, 166, 210, 0.25)", radius: 10, fill: "rgba(10, 16, 26, 0.82)" });
    context.save();
    context.font = UI_SMALL_FONT;
    context.fillStyle = "#9aa6bf";
    context.fillText("Debug Feed", weaponPanelX + 16, debugY + 20);
    let debugLineY = debugY + 38;
    for (const entry of debugLines) {
      context.globalAlpha = entry.alpha ?? 1;
      context.fillStyle = entry.color ?? "#d0d7e9";
      context.fillText(entry.text, weaponPanelX + 16, debugLineY);
      debugLineY += 18;
    }
    context.restore();
  }

  context.restore();
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
  context.fillText("Toggle: L  |  Join: Enter  |  Host: H  |  Stop: U  |  Next: ] or /  |  Prev: [", x + 20, y + 68);

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
      context.fillText("Offer ready and shared with joiners.", x + 20, p2pY);
      p2pY += 16;
      context.fillStyle = "#9aa9c7";
      context.fillText(snippet(p2p.offer), x + 20, p2pY);
      p2pY += 16;
    } else {
      context.fillStyle = "#9aa9c7";
      context.fillText("Preparing host offer...", x + 20, p2pY);
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
      context.fillText("Answer applied. Waiting for host handshake.", x + 20, p2pY);
      p2pY += 16;
      context.fillStyle = "#9aa9c7";
      context.fillText(snippet(p2p.answer), x + 20, p2pY);
      p2pY += 16;
    } else {
      context.fillStyle = "#9aa9c7";
      context.fillText("Waiting for host offer...", x + 20, p2pY);
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
export { drawBackground, drawDestructibles, drawBuildings, drawInteractables, drawVehicles, drawSupplyDrops, drawRemotePlayers, drawServerBrowser, drawSquadmates, drawStickman, drawHitboxes, drawBuildPreview, drawTrainingDummy, drawEnemies, drawHud, drawProjectilesLayer, drawGadgetsLayer };











































