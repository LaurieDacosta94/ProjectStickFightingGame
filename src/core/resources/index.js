import { spawnRingBurst } from "../effects/particles.js";
import { GROUND_Y } from "../../environment/canvas.js";
import { stickman } from "../../state/entities.js";
import { getResourceState, addMaterials } from "../../state/resources.js";
import { clamp } from "../utils/math.js";

const SALVAGE_GRAVITY = 520;

function updateSalvagePickups(delta) {
  const state = getResourceState();
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = state.pickups[i];
    if (!pickup) {
      state.pickups.splice(i, 1);
      continue;
    }
    pickup.ttl -= delta;
    if (pickup.ttl <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    pickup.vy = (pickup.vy ?? -80) + SALVAGE_GRAVITY * delta;
    pickup.x += (pickup.vx ?? 0) * delta;
    pickup.y += pickup.vy * delta;
    if (pickup.y >= GROUND_Y - 12) {
      pickup.y = GROUND_Y - 12;
      pickup.vx = (pickup.vx ?? 0) * 0.65;
      pickup.vy *= -0.35;
    }
    const dx = pickup.x - stickman.x;
    const dy = pickup.y - (stickman.y + stickman.currentPose?.headRadius ?? 16);
    const distance = Math.hypot(dx, dy);
    if (distance < 38) {
      addMaterials(pickup.amount ?? 5);
      spawnRingBurst({
        x: pickup.x,
        y: pickup.y,
        startRadius: 12,
        endRadius: 46,
        color: "#a9ffd1",
        ttl: 0.28
      });
      state.pickups.splice(i, 1);
    }
  }
}

export { updateSalvagePickups };
