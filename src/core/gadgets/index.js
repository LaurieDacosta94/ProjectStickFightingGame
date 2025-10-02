import { stickman } from "../../state/entities.js";
import { deployTurret, updateTurrets, drawTurrets, clearTurrets, getTurretCount } from "./turret.js";
import { canGrapple, startGrapple, updateGrappleState, drawGrapple, hasActiveGrapple, clearGrapple } from "./grapple.js";
import { activateShield, updateShield, drawShield, clearShield, absorbShieldHit, getShieldStatus } from "./shield.js";

function deployGadget(weapon) {
  const gadgetConfig = weapon?.gadget;
  if (!gadgetConfig) {
    return false;
  }
  const cooldown = stickman.gadgetCooldown ?? 0;
  if (cooldown > 0) {
    return false;
  }

  const type = gadgetConfig.type ?? "turret";
  switch (type) {
    case "turret":
      deployTurret(gadgetConfig);
      stickman.gadgetCooldown = gadgetConfig.cooldownSeconds ?? 2.5;
      return true;
    case "grapple":
      if (!canGrapple(gadgetConfig)) {
        return false;
      }
      startGrapple(gadgetConfig);
      return true;
    case "shield":
      activateShield(gadgetConfig);
      return true;
    default:
      return false;
  }
}

function updateGadgets(delta) {
  updateTurrets(delta);
  updateShield(delta);
}

function updateGadgetMovement(delta) {
  updateGrappleState(delta);
}

function drawGadgets() {
  drawShield();
  drawTurrets();
  drawGrapple();
}

function clearGadgets() {
  clearTurrets();
  clearShield();
  clearGrapple();
}

function getGadgetStatus() {
  const shield = getShieldStatus();
  return {
    turretCount: getTurretCount(),
    grappleActive: hasActiveGrapple(),
    shieldActive: shield.active,
    shieldStrength: shield.strength,
    shieldMaxStrength: shield.maxStrength,
    gadgetCooldown: stickman.gadgetCooldown ?? 0
  };
}

export { deployGadget, updateGadgets, updateGadgetMovement, drawGadgets, clearGadgets, getGadgetStatus, absorbShieldHit };
