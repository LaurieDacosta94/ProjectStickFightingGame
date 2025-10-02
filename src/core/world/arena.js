import { context } from "../../environment/canvas.js";
import { DEBUG_PLATFORMS, LEVEL_WATER_ZONES, LEVEL_DECOR } from "../../config/constants.js";

function resolvePlatformLanding(entity, previousY, height) {
  const prevFeet = previousY + height;
  for (const platform of DEBUG_PLATFORMS) {
    if (entity.vy < 0) {
      continue;
    }
    const nextFeet = entity.y + height;
    if (prevFeet <= platform.y && nextFeet >= platform.y) {
      if (entity.x >= platform.x && entity.x <= platform.x + platform.width) {
        entity.y = platform.y - height;
        entity.vy = 0;
        if (Object.prototype.hasOwnProperty.call(entity, "onGround")) {
          entity.onGround = true;
        }
        return true;
      }
    }
  }
  return false;
}

const PLATFORM_STYLES = {
  street: { fill: "#2c2f36", stroke: "#1b1d22" },
  metro: { fill: "#3d4252", stroke: "#272b37" },
  rooftop: { fill: "#4c5566", stroke: "#2f3541" },
  skybridge: { fill: "#596274", stroke: "#323846" },
  terrace: { fill: "#46505f", stroke: "#2a303b" },
  balcony: { fill: "#525a6a", stroke: "#2f3540" },
  median: { fill: "#3a404a", stroke: "#23272f" },
  plain: { fill: "#36404c", stroke: "#222730" }
};

function drawWaterBodies() {
  for (const zone of LEVEL_WATER_ZONES) {
    const gradient = context.createLinearGradient(zone.x, zone.top, zone.x, zone.top + zone.depth);
    gradient.addColorStop(0, "rgba(54, 98, 144, 0.88)");
    gradient.addColorStop(0.7, "rgba(36, 72, 112, 0.9)");
    gradient.addColorStop(1, "rgba(24, 50, 84, 0.95)");
    context.fillStyle = gradient;
    context.fillRect(zone.x, zone.top, zone.width, zone.depth);

    context.fillStyle = "rgba(255, 204, 112, 0.25)";
    context.fillRect(zone.x - 10, zone.top + 2, zone.width + 20, 4);

    context.strokeStyle = "rgba(255, 255, 255, 0.12)";
    context.lineWidth = 1.6;
    for (let i = 0; i < zone.width; i += 40) {
      const waveY = zone.top + 6 + Math.sin((i + zone.top) * 0.03) * 3;
      context.beginPath();
      context.moveTo(zone.x + i, waveY);
      context.quadraticCurveTo(zone.x + i + 10, waveY + 3, zone.x + i + 20, waveY);
      context.stroke();
    }
  }
}

function drawPlatform(platform) {
  const style = PLATFORM_STYLES[platform.type] ?? PLATFORM_STYLES.plain;
  context.fillStyle = style.fill;
  context.fillRect(platform.x, platform.y, platform.width, platform.height);
  context.strokeStyle = style.stroke;
  context.lineWidth = 2;
  context.strokeRect(platform.x, platform.y, platform.width, platform.height);
}

function drawDecor() {
  for (const decor of LEVEL_DECOR) {
    switch (decor.type) {
      case "building": {
        context.save();
        context.fillStyle = "#2a3240";
        context.fillRect(decor.x, decor.y, decor.width, decor.height);
        context.fillStyle = "#4a6076";
        const floors = Math.max(3, Math.floor(decor.height / 60));
        for (let f = 0; f < floors; f += 1) {
          const y = decor.y + 20 + f * (decor.height / floors);
          context.fillRect(decor.x + 10, y, decor.width - 20, 8);
        }
        context.restore();
        break;
      }
      case "billboard": {
        context.save();
        context.fillStyle = "#1f2330";
        context.fillRect(decor.x - decor.width / 2, decor.y - decor.height, decor.width, decor.height);
        context.fillStyle = "#ffc851";
        context.font = "18px 'Segoe UI', Arial, sans-serif";
        context.textAlign = "center";
        context.fillText(decor.text ?? "Ad", decor.x, decor.y - decor.height / 2);
        context.strokeStyle = "#ffa940";
        context.lineWidth = 3;
        context.strokeRect(decor.x - decor.width / 2, decor.y - decor.height, decor.width, decor.height);
        context.restore();
        break;
      }
      case "streetlight": {
        context.save();
        context.strokeStyle = "#707789";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(decor.x, decor.y + 140);
        context.lineTo(decor.x, decor.y + 30);
        context.stroke();
        context.fillStyle = "#ffd97a";
        context.beginPath();
        context.arc(decor.x, decor.y + 12, 10, 0, Math.PI * 2);
        context.fill();
        context.restore();
        break;
      }
      case "hovercar": {
        context.save();
        context.fillStyle = "#5d8fff";
        context.beginPath();
        context.ellipse(decor.x, decor.y, 46, 16, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#1f2536";
        context.fillRect(decor.x - 26, decor.y - 8, 52, 16);
        context.restore();
        break;
      }
      default:
        break;
    }
  }
}

function drawDebugArena() {
  drawWaterBodies();
  for (const platform of DEBUG_PLATFORMS) {
    drawPlatform(platform);
  }
  drawDecor();
}

export { resolvePlatformLanding, drawDebugArena };
