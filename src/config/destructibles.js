import { GROUND_Y } from "../environment/canvas.js";

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
    shakeFactor: 16
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
    deathBlast: {
      radius: 180,
      maxDamage: 240,
      knockback: 400,
      minDamageRatio: 0.4
    }
  }
};

const groundLevel = GROUND_Y;
const streetTop = GROUND_Y - 26;

const DESTRUCTIBLE_SPAWNS = [
  { id: "neo-barrier-west", type: "concreteBarrier", x: 260, baseY: groundLevel },
  { id: "neo-barrier-east", type: "concreteBarrier", x: 1140, baseY: groundLevel },
  { id: "neo-car-market", type: "streetCar", x: 620, baseY: groundLevel, facing: -1 },
  { id: "neo-car-docks", type: "streetCar", x: 1340, baseY: groundLevel, facing: 1 },
  { id: "neo-barrels-market", type: "fuelBarrelCluster", x: 440, baseY: streetTop },
  { id: "neo-barrels-rail", type: "fuelBarrelCluster", x: 920, baseY: streetTop }
];

export { DESTRUCTIBLE_TEMPLATES, DESTRUCTIBLE_SPAWNS };
