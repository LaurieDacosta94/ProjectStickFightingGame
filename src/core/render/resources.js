import { context } from "../../environment/canvas.js";
import { getResourceState } from "../../state/resources.js";
import { clamp } from "../utils/math.js";

function drawSalvagePickups() {
  const state = getResourceState();
  if (!state.pickups || state.pickups.length === 0) {
    return;
  }
  context.save();
  for (const pickup of state.pickups) {
    const lifeRatio = pickup.maxTtl > 0 ? clamp(pickup.ttl / pickup.maxTtl, 0, 1) : 1;
    context.fillStyle = `rgba(150, 255, 200, ${0.35 + lifeRatio * 0.45})`;
    context.beginPath();
    context.arc(pickup.x, pickup.y, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e0ffe8";
    context.beginPath();
    context.arc(pickup.x, pickup.y, 4.5, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export { drawSalvagePickups };
