const BUILDING_DEFINITIONS = {
  barricade: {
    id: "barricade",
    name: "Reinforced Barricade",
    width: 160,
    height: 96,
    maxHealth: 600,
    cost: 40,
    color: "#4f5a6c",
    accentColor: "#8ea0ba",
    strokeColor: "#273041",
    blocking: true
  },
  watchtower: {
    id: "watchtower",
    name: "Scout Tower",
    width: 120,
    height: 200,
    maxHealth: 520,
    cost: 65,
    color: "#6c5b3f",
    accentColor: "#a7824f",
    strokeColor: "#2f2415",
    turret: {
      range: 420,
      cooldown: 1.25,
      projectile: {
        speed: 520,
        damage: 18,
        color: "#ffd57a"
      }
    }
  },
  shieldEmitter: {
    id: "shieldEmitter",
    name: "Shield Emitter",
    width: 110,
    height: 110,
    maxHealth: 360,
    cost: 55,
    color: "#2a3b58",
    accentColor: "#6fb7ff",
    strokeColor: "#152032",
    shield: {
      radius: 220,
      damageReduction: 0.4,
      buffDuration: 0.6
    },
    ambient: {
      radius: 260,
      intensity: 0.9,
      color: "#7cd6ff",
      flicker: 0.35
    }
  },
  shockTrap: {
    id: "shockTrap",
    name: "Shock Trap",
    width: 100,
    height: 28,
    maxHealth: 280,
    cost: 30,
    color: "#2b2f3c",
    accentColor: "#9af0ff",
    strokeColor: "#181b26",
    trap: {
      radius: 140,
      damage: 24,
      stun: 0.8,
      cooldown: 2.6
    },
    ambient: {
      radius: 180,
      intensity: 0.6,
      color: "#8cf2ff",
      flicker: 0.4
    }
  }
};

export { BUILDING_DEFINITIONS };
