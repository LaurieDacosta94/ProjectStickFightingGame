const SUPPLY_DROP_TYPES = {
  ammo: {
    id: "ammo",
    label: "Ammo Cache",
    description: "Refills magazines and reserves for all weapons.",
    weight: 0.45,
    crateColor: "#4d7cff",
    glowColor: "#b5c8ff"
  },
  medkit: {
    id: "medkit",
    label: "Field Medkit",
    description: "Restores health and grants brief damage resistance.",
    weight: 0.35,
    crateColor: "#ff6f6f",
    glowColor: "#ffb4b4"
  },
  heavy: {
    id: "heavy",
    label: "Heavy Arsenal",
    description: "Drops a powerful heavy weapon with fresh ammo.",
    weight: 0.2,
    crateColor: "#ffb347",
    glowColor: "#ffe0a3",
    weaponId: "thunderCannon"
  }
};

const SUPPLY_DROP_SETTINGS = {
  initialDelay: 18,
  intervalMin: 26,
  intervalMax: 38,
  maxActiveDrops: 3,
  spawnHeight: 280,
  driftSpeed: 18,
  descentAcceleration: 140,
  maxDescentSpeed: 180,
  pickupRadius: 68,
  despawnDelay: 12,
  collectedFanfare: 3.5,
  warningLead: 6,
  armorBoostDuration: 6,
  armorBoostValue: 0.4
};

export { SUPPLY_DROP_TYPES, SUPPLY_DROP_SETTINGS };
