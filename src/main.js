import "./styles.css";

import { initializeInput } from "./core/input/index.js";
import { initializeWeaponControls } from "./core/combat/weapons.js";
import { initializePlaceholderAudio } from "./core/audio/placeholder.js";
import { initializeP2PNetworking } from "./core/network/p2p.js";
import { drawBackground, drawDestructibles, drawVehicles, drawSupplyDrops, drawRemotePlayers, drawServerBrowser, drawSquadmates, drawStickman, drawHitboxes, drawTrainingDummy, drawEnemies, drawHud, drawProjectilesLayer, drawGadgetsLayer } from "./core/render/index.js";
import { drawDebugArena } from "./core/world/arena.js";
import { drawDamagePopups } from "./core/effects/damage.js";
import { drawRagdolls } from "./core/effects/ragdoll.js";
import { updateGame } from "./core/world/update.js";

initializeInput();
initializeWeaponControls();
initializePlaceholderAudio();
initializeP2PNetworking();

let lastTime = performance.now();

function loop(timestamp) {
  const delta = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  updateGame(delta);

  drawBackground();
  drawDebugArena();
  drawDestructibles();
  drawVehicles();
  drawSupplyDrops();
  drawRemotePlayers();
  drawServerBrowser();
  drawSquadmates();
  drawTrainingDummy();
  drawEnemies();
  drawGadgetsLayer();
  drawRagdolls();
  drawStickman();
  drawHitboxes();
  drawProjectilesLayer();
  drawDamagePopups();
  drawHud();

  window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);


