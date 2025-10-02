import { context } from "../../environment/canvas.js";
import { clamp } from "../utils/math.js";

const damagePopups = [];

function spawnDamagePopup(x, y, value) {
  damagePopups.push({
    x,
    y,
    value,
    life: 0.75,
    maxLife: 0.75,
    vx: (Math.random() - 0.5) * 24,
    vy: -60 - Math.random() * 20
  });
}

function updateDamagePopups(delta) {
  for (const popup of damagePopups) {
    popup.life -= delta;
    popup.x += popup.vx * delta;
    popup.y += popup.vy * delta;
    popup.vy -= 40 * delta;
  }

  for (let i = damagePopups.length - 1; i >= 0; i -= 1) {
    if (damagePopups[i].life <= 0) {
      damagePopups.splice(i, 1);
    }
  }
}

function drawDamagePopups() {
  context.save();
  context.font = "18px 'Segoe UI', Arial, sans-serif";
  context.textAlign = "center";
  for (const popup of damagePopups) {
    const opacity = clamp(popup.life / popup.maxLife, 0, 1);
    context.fillStyle = `rgba(255, 214, 102, ${opacity})`;
    context.fillText(`-${Math.round(popup.value)}`, popup.x, popup.y);
  }
  context.restore();
}

export { spawnDamagePopup, updateDamagePopups, drawDamagePopups };
