import { context, GROUND_Y } from "../../environment/canvas.js";
import { getEnvironmentPlatforms, getEnvironmentWaterZones, getEnvironmentDecor } from "../../state/environment.js";

function resolvePlatformLanding(entity, previousY, height) {
  const prevFeet = previousY + height;
  const platforms = getEnvironmentPlatforms();
  for (const platform of platforms) {
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
  jungleFloor: { fill: "#314629", stroke: "#1c2917" },
  stone: { fill: "#4c5f4c", stroke: "#2a3628" },
  canopy: { fill: "#3f5e3a", stroke: "#23361f" },
  branch: { fill: "#594427", stroke: "#2e2010" },
  sand: { fill: "#cfa665", stroke: "#8a6a3a" },
  cliff: { fill: "#8b6b42", stroke: "#5b4426" },
  plateau: { fill: "#b78b4f", stroke: "#7f6032" },
  deck: { fill: "#303a4c", stroke: "#1d2431" },
  catwalk: { fill: "#3c4a63", stroke: "#212a39" },
  maglev: { fill: "#2a315a", stroke: "#181d33" },
  plain: { fill: "#36404c", stroke: "#222730" }
};

function drawWaterBodies() {
  const zones = getEnvironmentWaterZones();
  for (const zone of zones) {
    const gradient = context.createLinearGradient(zone.x, zone.top, zone.x, zone.top + zone.depth);
    gradient.addColorStop(0, zone.topColor ?? "rgba(54, 98, 144, 0.88)");
    gradient.addColorStop(0.7, zone.midColor ?? "rgba(36, 72, 112, 0.9)");
    gradient.addColorStop(1, zone.bottomColor ?? "rgba(24, 50, 84, 0.95)");
    context.fillStyle = gradient;
    context.fillRect(zone.x, zone.top, zone.width, zone.depth);

    if (zone.highlight !== false) {
      context.fillStyle = zone.highlightColor ?? "rgba(255, 204, 112, 0.25)";
      context.fillRect(zone.x - 10, zone.top + 2, zone.width + 20, 4);
    }

    const rippleColor = zone.rippleColor ?? "rgba(255, 255, 255, 0.12)";
    context.strokeStyle = rippleColor;
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

function drawBuilding(decor) {
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
}


function drawPalm(decor) {
  const baseX = decor.baseX ?? decor.x ?? 0;
  const baseY = decor.baseY ?? decor.y ?? GROUND_Y;
  const height = decor.height ?? 220;
  context.save();
  context.translate(baseX, baseY);
  context.strokeStyle = "#3c2d1b";
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(0, -height);
  context.stroke();
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(0, -height);
  context.quadraticCurveTo(18, -height + 24, 32, -height + 58);
  context.moveTo(0, -height);
  context.quadraticCurveTo(-18, -height + 24, -32, -height + 58);
  context.stroke();
  context.fillStyle = "#3f8f4a";
  for (let i = -2; i <= 2; i += 1) {
    context.beginPath();
    context.ellipse(i * 12, -height + 40, 40, 16, (Math.PI / 8) * i, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawRuin(decor) {
  context.save();
  context.fillStyle = "#484f3d";
  context.fillRect(decor.x, decor.y, decor.width, decor.height);
  context.fillStyle = "#2f3526";
  const bricks = Math.max(2, Math.floor(decor.height / 40));
  for (let i = 0; i < bricks; i += 1) {
    const y = decor.y + i * (decor.height / bricks);
    context.fillRect(decor.x + 4, y + 6, decor.width - 8, 6);
  }
  context.strokeStyle = "#9db27e";
  context.lineWidth = 3;
  context.setLineDash([6, 10]);
  context.strokeRect(decor.x + 6, decor.y + 6, decor.width - 12, decor.height - 12);
  context.setLineDash([]);
  context.restore();
}

function drawVineArch(decor) {
  context.save();
  context.strokeStyle = "#3a5c35";
  context.lineWidth = 10;
  const x = decor.x;
  const y = decor.y;
  const width = decor.width ?? 180;
  const height = decor.height ?? 120;
  context.beginPath();
  context.arc(x, y, width / 2, Math.PI, 0, false);
  context.stroke();
  context.lineWidth = 4;
  context.strokeStyle = "#5f8d4a";
  context.beginPath();
  context.arc(x, y, width / 2 - 10, Math.PI, 0, false);
  context.stroke();
  context.fillStyle = "#7fcf6a";
  for (let i = -3; i <= 3; i += 1) {
    context.beginPath();
    context.ellipse(x + i * 18, y - height * 0.4, 12, 20, Math.PI / 6, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawGlowPlant(decor) {
  const x = decor.x;
  const y = decor.y;
  context.save();
  const gradient = context.createRadialGradient(x, y, 0, x, y, 26);
  gradient.addColorStop(0, "rgba(120, 255, 191, 0.8)");
  gradient.addColorStop(1, "rgba(120, 255, 191, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, 26, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#63ffbd";
  context.beginPath();
  context.arc(x, y, 8, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawWaterfall(decor) {
  const width = decor.width ?? 80;
  const height = decor.height ?? 200;
  const x = decor.x - width / 2;
  const y = decor.y - height;
  const gradient = context.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, "rgba(110, 216, 255, 0.5)");
  gradient.addColorStop(1, "rgba(110, 216, 255, 0.1)");
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);
  context.strokeStyle = "rgba(173, 245, 255, 0.6)";
  context.lineWidth = 2;
  for (let i = 0; i < width; i += 16) {
    context.beginPath();
    context.moveTo(x + i + 4, y);
    context.lineTo(x + i + 8, y + height);
    context.stroke();
  }
}

function drawDune(decor) {
  const baseX = decor.baseX ?? decor.x ?? 0;
  const baseY = decor.baseY ?? decor.y ?? GROUND_Y;
  const width = decor.width ?? 260;
  const height = decor.height ?? 100;
  context.save();
  context.fillStyle = decor.color ?? "#d59c5a";
  context.beginPath();
  context.moveTo(baseX - width / 2, baseY);
  context.quadraticCurveTo(baseX, baseY - height, baseX + width / 2, baseY);
  context.closePath();
  context.fill();
  context.fillStyle = "rgba(255, 226, 170, 0.35)";
  context.beginPath();
  context.moveTo(baseX - width * 0.3, baseY - height * 0.25);
  context.quadraticCurveTo(baseX, baseY - height * 0.65, baseX + width * 0.35, baseY - height * 0.28);
  context.lineTo(baseX + width * 0.3, baseY - height * 0.18);
  context.fill();
  context.restore();
}

function drawRockSpire(decor) {
  const baseX = decor.baseX ?? decor.x ?? 0;
  const baseY = decor.baseY ?? decor.y ?? GROUND_Y;
  const height = decor.height ?? 240;
  context.save();
  context.fillStyle = "#7d6040";
  context.beginPath();
  context.moveTo(baseX - 18, baseY);
  context.lineTo(baseX + 18, baseY);
  context.lineTo(baseX + 6, baseY - height);
  context.lineTo(baseX - 12, baseY - height * 0.65);
  context.closePath();
  context.fill();
  context.strokeStyle = "#c6a37c";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(baseX - 4, baseY - height * 0.3);
  context.lineTo(baseX + 6, baseY - height * 0.6);
  context.stroke();
  context.restore();
}

function drawCampfire(decor) {
  const baseX = decor.baseX ?? decor.x ?? 0;
  const baseY = decor.baseY ?? decor.y ?? GROUND_Y - 20;
  context.save();
  context.strokeStyle = "#5b3e24";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(baseX - 16, baseY + 12);
  context.lineTo(baseX + 12, baseY - 4);
  context.moveTo(baseX + 16, baseY + 12);
  context.lineTo(baseX - 12, baseY - 4);
  context.stroke();
  const gradient = context.createRadialGradient(baseX, baseY - 10, 0, baseX, baseY - 10, 36);
  gradient.addColorStop(0, "rgba(255, 174, 72, 0.95)");
  gradient.addColorStop(0.5, "rgba(255, 116, 32, 0.6)");
  gradient.addColorStop(1, "rgba(255, 116, 32, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(baseX, baseY - 10, 36, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawAntenna(decor) {
  const x = decor.x;
  const y = decor.y;
  const height = decor.height ?? 300;
  context.save();
  context.strokeStyle = "#b89c6d";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(x, y + height);
  context.lineTo(x, y);
  context.stroke();
  context.strokeStyle = "#ffe6ac";
  context.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    const offset = (i + 1) * (height / 5);
    context.beginPath();
    context.moveTo(x - 18, y + offset);
    context.lineTo(x + 18, y + offset - 12);
    context.stroke();
  }
  context.fillStyle = "#ffe89a";
  context.beginPath();
  context.arc(x, y, 10, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawSpire(decor) {
  const baseX = decor.baseX ?? decor.x ?? 0;
  const baseY = decor.baseY ?? decor.y ?? GROUND_Y;
  const height = decor.height ?? 320;
  context.save();
  context.fillStyle = "#3f5ac9";
  context.beginPath();
  context.moveTo(baseX - 28, baseY);
  context.lineTo(baseX + 28, baseY);
  context.lineTo(baseX + 8, baseY - height);
  context.lineTo(baseX - 12, baseY - height * 0.6);
  context.closePath();
  context.fill();
  context.fillStyle = "rgba(120, 200, 255, 0.35)";
  context.beginPath();
  context.moveTo(baseX, baseY - height * 0.92);
  context.lineTo(baseX + 16, baseY - height * 0.4);
  context.lineTo(baseX - 4, baseY - height * 0.32);
  context.closePath();
  context.fill();
  context.restore();
}

function drawHoloBillboard(decor) {
  context.save();
  const x = decor.x - decor.width / 2;
  const y = decor.y - decor.height;
  const gradient = context.createLinearGradient(x, y, x + decor.width, y + decor.height);
  gradient.addColorStop(0, "rgba(85, 170, 255, 0.4)");
  gradient.addColorStop(1, "rgba(170, 120, 255, 0.7)");
  context.fillStyle = gradient;
  context.fillRect(x, y, decor.width, decor.height);
  context.strokeStyle = "#8bd4ff";
  context.lineWidth = 3;
  context.strokeRect(x, y, decor.width, decor.height);
  context.fillStyle = "#e5f5ff";
  context.font = "18px 'Segoe UI', Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(decor.text ?? "HOLO", decor.x, decor.y - decor.height / 2);
  context.restore();
}

function drawEnergyCoil(decor) {
  const baseX = decor.baseX ?? decor.x ?? 0;
  const baseY = decor.baseY ?? decor.y ?? GROUND_Y - 20;
  const height = decor.height ?? 180;
  context.save();
  context.strokeStyle = "#3d4e88";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(baseX - 14, baseY);
  context.lineTo(baseX - 14, baseY - height);
  context.moveTo(baseX + 14, baseY);
  context.lineTo(baseX + 14, baseY - height);
  context.stroke();
  context.strokeStyle = "#7ce7ff";
  context.lineWidth = 3;
  for (let y = 0; y <= height; y += 32) {
    context.beginPath();
    context.moveTo(baseX - 14, baseY - y);
    context.quadraticCurveTo(baseX, baseY - y - 12, baseX + 14, baseY - y - 2);
    context.stroke();
  }
  context.fillStyle = "#9ef5ff";
  context.beginPath();
  context.arc(baseX, baseY - height - 14, 18, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHovercar(decor) {
  context.save();
  context.fillStyle = "#5d8fff";
  context.beginPath();
  context.ellipse(decor.x, decor.y, 46, 16, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#1f2536";
  context.fillRect(decor.x - 26, decor.y - 8, 52, 16);
  context.restore();
}

function drawDecor() {
  const decorItems = getEnvironmentDecor();
  for (const decor of decorItems) {
    switch (decor.type) {
      case "building":
        drawBuilding(decor);
        break;
      case "billboard":
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
      case "streetlight":
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
      case "hovercar":
        drawHovercar(decor);
        break;
      case "palm":
        drawPalm(decor);
        break;
      case "ruin":
        drawRuin(decor);
        break;
      case "vineArch":
        drawVineArch(decor);
        break;
      case "glowPlant":
        drawGlowPlant(decor);
        break;
      case "waterfall":
        drawWaterfall(decor);
        break;
      case "dune":
        drawDune(decor);
        break;
      case "rockSpire":
        drawRockSpire(decor);
        break;
      case "campfire":
        drawCampfire(decor);
        break;
      case "antenna":
        drawAntenna(decor);
        break;
      case "spire":
        drawSpire(decor);
        break;
      case "holoBillboard":
        drawHoloBillboard(decor);
        break;
      case "energyCoil":
        drawEnergyCoil(decor);
        break;
      default:
        break;
    }
  }
}

function drawDebugArena() {
  drawWaterBodies();
  const platforms = getEnvironmentPlatforms();
  for (const platform of platforms) {
    drawPlatform(platform);
  }
  drawDecor();
}

export { resolvePlatformLanding, drawDebugArena };
