import { context, GROUND_Y } from "../../environment/canvas.js";
import { SPEED, POSES } from "../../config/constants.js";
import { getShoulderAnchor } from "../aim/index.js";
import { clamp } from "../utils/math.js";
import { getElapsedTime } from "../utils/time.js";

function resolveAim(entity, pose, aimRecord, fallbackFacing = 1) {
  const fallbackAngle = fallbackFacing >= 0 ? 0 : Math.PI;
  const anchor = getShoulderAnchor(entity, pose);
  if (!aimRecord) {
    const vx = Math.cos(fallbackAngle);
    const vy = Math.sin(fallbackAngle);
    return {
      angle: fallbackAngle,
      vectorX: vx,
      vectorY: vy,
      anchorX: anchor.x,
      anchorY: anchor.y,
      active: false
    };
  }
  const angle = Number.isFinite(aimRecord.angle) ? aimRecord.angle : fallbackAngle;
  const vectorX = Number.isFinite(aimRecord.vectorX) ? aimRecord.vectorX : Math.cos(angle);
  const vectorY = Number.isFinite(aimRecord.vectorY) ? aimRecord.vectorY : Math.sin(angle);
  const anchorX = Number.isFinite(aimRecord.anchorX) ? aimRecord.anchorX : anchor.x;
  const anchorY = Number.isFinite(aimRecord.anchorY) ? aimRecord.anchorY : anchor.y;
  return {
    angle,
    vectorX,
    vectorY,
    anchorX,
    anchorY,
    active: Boolean(aimRecord.active)
  };
}

function computeArmSegments(anchor, { length, aimAngle, bendDirection = 1, stretch = 1, elbowOffset = 10 }) {
  const effectiveLength = Math.max(0, length * stretch);
  const elbowDistance = effectiveLength * 0.55;
  const offset = elbowOffset * bendDirection;
  const cos = Math.cos(aimAngle);
  const sin = Math.sin(aimAngle);
  const elbowX = anchor.x + cos * elbowDistance - sin * offset;
  const elbowY = anchor.y + sin * elbowDistance + cos * offset;
  const handX = anchor.x + cos * effectiveLength;
  const handY = anchor.y + sin * effectiveLength;
  return {
    elbow: { x: elbowX, y: elbowY },
    hand: { x: handX, y: handY }
  };
}

function computeLegSegments(hip, { length, offsetX, phase, lift }) {
  const footX = hip.x + offsetX;
  const footY = GROUND_Y;
  const swing = Math.max(0, -phase);
  const kneeLift = swing * lift;
  const kneeYBase = hip.y + length * 0.6;
  const kneeY = Math.min(kneeYBase, footY - length * 0.42 - kneeLift);
  const kneeX = hip.x + offsetX * 0.5;
  return {
    knee: { x: kneeX, y: kneeY },
    foot: { x: footX, y: footY }
  };
}

function drawLimb(hip, limb, color, lineWidth, alpha = 1) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.globalAlpha = alpha;
  context.beginPath();
  context.moveTo(hip.x, hip.y);
  context.lineTo(limb.knee.x, limb.knee.y);
  context.lineTo(limb.foot.x, limb.foot.y);
  context.stroke();
  context.restore();
}

function drawArm(shoulder, arm, color, lineWidth, alpha = 1) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.globalAlpha = alpha;
  context.beginPath();
  context.moveTo(shoulder.x, shoulder.y);
  context.lineTo(arm.elbow.x, arm.elbow.y);
  context.lineTo(arm.hand.x, arm.hand.y);
  context.stroke();
  context.restore();
}

function drawHand(point, radius, color) {
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function getWeaponVisual(weapon) {
  if (!weapon || !weapon.category) {
    return null;
  }
  const category = weapon.category;
  if (category.startsWith("melee")) {
    const isMid = category.includes("mid") || category.includes("long");
    const length = isMid ? 72 : 56;
    return {
      length,
      thickness: isMid ? 6 : 5,
      color: "#ffcc80",
      detailColor: "#ffdca6",
      handleOffset: length * 0.5,
      strapColor: "#ffe6b8"
    };
  }
  if (category.startsWith("ranged-heavy")) {
    const length = 68;
    return {
      length,
      thickness: 12,
      color: "#4d596b",
      detailColor: "#9aa9c7",
      handleOffset: length * 0.32,
      strapColor: "#5f6d82"
    };
  }
  if (category.startsWith("ranged-mid")) {
    const length = 50;
    return {
      length,
      thickness: 9,
      color: "#4a5668",
      detailColor: "#8294b8",
      handleOffset: length * 0.28,
      strapColor: "#7687ab"
    };
  }
  if (category.startsWith("ranged")) {
    const length = 38;
    return {
      length,
      thickness: 7,
      color: "#4f5a6b",
      detailColor: "#9aa9c7",
      handleOffset: length * 0.22,
      strapColor: "#7c8baa"
    };
  }
  if (category.startsWith("throwable")) {
    return {
      length: 18,
      thickness: 10,
      color: "#adb7c4",
      detailColor: "#e3e6eb",
      handleOffset: 6,
      strapColor: "#c6ccd8"
    };
  }
  return null;
}

function drawWeaponSprite(weaponVisual, hand, supportHand, aimAngle) {
  if (!weaponVisual) {
    return;
  }
  const { length, thickness, color, detailColor, handleOffset, strapColor } = weaponVisual;
  context.save();
  context.translate(hand.x, hand.y);
  context.rotate(aimAngle);
  context.fillStyle = color;
  context.fillRect(-handleOffset, -thickness * 0.5, length, thickness);
  if (detailColor) {
    context.fillStyle = detailColor;
    context.fillRect(-handleOffset + length * 0.2, -thickness * 0.33, length * 0.18, thickness * 0.66);
    context.fillRect(-handleOffset + length * 0.7, -thickness * 0.18, length * 0.12, thickness * 0.36);
  }
  context.restore();

  if (supportHand) {
    context.save();
    context.strokeStyle = strapColor ?? color;
    context.lineWidth = Math.max(2, thickness * 0.25);
    context.beginPath();
    context.moveTo(hand.x, hand.y);
    context.lineTo(supportHand.x, supportHand.y);
    context.stroke();
    context.restore();
  }
}

function drawRoundedRectPath(x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) * 0.5));
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawJetpackCosmetic(style, { entityX, shoulder, hip }) {
  if (!style) {
    return;
  }
  const baseY = shoulder.y + 4;
  const packHeightDual = Math.max(32, hip.y - baseY + 12);
  if (style.type === "dual") {
    const packWidth = 12;
    const offset = 18;
    context.save();
    context.globalAlpha = 0.9;
    context.fillStyle = style.bodyColor ?? "#1f2d44";
    context.fillRect(entityX - offset - packWidth / 2, baseY, packWidth, packHeightDual);
    context.fillRect(entityX + offset - packWidth / 2, baseY, packWidth, packHeightDual);
    if (style.accentColor) {
      context.strokeStyle = style.accentColor;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(entityX - offset, baseY + 6);
      context.lineTo(entityX - offset, baseY + packHeightDual - 10);
      context.moveTo(entityX + offset, baseY + 6);
      context.lineTo(entityX + offset, baseY + packHeightDual - 10);
      context.stroke();
    }
    context.restore();

    if (style.exhaustColor) {
      const flameWidth = packWidth * 0.8;
      const flameHeight = 18;
      context.save();
      context.fillStyle = style.exhaustColor;
      context.globalAlpha = style.exhaustAlpha ?? 0.7;
      context.beginPath();
      context.moveTo(entityX - offset - flameWidth / 2, baseY + packHeightDual);
      context.lineTo(entityX - offset, baseY + packHeightDual + flameHeight);
      context.lineTo(entityX - offset + flameWidth / 2, baseY + packHeightDual);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(entityX + offset - flameWidth / 2, baseY + packHeightDual);
      context.lineTo(entityX + offset, baseY + packHeightDual + flameHeight);
      context.lineTo(entityX + offset + flameWidth / 2, baseY + packHeightDual);
      context.closePath();
      context.fill();
      context.restore();
    }
    return;
  }
  if (style.type === "shielded") {
    const packWidth = 28;
    const packHeight = Math.max(36, hip.y - baseY + 16);
    context.save();
    context.globalAlpha = 0.92;
    context.fillStyle = style.bodyColor ?? "#3a2f2f";
    drawRoundedRectPath(entityX - packWidth / 2, baseY, packWidth, packHeight, 10);
    context.fill();
    if (style.panelColor) {
      context.fillStyle = style.panelColor;
      drawRoundedRectPath(entityX - packWidth / 2 + 4, baseY + 6, packWidth - 8, packHeight - 12, 6);
      context.fill();
    }
    context.restore();
    if (style.exhaustColor) {
      context.save();
      context.fillStyle = style.exhaustColor;
      context.globalAlpha = style.exhaustAlpha ?? 0.8;
      const flameWidth = 20;
      const flameHeight = 20;
      context.beginPath();
      context.moveTo(entityX - flameWidth / 2, baseY + packHeight);
      context.lineTo(entityX, baseY + packHeight + flameHeight);
      context.lineTo(entityX + flameWidth / 2, baseY + packHeight);
      context.closePath();
      context.fill();
      context.restore();
    }
    return;
  }
}

function drawArmorCosmetic(style, { entityX, shoulder, hip, lineWidth }) {
  if (!style) {
    return;
  }
  const topY = shoulder.y + 4;
  const bottomY = hip.y - 10;
  if (style.type === "harness") {
    context.save();
    context.strokeStyle = style.strapColor ?? "#444b63";
    context.lineWidth = Math.max(3, lineWidth * 0.85);
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(entityX - 16, topY);
    context.lineTo(entityX - 6, bottomY);
    context.moveTo(entityX + 16, topY);
    context.lineTo(entityX + 6, bottomY);
    context.stroke();
    if (style.accentColor) {
      context.strokeStyle = style.accentColor;
      context.lineWidth = 2.4;
      context.beginPath();
      context.moveTo(entityX - 14, topY + 16);
      context.lineTo(entityX + 14, topY + 16);
      context.stroke();
    }
    context.restore();
    return;
  }
  if (style.type === "plating") {
    const chestWidth = 34;
    const chestHeight = Math.max(28, bottomY - topY);
    const chestX = entityX - chestWidth / 2;
    context.save();
    context.globalAlpha = 0.94;
    context.fillStyle = style.plateColor ?? "#212733";
    drawRoundedRectPath(chestX, topY, chestWidth, chestHeight, 10);
    context.fill();
    if (style.trimColor) {
      context.strokeStyle = style.trimColor;
      context.lineWidth = 2;
      drawRoundedRectPath(chestX + 1, topY + 1, chestWidth - 2, chestHeight - 2, 9);
      context.stroke();
    }
    if (style.glowColor) {
      context.fillStyle = style.glowColor;
      context.globalAlpha = 0.7;
      context.beginPath();
      context.arc(entityX, topY + chestHeight * 0.55, 4, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    return;
  }
  if (style.type === "webbing") {
    const strapWidth = 36;
    const strapHeight = 5;
    context.save();
    context.globalAlpha = 0.9;
    context.fillStyle = style.strapColor ?? "#2f3a44";
    for (let i = 0; i < 3; i += 1) {
      const y = topY + 6 + i * 10;
      context.fillRect(entityX - strapWidth / 2, y, strapWidth, strapHeight);
    }
    if (style.pouchColor) {
      const pouchWidth = 10;
      const pouchHeight = 12;
      const y = bottomY - pouchHeight - 2;
      context.fillStyle = style.pouchColor;
      context.fillRect(entityX - pouchWidth - 4, y, pouchWidth, pouchHeight);
      context.fillRect(entityX + 4, y, pouchWidth, pouchHeight);
    }
    if (style.accentColor) {
      context.strokeStyle = style.accentColor;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(entityX - 18, topY + 12);
      context.lineTo(entityX + 18, topY + 12);
      context.stroke();
    }
    context.restore();
  }
}

function drawHelmetCosmetic(style, { headCenterX, headCenterY, headRadius, aimAngle }) {
  if (!style) {
    return;
  }
  const shellRadius = headRadius + 2;
  if (style.type === "visor") {
    context.save();
    context.lineCap = "round";
    context.strokeStyle = style.shellColor ?? "#1a2233";
    context.lineWidth = headRadius * 0.7;
    context.beginPath();
    context.arc(headCenterX, headCenterY, shellRadius, Math.PI * 0.55, Math.PI * 1.45);
    context.stroke();
    if (style.accentColor) {
      context.strokeStyle = style.accentColor;
      context.lineWidth = headRadius * 0.32;
      context.beginPath();
      context.arc(headCenterX, headCenterY, shellRadius - 1, Math.PI * 0.6, Math.PI * 1.4);
      context.stroke();
    }
    context.restore();

    context.save();
    context.translate(headCenterX, headCenterY);
    context.rotate(aimAngle);
    const visorWidth = headRadius * 1.5;
    const visorHeight = headRadius * 0.8;
    context.fillStyle = style.visorColor ?? "#68e7ff";
    context.globalAlpha = style.visorAlpha ?? 0.65;
    context.fillRect(-visorWidth / 2, -visorHeight / 2, visorWidth, visorHeight);
    context.globalAlpha = 1;
    context.strokeStyle = style.shellColor ?? "#1a2233";
    context.lineWidth = 2;
    context.strokeRect(-visorWidth / 2, -visorHeight / 2, visorWidth, visorHeight);
    context.restore();
    return;
  }
  if (style.type === "plated") {
    context.save();
    context.lineCap = "round";
    context.strokeStyle = style.shellColor ?? "#2f2a3f";
    context.lineWidth = headRadius * 0.8;
    context.beginPath();
    context.arc(headCenterX, headCenterY, shellRadius, Math.PI * 0.6, Math.PI * 1.4);
    context.stroke();
    if (style.accentColor) {
      context.strokeStyle = style.accentColor;
      context.lineWidth = headRadius * 0.38;
      context.beginPath();
      context.arc(headCenterX, headCenterY, shellRadius - 1, Math.PI * 0.7, Math.PI * 1.3);
      context.stroke();
    }
    if (style.trimColor) {
      context.strokeStyle = style.trimColor;
      context.lineWidth = 2.4;
      context.beginPath();
      context.arc(headCenterX, headCenterY, shellRadius + 1, Math.PI * 0.52, Math.PI * 1.48);
      context.stroke();
    }
    context.restore();
  }
}

function renderStickFigure(params) {
  const {
    entity,
    pose = POSES.standing,
    aim: aimRecord = null,
    weapon = null,
    weaponVisual: providedWeaponVisual = null,
    cosmetics = null,
    primaryColor = "#f4f7ff",
    supportColor = primaryColor,
    lineWidth = 4,
    crouching = false,
    rolling = false,
    label = null,
    labelColor = "#d0d4de",
    showHealthBar = false,
    healthRatio = null,
    healthColor = "#5fffb5",
    flashColor = null,
    flashAmount = 0,
    highlightColor = null,
    attackInfo = null
  } = params;

  const resolvedPose = pose ?? POSES.standing;
  const fallbackFacing = entity.facing ?? ((entity.vx ?? 0) >= 0 ? 1 : -1);
  const aim = resolveAim(entity, resolvedPose, aimRecord, fallbackFacing);
  const weaponVisual = providedWeaponVisual ?? getWeaponVisual(weapon);

  const headRadius = resolvedPose.headRadius ?? 16;
  const bodyLength = resolvedPose.bodyLength ?? 34;
  const legLength = resolvedPose.legLength ?? 36;
  const armLength = resolvedPose.armLength ?? 28;

  const velocityX = entity.vx ?? 0;
  const speedRatio = clamp(Math.abs(velocityX) / SPEED, 0, 1);
  const elapsed = getElapsedTime();
  const torsoLean = clamp(velocityX / SPEED, -1, 1) * 0.28;

  const crouchOffset = crouching ? 6 : 0;
  const headCenterX = entity.x + torsoLean * 6;
  const headCenterY = entity.y + headRadius - crouchOffset * 0.5;
  const neckY = entity.y + headRadius * 2 - crouchOffset * 0.6;
  const shoulderY = neckY + 6 - crouchOffset * 0.4;
  const hipX = entity.x + torsoLean * 4;
  const hipY = shoulderY + bodyLength - crouchOffset;

  const shoulder = { x: headCenterX, y: shoulderY };
  const hip = { x: hipX, y: hipY };

  const stridePhase = elapsed * (4.8 + speedRatio * 5.6);
  const baseSpacing = legLength * (0.25 + speedRatio * 0.18) * (crouching ? 0.7 : 1);
  const liftHeight = crouching ? 5 : Math.max(8, legLength * 0.22);
  const leftPhase = Math.sin(stridePhase);
  const rightPhase = Math.sin(stridePhase + Math.PI);
  const leanOffset = torsoLean * 6;
  const leftOffset = -baseSpacing + leftPhase * speedRatio * legLength * 0.3 + leanOffset;
  const rightOffset = baseSpacing + rightPhase * speedRatio * legLength * 0.3 + leanOffset;

  const leftLeg = computeLegSegments(hip, { length: legLength, offsetX: leftOffset, phase: leftPhase, lift: liftHeight });
  const rightLeg = computeLegSegments(hip, { length: legLength, offsetX: rightOffset, phase: rightPhase, lift: liftHeight });

  const aimAngle = aim.angle;
  const dirX = aim.vectorX;
  const dirY = aim.vectorY;
  const forwardSign = dirX >= 0 ? 1 : -1;

  let frontAngle = aimAngle;
  let frontStretch = 1;
  let frontElbowOffset = 12 + speedRatio * 6;
  let supportAngle = aimAngle - forwardSign * 0.22;
  let supportStretch = 0.92;
  let supportElbowOffset = 8 + speedRatio * 4;

  if (attackInfo?.active) {
    const progress = clamp(attackInfo.progress ?? 0, 0, 1);
    if ((attackInfo.type ?? "").startsWith("melee")) {
      frontStretch = 1.1 + progress * 0.25;
      frontElbowOffset = 12 + progress * 16;
      frontAngle = aimAngle + forwardSign * progress * 0.45;
      supportAngle = aimAngle - forwardSign * (0.35 - progress * 0.18);
      supportStretch = 0.86;
    } else if ((attackInfo.type ?? "").startsWith("ranged")) {
      frontStretch = 1;
      frontElbowOffset = 12 + progress * 10;
      supportAngle = aimAngle - forwardSign * (0.18 - progress * 0.08);
      supportStretch = 0.94;
    }
  }

  const frontArm = computeArmSegments(shoulder, {
    length: armLength,
    aimAngle: frontAngle,
    bendDirection: forwardSign,
    stretch: frontStretch,
    elbowOffset: frontElbowOffset
  });

  const supportArm = computeArmSegments(shoulder, {
    length: armLength * supportStretch,
    aimAngle: supportAngle,
    bendDirection: -forwardSign,
    stretch: supportStretch,
    elbowOffset: supportElbowOffset
  });

  const backLeg = forwardSign >= 0 ? leftLeg : rightLeg;
  const frontLeg = forwardSign >= 0 ? rightLeg : leftLeg;
  const backArm = forwardSign >= 0 ? supportArm : frontArm;
  const frontArmToDraw = forwardSign >= 0 ? frontArm : supportArm;
  const supportArmToDraw = forwardSign >= 0 ? supportArm : frontArm;

  const baseLineWidth = lineWidth;

  const cosmeticsData = cosmetics ?? null;
  const helmetStyle = cosmeticsData?.helmet?.style ?? null;
  const armorStyle = cosmeticsData?.armor?.style ?? null;
  const jetpackStyle = cosmeticsData?.jetpack?.style ?? null;

  if (jetpackStyle && jetpackStyle.type !== "none") {
    drawJetpackCosmetic(jetpackStyle, {
      entityX: entity.x,
      shoulder,
      hip
    });
  }

  drawLimb(hip, backLeg, primaryColor, baseLineWidth, 0.55);
  drawLimb(hip, frontLeg, primaryColor, baseLineWidth, 1);

  context.save();
  context.strokeStyle = primaryColor;
  context.lineWidth = baseLineWidth;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(shoulder.x, neckY);
  context.lineTo(hip.x, hip.y);
  context.stroke();
  context.restore();

  if (armorStyle && armorStyle.type !== "none") {
    drawArmorCosmetic(armorStyle, {
      entityX: entity.x,
      shoulder,
      hip,
      lineWidth: baseLineWidth
    });
  }

  drawArm(shoulder, backArm, supportColor, baseLineWidth * 0.9, 0.45);

  drawWeaponSprite(weaponVisual, frontArm.hand, supportArm.hand, aimAngle);

  drawArm(shoulder, supportArmToDraw, supportColor, baseLineWidth * 0.9, 0.8);
  drawArm(shoulder, frontArmToDraw, primaryColor, baseLineWidth, 1);

  drawHand(supportArm.hand, 3.2, supportColor);
  drawHand(frontArm.hand, 3.4, primaryColor);

  context.save();
  context.strokeStyle = primaryColor;
  context.lineWidth = baseLineWidth;
  context.lineCap = "round";
  context.beginPath();
  context.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  if (helmetStyle && helmetStyle.type !== "none") {
    drawHelmetCosmetic(helmetStyle, {
      headCenterX,
      headCenterY,
      headRadius,
      aimAngle
    });
  }

  if (highlightColor) {
    context.save();
    context.strokeStyle = highlightColor;
    context.lineWidth = baseLineWidth * 0.6;
    context.globalAlpha = 0.6;
    context.beginPath();
    context.arc(entity.x, entity.y + headRadius, headRadius + 6, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  if (flashColor && flashAmount > 0) {
    context.save();
    context.fillStyle = flashColor;
    context.globalAlpha = clamp(flashAmount, 0, 1);
    context.beginPath();
    context.arc(frontArm.hand.x + dirX * 6, frontArm.hand.y + dirY * 6, 10, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  if (showHealthBar && healthRatio != null) {
    const width = 90;
    const height = 8;
    const barX = entity.x - width / 2;
    const barY = entity.y - headRadius * 1.6;
    context.save();
    context.fillStyle = "#232733";
    context.fillRect(barX, barY, width, height);
    context.fillStyle = healthColor;
    context.fillRect(barX, barY, width * clamp(healthRatio, 0, 1), height);
    context.strokeStyle = "#404653";
    context.lineWidth = 1.5;
    context.strokeRect(barX, barY, width, height);
    context.restore();
  }

  if (label) {
    context.save();
    context.fillStyle = labelColor;
    context.font = "14px 'Segoe UI', Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(label, entity.x, entity.y - headRadius * 1.9);
    context.restore();
  }
}

export { renderStickFigure, getWeaponVisual };