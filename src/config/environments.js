import { canvas, GROUND_Y } from "../environment/canvas.js";

const LEVEL_SCALE = 4;
const baseLevelWidth = canvas.width;
const levelWidth = baseLevelWidth * LEVEL_SCALE;
const baseGround = GROUND_Y;

function scaleX(value) {
  return typeof value === "number" ? value * LEVEL_SCALE : value;
}

function scalePlatforms(list) {
  return list.map((platform) => ({
    ...platform,
    x: scaleX(platform.x),
    width: scaleX(platform.width)
  }));
}

function scaleWaterZones(list) {
  return list.map((zone) => ({
    ...zone,
    x: scaleX(zone.x),
    width: scaleX(zone.width)
  }));
}

function scaleDecor(list) {
  return list.map((decor) => {
    const scaled = { ...decor };
    if (typeof scaled.x === "number") {
      scaled.x = scaleX(scaled.x);
    }
    if (typeof scaled.baseX === "number") {
      scaled.baseX = scaleX(scaled.baseX);
    }
    if (typeof scaled.width === "number") {
      scaled.width = scaleX(scaled.width);
    }
    if (Array.isArray(scaled.points)) {
      scaled.points = scaled.points.map((point) => ({
        ...point,
        x: scaleX(point.x)
      }));
    }
    return scaled;
  });
}

function scaleDestructibles(list) {
  return list.map((item) => ({
    ...item,
    x: scaleX(item.x)
  }));
}

function scaleInteractables(list) {
  return list.map((item) => ({
    ...item,
    x: scaleX(item.x),
    minX: scaleX(item.minX),
    maxX: scaleX(item.maxX)
  }));
}

function scaleAmbientLights(list) {
  return list.map((light) => ({
    ...light,
    x: scaleX(light.x),
    radius: typeof light.radius === "number" ? light.radius * LEVEL_SCALE : light.radius
  }));
}

function addCentralWater(zones, overrides = {}) {
  const widthRatio = overrides.widthRatio ?? 0.05;
  const width = levelWidth * widthRatio;
  const x = levelWidth * 0.5 - width / 2;
  const topOffset = overrides.topOffset ?? 18;
  const depth = overrides.depth ?? 26;
  const centralZone = {
    x,
    width,
    top: baseGround - topOffset,
    depth,
    highlight: overrides.highlight,
    highlightColor: overrides.highlightColor,
    topColor: overrides.topColor,
    midColor: overrides.midColor,
    bottomColor: overrides.bottomColor,
    rippleColor: overrides.rippleColor
  };
  return [...zones, centralZone];
}

const neoPlatforms = scalePlatforms([
  { x: -240, y: baseGround - 26, width: 520, height: 26, type: "street" },
  { x: 320, y: baseGround - 26, width: 420, height: 26, type: "street" },
  { x: 820, y: baseGround - 26, width: 380, height: 26, type: "street" },
  { x: 1220, y: baseGround - 26, width: 520, height: 26, type: "street" },
  { x: 40, y: baseGround - 120, width: 260, height: 18, type: "metro" },
  { x: 360, y: baseGround - 180, width: 280, height: 16, type: "rooftop" },
  { x: 680, y: baseGround - 240, width: 220, height: 16, type: "skybridge" },
  { x: 960, y: baseGround - 180, width: 320, height: 18, type: "rooftop" },
  { x: 1240, y: baseGround - 140, width: 280, height: 16, type: "terrace" },
  { x: 1460, y: baseGround - 220, width: 200, height: 14, type: "balcony" },
  { x: 600, y: baseGround - 88, width: 260, height: 14, type: "median" },
  { x: 980, y: baseGround - 96, width: 320, height: 14, type: "median" }
]);

const neoWaterZones = addCentralWater(
  scaleWaterZones([
    { x: 580, width: 220, top: baseGround - 16, depth: 18 }
  ]),
  {
    topOffset: 20,
    depth: 28,
    topColor: "rgba(60, 112, 168, 0.88)",
    midColor: "rgba(36, 76, 128, 0.92)",
    bottomColor: "rgba(20, 48, 92, 0.95)",
    rippleColor: "rgba(190, 220, 255, 0.2)",
    highlightColor: "rgba(255, 236, 180, 0.25)"
  }
);

const neoDecor = scaleDecor([
  { type: "building", x: -120, y: baseGround - 360, width: 220, height: 360 },
  { type: "building", x: 220, y: baseGround - 420, width: 180, height: 420 },
  { type: "building", x: 520, y: baseGround - 360, width: 260, height: 360 },
  { type: "building", x: 860, y: baseGround - 440, width: 220, height: 440 },
  { type: "building", x: 1120, y: baseGround - 400, width: 260, height: 400 },
  { type: "building", x: 1400, y: baseGround - 360, width: 200, height: 360 },
  { type: "billboard", x: 320, y: baseGround - 210, width: 180, height: 90, text: "Neo District" },
  { type: "billboard", x: 1040, y: baseGround - 230, width: 200, height: 96, text: "Rail 7" },
  { type: "streetlight", x: 180, y: baseGround - 160 },
  { type: "streetlight", x: 760, y: baseGround - 160 },
  { type: "streetlight", x: 1280, y: baseGround - 160 },
  { type: "hovercar", x: 560, y: baseGround - 120 },
  { type: "hovercar", x: 1180, y: baseGround - 150 }
]);

const neoDestructibles = scaleDestructibles([
  { id: "neo-barrier-west", type: "concreteBarrier", x: 260, baseY: baseGround },
  { id: "neo-barrier-east", type: "concreteBarrier", x: 1140, baseY: baseGround },
  { id: "neo-car-market", type: "streetCar", x: 620, baseY: baseGround, facing: -1 },
  { id: "neo-car-docks", type: "streetCar", x: 1340, baseY: baseGround, facing: 1 },
  { id: "neo-barrels-market", type: "fuelBarrelCluster", x: 440, baseY: baseGround - 26 },
  { id: "neo-barrels-rail", type: "fuelBarrelCluster", x: 920, baseY: baseGround - 26 }
]);

const neoInteractables = scaleInteractables([
  { id: "neo-crate-market", type: "pushCrate", x: 480, baseY: baseGround - 26, minX: 200, maxX: 860 },
  { id: "neo-crate-rooftop", type: "pushCrate", x: 520, baseY: baseGround - 180, minX: 380, maxX: 620 },
  { id: "neo-barrel-metro", type: "kickBarrel", x: 180, baseY: baseGround - 120, minX: 60, maxX: 280 },
  { id: "neo-barrel-skybridge", type: "kickBarrel", x: 780, baseY: baseGround - 240, minX: 700, maxX: 880 },
  { id: "neo-trap-median", type: "shockTrap", x: 680, baseY: baseGround - 88 },
  { id: "neo-trap-gate", type: "shockTrap", x: 1260, baseY: baseGround - 26 }
]);

const neoAmbientLights = scaleAmbientLights([
  { id: "neo-street-0", type: "point", x: 180, y: baseGround - 160, radius: 220, intensity: 0.55, color: "#8faaff", smoothing: 6, flicker: 0.12 },
  { id: "neo-street-1", type: "point", x: 760, y: baseGround - 160, radius: 220, intensity: 0.55, color: "#8faaff", smoothing: 6, flicker: 0.12 },
  { id: "neo-street-2", type: "point", x: 1280, y: baseGround - 160, radius: 220, intensity: 0.55, color: "#8faaff", smoothing: 6, flicker: 0.12 }
]);

const verdantPlatforms = scalePlatforms([
  { x: -280, y: baseGround - 24, width: 520, height: 24, type: "jungleFloor" },
  { x: 320, y: baseGround - 24, width: 420, height: 24, type: "jungleFloor" },
  { x: 820, y: baseGround - 30, width: 380, height: 24, type: "jungleFloor" },
  { x: 1220, y: baseGround - 36, width: 420, height: 26, type: "jungleFloor" },
  { x: 120, y: baseGround - 150, width: 260, height: 18, type: "stone" },
  { x: 460, y: baseGround - 210, width: 280, height: 16, type: "canopy" },
  { x: 780, y: baseGround - 190, width: 240, height: 16, type: "branch" },
  { x: 1120, y: baseGround - 250, width: 220, height: 14, type: "branch" }
]);

const verdantWater = addCentralWater(
  scaleWaterZones([
    { x: 240, width: 280, top: baseGround - 16, depth: 14 },
    { x: 940, width: 210, top: baseGround - 12, depth: 12 }
  ]),
  {
    topOffset: 18,
    depth: 24,
    topColor: "rgba(56, 128, 92, 0.85)",
    midColor: "rgba(40, 96, 72, 0.88)",
    bottomColor: "rgba(24, 64, 52, 0.93)",
    rippleColor: "rgba(200, 255, 214, 0.22)",
    highlightColor: "rgba(144, 255, 200, 0.22)"
  }
);

const verdantDecor = scaleDecor([
  { type: "palm", baseX: -60, baseY: baseGround, height: 220 },
  { type: "palm", baseX: 220, baseY: baseGround - 8, height: 210 },
  { type: "palm", baseX: 520, baseY: baseGround - 12, height: 240 },
  { type: "palm", baseX: 960, baseY: baseGround - 10, height: 220 },
  { type: "ruin", x: 440, y: baseGround - 220, width: 160, height: 190 },
  { type: "ruin", x: 1080, y: baseGround - 240, width: 180, height: 210 },
  { type: "vineArch", x: 760, y: baseGround - 170, width: 200, height: 140 },
  { type: "glowPlant", x: 320, y: baseGround - 60 },
  { type: "glowPlant", x: 980, y: baseGround - 58 },
  { type: "waterfall", x: 1180, y: baseGround - 60, width: 90, height: 220 }
]);

const verdantDestructibles = scaleDestructibles([
  { id: "wilds-timber-west", type: "timberWall", x: 260, baseY: baseGround },
  { id: "wilds-timber-east", type: "timberWall", x: 1220, baseY: baseGround },
  {
    id: "wilds-spore-cell",
    type: "plasmaCell",
    x: 520,
    baseY: baseGround - 120,
    templateOverrides: {
      bodyColor: "#2e9a63",
      accentColor: "#8cffc1",
      stripeColor: "#6bffad",
      damageHighlight: "#b6ffd6",
      debrisColor: "#1c5e3a"
    }
  },
  {
    id: "wilds-cache",
    type: "sandbagLine",
    x: 880,
    baseY: baseGround - 24,
    templateOverrides: {
      bodyColor: "#4b6036",
      accentColor: "#92b56a",
      damageHighlight: "#c8e8a4",
      debrisColor: "#2e4125"
    }
  }
]);

const verdantInteractables = scaleInteractables([
  {
    id: "wilds-crate-lower",
    type: "pushCrate",
    x: 360,
    baseY: baseGround - 24,
    minX: 160,
    maxX: 560,
    templateOverrides: {
      bodyColor: "#5f7a45",
      edgeColor: "#2f4022",
      braceColor: "#9fbd67",
      highlightColor: "#d9ff8a"
    }
  },
  {
    id: "wilds-crate-canopy",
    type: "pushCrate",
    x: 540,
    baseY: baseGround - 210,
    minX: 420,
    maxX: 640,
    templateOverrides: {
      bodyColor: "#4e6d3a",
      edgeColor: "#283b1c",
      braceColor: "#8fb76a",
      highlightColor: "#c8ff99"
    }
  },
  {
    id: "wilds-barrel",
    type: "kickBarrel",
    x: 200,
    baseY: baseGround - 24,
    minX: 80,
    maxX: 360,
    templateOverrides: {
      bodyColor: "#2f8f5d",
      stripeColor: "#7dff9e",
      edgeColor: "#174027",
      topColor: "#44b574"
    }
  },
  {
    id: "wilds-trap",
    type: "shockTrap",
    x: 700,
    baseY: baseGround - 24,
    templateOverrides: {
      bodyColor: "#1d3b2c",
      accentColor: "#59ffbd",
      glowColor: "#86ffd7"
    }
  }
]);

const verdantAmbientLights = scaleAmbientLights([
  { id: "wilds-glow-0", type: "point", x: 320, y: baseGround - 80, radius: 220, intensity: 0.85, color: "#78ffbf", smoothing: 6, flicker: 0.35 },
  { id: "wilds-glow-1", type: "point", x: 980, y: baseGround - 76, radius: 210, intensity: 0.82, color: "#78ffbf", smoothing: 6, flicker: 0.32 },
  { id: "wilds-falls", type: "point", x: 1180, y: baseGround - 120, radius: 260, intensity: 0.9, color: "#6ed8ff", smoothing: 8, flicker: 0.25 }
]);

const dunePlatforms = [
  { x: -260, y: baseGround - 20, width: 540, height: 20, type: "sand" },
  { x: 360, y: baseGround - 24, width: 340, height: 18, type: "sand" },
  { x: 760, y: baseGround - 28, width: 380, height: 20, type: "sand" },
  { x: 1180, y: baseGround - 26, width: 480, height: 22, type: "sand" },
  { x: 120, y: baseGround - 140, width: 260, height: 16, type: "cliff" },
  { x: 520, y: baseGround - 200, width: 260, height: 14, type: "plateau" },
  { x: 900, y: baseGround - 180, width: 310, height: 14, type: "plateau" },
  { x: 1280, y: baseGround - 240, width: 240, height: 12, type: "plateau" }
];

const duneWater = addCentralWater(
  scaleWaterZones([
    { x: 520, width: 180, top: baseGround - 18, depth: 12 }
  ]),
  {
    topOffset: 22,
    depth: 24,
    topColor: "rgba(68, 156, 188, 0.85)",
    midColor: "rgba(40, 124, 168, 0.9)",
    bottomColor: "rgba(24, 74, 120, 0.95)",
    rippleColor: "rgba(240, 255, 214, 0.18)",
    highlightColor: "rgba(255, 204, 128, 0.26)"
  }
);

const duneDecor = scaleDecor([
  { type: "dune", baseX: 120, baseY: baseGround, width: 320, height: 120 },
  { type: "dune", baseX: 620, baseY: baseGround, width: 280, height: 100 },
  { type: "dune", baseX: 1080, baseY: baseGround, width: 340, height: 110 },
  { type: "rockSpire", baseX: 420, baseY: baseGround, height: 260 },
  { type: "rockSpire", baseX: 1160, baseY: baseGround, height: 230 },
  { type: "campfire", baseX: 660, baseY: baseGround - 20 },
  { type: "antenna", x: 920, y: baseGround - 300, height: 320 }
]);

const duneDestructibles = scaleDestructibles([
  {
    id: "dune-sandbag-west",
    type: "sandbagLine",
    x: 280,
    baseY: baseGround,
    templateOverrides: {
      bodyColor: "#c8a070",
      accentColor: "#edd0a0",
      damageHighlight: "#ffe8b2",
      debrisColor: "#8f6d45"
    }
  },
  {
    id: "dune-sandbag-east",
    type: "sandbagLine",
    x: 1180,
    baseY: baseGround,
    templateOverrides: {
      bodyColor: "#c8a070",
      accentColor: "#edd0a0",
      damageHighlight: "#ffe8b2",
      debrisColor: "#8f6d45"
    }
  },
  {
    id: "dune-rover",
    type: "roverWreck",
    x: 760,
    baseY: baseGround - 24,
    facing: -1,
    templateOverrides: {
      bodyColor: "#d1c296",
      accentColor: "#fdf4c7",
      glassColor: "#ffe8a1",
      damageHighlight: "#fff0c1",
      debrisColor: "#8f7b4a"
    }
  },
  {
    id: "dune-cell",
    type: "plasmaCell",
    x: 540,
    baseY: baseGround - 200,
    templateOverrides: {
      bodyColor: "#f07f1f",
      accentColor: "#ffd9a1",
      stripeColor: "#ffeab9",
      damageHighlight: "#fff1cb",
      debrisColor: "#a95312"
    }
  }
]);

const duneInteractables = scaleInteractables([
  {
    id: "dune-crate",
    type: "pushCrate",
    x: 360,
    baseY: baseGround - 24,
    minX: 180,
    maxX: 520,
    templateOverrides: {
      bodyColor: "#bf9a62",
      edgeColor: "#6f4f2f",
      braceColor: "#dcb678",
      highlightColor: "#ffe0a8"
    }
  },
  {
    id: "dune-barrel",
    type: "kickBarrel",
    x: 820,
    baseY: baseGround - 28,
    minX: 720,
    maxX: 960,
    templateOverrides: {
      bodyColor: "#c7672d",
      stripeColor: "#ffe49a",
      edgeColor: "#531f05",
      topColor: "#e4883d"
    }
  },
  {
    id: "dune-trap",
    type: "shockTrap",
    x: 1020,
    baseY: baseGround - 26,
    templateOverrides: {
      bodyColor: "#3a2a14",
      accentColor: "#ffcc6e",
      glowColor: "#ffe9a6"
    }
  }
]);

const duneAmbientLights = scaleAmbientLights([
  { id: "dune-fire", type: "point", x: 660, y: baseGround - 36, radius: 240, intensity: 1.2, color: "#ffb36d", smoothing: 6, flicker: 0.55 },
  { id: "dune-beacon", type: "point", x: 920, y: baseGround - 200, radius: 260, intensity: 0.9, color: "#8cc9ff", smoothing: 8, flicker: 0.35 }
]);

const orbitalPlatforms = scalePlatforms([
  { x: -200, y: baseGround - 40, width: 540, height: 18, type: "deck" },
  { x: 340, y: baseGround - 40, width: 360, height: 18, type: "deck" },
  { x: 720, y: baseGround - 40, width: 400, height: 18, type: "deck" },
  { x: 1200, y: baseGround - 40, width: 420, height: 18, type: "deck" },
  { x: 160, y: baseGround - 160, width: 260, height: 14, type: "catwalk" },
  { x: 520, y: baseGround - 220, width: 320, height: 14, type: "catwalk" },
  { x: 920, y: baseGround - 200, width: 300, height: 14, type: "maglev" },
  { x: 1280, y: baseGround - 260, width: 260, height: 12, type: "maglev" }
]);

const orbitalWater = addCentralWater(
  scaleWaterZones([]),
  {
    topOffset: 24,
    depth: 30,
    topColor: "rgba(86, 128, 220, 0.82)",
    midColor: "rgba(70, 104, 210, 0.88)",
    bottomColor: "rgba(48, 72, 180, 0.94)",
    rippleColor: "rgba(148, 208, 255, 0.28)",
    highlightColor: "rgba(160, 220, 255, 0.3)"
  }
);

const orbitalDecor = scaleDecor([
  { type: "spire", baseX: 260, baseY: baseGround, height: 300 },
  { type: "spire", baseX: 640, baseY: baseGround, height: 340 },
  { type: "spire", baseX: 1100, baseY: baseGround, height: 320 },
  { type: "holoBillboard", x: 820, y: baseGround - 220, width: 200, height: 100, text: "SYN-42" },
  { type: "energyCoil", baseX: 520, baseY: baseGround - 20, height: 180 },
  { type: "energyCoil", baseX: 1260, baseY: baseGround - 20, height: 200 },
  { type: "hovercar", x: 420, y: baseGround - 160 },
  { type: "hovercar", x: 1180, y: baseGround - 150 }
]);

const orbitalDestructibles = scaleDestructibles([
  {
    id: "orbital-barrier-west",
    type: "sandbagLine",
    x: 320,
    baseY: baseGround,
    templateOverrides: {
      bodyColor: "#3b4b63",
      accentColor: "#6c82b8",
      damageHighlight: "#a9c4ff",
      debrisColor: "#243145"
    }
  },
  {
    id: "orbital-barrier-east",
    type: "sandbagLine",
    x: 1260,
    baseY: baseGround,
    templateOverrides: {
      bodyColor: "#3b4b63",
      accentColor: "#6c82b8",
      damageHighlight: "#a9c4ff",
      debrisColor: "#243145"
    }
  },
  {
    id: "orbital-reactor",
    type: "plasmaCell",
    x: 760,
    baseY: baseGround - 40,
    templateOverrides: {
      bodyColor: "#4a9fff",
      accentColor: "#c4f5ff",
      stripeColor: "#9ef7ff",
      damageHighlight: "#d4fcff"
    }
  },
  {
    id: "orbital-rover",
    type: "roverWreck",
    x: 540,
    baseY: baseGround - 220,
    facing: 1,
    templateOverrides: {
      bodyColor: "#6f86ff",
      accentColor: "#dfe6ff",
      glassColor: "#9ffbff",
      damageHighlight: "#bcd3ff",
      debrisColor: "#3e4f9a"
    }
  }
]);

const orbitalInteractables = scaleInteractables([
  {
    id: "orbital-crate-lower",
    type: "pushCrate",
    x: 360,
    baseY: baseGround - 40,
    minX: 200,
    maxX: 520,
    templateOverrides: {
      bodyColor: "#4b5b87",
      edgeColor: "#1b233a",
      braceColor: "#7f96e8",
      highlightColor: "#a8c2ff"
    }
  },
  {
    id: "orbital-crate-upper",
    type: "pushCrate",
    x: 1080,
    baseY: baseGround - 200,
    minX: 960,
    maxX: 1180,
    templateOverrides: {
      bodyColor: "#566dac",
      edgeColor: "#243154",
      braceColor: "#8da4ff",
      highlightColor: "#c3d1ff"
    }
  },
  {
    id: "orbital-barrel",
    type: "kickBarrel",
    x: 680,
    baseY: baseGround - 40,
    minX: 620,
    maxX: 880,
    templateOverrides: {
      bodyColor: "#3d7cff",
      stripeColor: "#8df5ff",
      edgeColor: "#1c2550",
      topColor: "#64a1ff"
    }
  },
  {
    id: "orbital-trap",
    type: "shockTrap",
    x: 920,
    baseY: baseGround - 40,
    templateOverrides: {
      bodyColor: "#1f2850",
      accentColor: "#86a6ff",
      glowColor: "#b4ceff"
    }
  }
]);

const orbitalAmbientLights = scaleAmbientLights([
  { id: "orbital-coil-0", type: "point", x: 520, y: baseGround - 120, radius: 280, intensity: 1.3, color: "#7ce7ff", smoothing: 10, flicker: 0.35 },
  { id: "orbital-coil-1", type: "point", x: 1260, y: baseGround - 120, radius: 280, intensity: 1.3, color: "#7ce7ff", smoothing: 10, flicker: 0.35 },
  { id: "orbital-spire", type: "cone", x: 260, y: baseGround - 320, radius: 320, intensity: 0.9, color: "#55d9ff", direction: 0, fov: Math.PI * 0.4, stretch: 0.6, smoothing: 14 }
]);

const ENVIRONMENT_DEFINITIONS = {
  neoDistrict: {
    id: "neoDistrict",
    name: "Neo District",
    theme: "urban",
    width: levelWidth,
    background: {
      gradientStops: [
        { offset: 0, color: "#111a2c" },
        { offset: 0.4, color: "#182439" },
        { offset: 0.75, color: "#1f2d44" },
        { offset: 1, color: "#232f49" }
      ],
      horizonBand: {
        start: baseGround - 140,
        height: 120,
        topColor: "rgba(46, 86, 126, 0.25)",
        bottomColor: "rgba(28, 52, 84, 0)"
      },
      groundColor: "#1b2231",
      silhouettes: [
        {
          color: "#1a2437",
          points: [
            { x: 0, y: baseGround - 220 },
            { x: scaleX(220), y: baseGround - 260 },
            { x: scaleX(420), y: baseGround - 210 },
            { x: scaleX(640), y: baseGround - 280 },
            { x: scaleX(820), y: baseGround - 230 },
            { x: scaleX(1040), y: baseGround - 260 },
            { x: scaleX(1220), y: baseGround - 210 },
            { x: scaleX(1380), y: baseGround - 260 },
            { x: levelWidth, y: baseGround - 200 },
            { x: levelWidth, y: baseGround },
            { x: 0, y: baseGround }
          ]
        }
      ]
    },
    platforms: neoPlatforms,
    waterZones: neoWaterZones,
    decor: neoDecor,
    destructibles: neoDestructibles,
    interactables: neoInteractables,
    ambientLights: neoAmbientLights,
    spawn: {
      player: { x: levelWidth * 0.5 },
      trainingDummy: { x: levelWidth * 0.75 },
      squadOffsets: [-120, 40, 120],
      enemies: [levelWidth * 0.24, levelWidth * 0.68]
    }
  },
  verdantWilds: {
    id: "verdantWilds",
    name: "Verdant Wilds",
    theme: "jungle",
    width: levelWidth,
    background: {
      gradientStops: [
        { offset: 0, color: "#0b1613" },
        { offset: 0.45, color: "#123020" },
        { offset: 0.8, color: "#1d4a37" },
        { offset: 1, color: "#1c2d1f" }
      ],
      horizonBand: {
        start: baseGround - 160,
        height: 140,
        topColor: "rgba(34, 84, 58, 0.32)",
        bottomColor: "rgba(18, 42, 31, 0)"
      },
      groundColor: "#1c2519",
      silhouettes: [
        {
          color: "#152718",
          points: [
            { x: 0, y: baseGround - 200 },
            { x: scaleX(160), y: baseGround - 230 },
            { x: scaleX(360), y: baseGround - 210 },
            { x: scaleX(540), y: baseGround - 250 },
            { x: scaleX(760), y: baseGround - 220 },
            { x: scaleX(980), y: baseGround - 240 },
            { x: levelWidth, y: baseGround - 210 },
            { x: levelWidth, y: baseGround },
            { x: 0, y: baseGround }
          ]
        }
      ]
    },
    platforms: verdantPlatforms,
    waterZones: verdantWater,
    decor: verdantDecor,
    destructibles: verdantDestructibles,
    interactables: verdantInteractables,
    ambientLights: verdantAmbientLights,
    spawn: {
      player: { x: levelWidth * 0.45 },
      trainingDummy: { x: levelWidth * 0.8 },
      squadOffsets: [-140, -10, 120],
      enemies: [levelWidth * 0.2, levelWidth * 0.7]
    }
  },
  sunsetDunes: {
    id: "sunsetDunes",
    name: "Sunset Dunes",
    theme: "desert",
    width: levelWidth,
    background: {
      gradientStops: [
        { offset: 0, color: "#32140c" },
        { offset: 0.45, color: "#5c2814" },
        { offset: 0.78, color: "#b35a1c" },
        { offset: 1, color: "#d08b3e" }
      ],
      horizonBand: {
        start: baseGround - 150,
        height: 120,
        topColor: "rgba(206, 124, 50, 0.28)",
        bottomColor: "rgba(128, 68, 24, 0)"
      },
      groundColor: "#3c2717",
      silhouettes: [
        {
          color: "#2a1b10",
          points: [
            { x: 0, y: baseGround - 180 },
            { x: scaleX(220), y: baseGround - 200 },
            { x: scaleX(480), y: baseGround - 190 },
            { x: scaleX(720), y: baseGround - 210 },
            { x: scaleX(980), y: baseGround - 200 },
            { x: levelWidth, y: baseGround - 190 },
            { x: levelWidth, y: baseGround },
            { x: 0, y: baseGround }
          ]
        }
      ]
    },
    platforms: dunePlatforms,
    waterZones: duneWater,
    decor: duneDecor,
    destructibles: duneDestructibles,
    interactables: duneInteractables,
    ambientLights: duneAmbientLights,
    spawn: {
      player: { x: levelWidth * 0.46 },
      trainingDummy: { x: levelWidth * 0.78 },
      squadOffsets: [-140, -30, 110],
      enemies: [levelWidth * 0.22, levelWidth * 0.68]
    }
  },
  orbitalSpire: {
    id: "orbitalSpire",
    name: "Orbital Spire",
    theme: "sci-fi",
    width: levelWidth,
    background: {
      gradientStops: [
        { offset: 0, color: "#0d0f2a" },
        { offset: 0.5, color: "#141a3d" },
        { offset: 0.82, color: "#1c2856" },
        { offset: 1, color: "#1e1f2c" }
      ],
      horizonBand: {
        start: baseGround - 160,
        height: 140,
        topColor: "rgba(70, 120, 220, 0.22)",
        bottomColor: "rgba(30, 40, 90, 0)"
      },
      groundColor: "#151726",
      silhouettes: [
        {
          color: "#1a2650",
          points: [
            { x: 0, y: baseGround - 240 },
            { x: scaleX(200), y: baseGround - 320 },
            { x: scaleX(280), y: baseGround - 200 },
            { x: scaleX(520), y: baseGround - 340 },
            { x: scaleX(720), y: baseGround - 260 },
            { x: scaleX(900), y: baseGround - 320 },
            { x: scaleX(1080), y: baseGround - 220 },
            { x: scaleX(1280), y: baseGround - 340 },
            { x: levelWidth, y: baseGround - 240 },
            { x: levelWidth, y: baseGround },
            { x: 0, y: baseGround }
          ]
        }
      ]
    },
    platforms: orbitalPlatforms,
    waterZones: [],
    decor: orbitalDecor,
    destructibles: orbitalDestructibles,
    interactables: orbitalInteractables,
    ambientLights: orbitalAmbientLights,
    spawn: {
      player: { x: levelWidth * 0.5 },
      trainingDummy: { x: levelWidth * 0.82 },
      squadOffsets: [-130, -20, 120],
      enemies: [levelWidth * 0.3, levelWidth * 0.7]
    }
  }
};

const ENVIRONMENT_SEQUENCE = ["neoDistrict", "verdantWilds", "sunsetDunes", "orbitalSpire"];

export { ENVIRONMENT_DEFINITIONS, ENVIRONMENT_SEQUENCE };
