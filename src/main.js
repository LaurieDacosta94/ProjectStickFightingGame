import "./styles.css";
import { context } from "./environment/canvas.js";
import { getCamera } from "./state/camera.js";
import { initializeEnvironmentControls } from "./state/environment.js";

import { initializeInput } from "./core/input/index.js";
import { initializeWeaponControls } from "./core/combat/weapons.js";
import { initializePlaceholderAudio } from "./core/audio/placeholder.js";
import { initializeP2PNetworking } from "./core/network/p2p.js";
import { drawBackground, drawDestructibles, drawInteractables, drawVehicles, drawSupplyDrops, drawRemotePlayers, drawServerBrowser, drawSquadmates, drawStickman, drawHitboxes, drawTrainingDummy, drawEnemies, drawHud, drawProjectilesLayer, drawGadgetsLayer } from "./core/render/index.js";
import { drawDebugArena } from "./core/world/arena.js";
import { drawDamagePopups } from "./core/effects/damage.js";
import { drawLighting } from "./core/effects/lighting.js";
import { drawRagdolls } from "./core/effects/ragdoll.js";
import { updateGame } from "./core/world/update.js";

initializeInput();
initializeWeaponControls();
initializePlaceholderAudio();
initializeP2PNetworking();
initializeEnvironmentControls();

let lastTime = performance.now();

function loop(timestamp) {
  const delta = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  updateGame(delta);

  const camera = getCamera();
  drawBackground(camera);

  context.save();
  context.translate(-camera.offsetX, 0);

  drawDebugArena();
  drawDestructibles();
  drawInteractables();
  drawVehicles();
  drawSupplyDrops();
  drawRemotePlayers();
  drawSquadmates();
  drawTrainingDummy();
  drawEnemies();
  drawGadgetsLayer();
  drawRagdolls();
  drawStickman();
  drawHitboxes();
  drawProjectilesLayer();
  drawLighting();
  drawDamagePopups();
  context.restore();

  drawHud();
  drawServerBrowser();

  window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);
