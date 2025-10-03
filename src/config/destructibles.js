const DESTRUCTIBLE_TEMPLATES = {
  concreteBarrier: {
    maxHealth: 600,
    width: 180,
    height: 110,
    rubbleHeight: 34,
    material: "concrete",
    bodyColor: "#4c5564",
    edgeColor: "#2a313c",
    accentColor: "#9aa4b4",
    damageHighlight: "#d5dde8",
    debrisColor: "#3a424f",
    smokeDuration: 2.4,
    shakeFactor: 16,
    salvage: 12
  },
  streetCar: {
    maxHealth: 420,
    width: 168,
    height: 90,
    rubbleHeight: 38,
    material: "vehicle",
    bodyColor: "#ba3c38",
    edgeColor: "#1c1d25",
    accentColor: "#f4f7fb",
    glassColor: "#4ac3ff",
    damageHighlight: "#ffe5dc",
    debrisColor: "#5a1f1a",
    smokeDuration: 3.4,
    shakeFactor: 22,
    salvage: 18,
    deathBlast: {
      radius: 140,
      maxDamage: 160,
      knockback: 320,
      minDamageRatio: 0.32
    }
  },
  fuelBarrelCluster: {
    maxHealth: 220,
    width: 96,
    height: 96,
    rubbleHeight: 28,
    material: "volatile",
    bodyColor: "#c0671c",
    edgeColor: "#2f1a08",
    accentColor: "#ffe7ba",
    stripeColor: "#ffd45f",
    damageHighlight: "#ffd4a1",
    debrisColor: "#6e2c05",
    smokeDuration: 4.2,
    shakeFactor: 26,
    salvage: 22,
    deathBlast: {
      radius: 180,
      maxDamage: 240,
      knockback: 400,
      minDamageRatio: 0.4
    }
  },
  timberWall: {
    maxHealth: 540,
    width: 172,
    height: 102,
    rubbleHeight: 32,
    material: "concrete",
    bodyColor: "#5c4b2d",
    edgeColor: "#362a18",
    accentColor: "#8b7344",
    damageHighlight: "#f5d6a4",
    debrisColor: "#3a2d1a",
    smokeDuration: 2.1,
    shakeFactor: 18,
    salvage: 16
  },
  sandbagLine: {
    maxHealth: 520,
    width: 200,
    height: 88,
    rubbleHeight: 30,
    material: "concrete",
    bodyColor: "#c2a274",
    edgeColor: "#7a6142",
    accentColor: "#e3cc9b",
    damageHighlight: "#ffe8b8",
    debrisColor: "#8a6d48",
    smokeDuration: 1.9,
    shakeFactor: 14,
    salvage: 14
  },
  roverWreck: {
    maxHealth: 380,
    width: 176,
    height: 96,
    rubbleHeight: 36,
    material: "vehicle",
    bodyColor: "#8d9fb4",
    edgeColor: "#1f2a35",
    accentColor: "#f5f9ff",
    glassColor: "#9be9ff",
    damageHighlight: "#d6e2ff",
    debrisColor: "#46586a",
    smokeDuration: 3.1,
    shakeFactor: 20,
    salvage: 20,
    deathBlast: {
      radius: 120,
      maxDamage: 120,
      knockback: 240,
      minDamageRatio: 0.28
    }
  },
  plasmaCell: {
    maxHealth: 260,
    width: 102,
    height: 102,
    rubbleHeight: 26,
    material: "volatile",
    bodyColor: "#3b89ff",
    edgeColor: "#15213a",
    accentColor: "#8bd4ff",
    stripeColor: "#62f5ff",
    damageHighlight: "#b0f0ff",
    debrisColor: "#1c3c66",
    smokeDuration: 4.6,
    shakeFactor: 30,
    salvage: 26,
    deathBlast: {
      radius: 220,
      maxDamage: 280,
      knockback: 420,
      minDamageRatio: 0.45
    }
  }
};

export { DESTRUCTIBLE_TEMPLATES };
