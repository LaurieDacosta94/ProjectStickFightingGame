const WEAPON_DEFINITIONS = {
  combatFists: {
    id: "combatFists",
    name: "Combat Fists",
    description: "Baseline martial arts combo with balanced speed and control.",
    category: "melee-short",
    attackChain: [
      {
        name: "Quick Jab",
        windup: 0.06,
        active: 0.12,
        recovery: 0.14,
        comboStart: 0.12,
        comboWindow: 0.18,
        range: 74,
        heightOffset: -46,
        radius: 26,
        damage: 8,
        knockback: 140,
        launch: 0
      },
      {
        name: "Cross Strike",
        windup: 0.08,
        active: 0.12,
        recovery: 0.18,
        comboStart: 0.18,
        comboWindow: 0.2,
        range: 82,
        heightOffset: -40,
        radius: 28,
        damage: 12,
        knockback: 180,
        launch: 0
      },
      {
        name: "Rising Kick",
        windup: 0.1,
        active: 0.14,
        recovery: 0.24,
        comboStart: 0.24,
        comboWindow: 0.2,
        range: 68,
        heightOffset: -64,
        radius: 30,
        damage: 16,
        knockback: 220,
        launch: 160
      }
    ]
  },
  shockBaton: {
    id: "shockBaton",
    name: "Shock Baton",
    description: "Electrified staff built for crowd control and guard breaks.",
    category: "melee-mid",
    attackChain: [
      {
        name: "Jab Feint",
        windup: 0.06,
        active: 0.08,
        recovery: 0.14,
        comboStart: 0.14,
        comboWindow: 0.16,
        range: 68,
        heightOffset: -30,
        radius: 26,
        damage: 9,
        knockback: 90,
        launch: 0
      },
      {
        name: "Slide Sweep",
        windup: 0.1,
        active: 0.12,
        recovery: 0.2,
        comboStart: 0.2,
        comboWindow: 0.18,
        range: 86,
        heightOffset: -12,
        radius: 34,
        damage: 16,
        knockback: 180,
        launch: 30
      },
      {
        name: "Arc Burst",
        windup: 0.16,
        active: 0.2,
        recovery: 0.32,
        comboStart: 0.32,
        comboWindow: 0.2,
        range: 94,
        heightOffset: -28,
        radius: 42,
        damage: 26,
        knockback: 280,
        launch: 160
      }
    ]
  },
  strikerPistol: {
    id: "strikerPistol",
    name: "Striker Pistol",
    description: "Semi-auto sidearm. Tap fire for consistent ranged pressure.",
    category: "ranged-short",
    attackChain: [],
    projectile: {
      radius: 6,
      speed: 520,
      damage: 14,
      knockback: 90,
      lifetime: 0.9,
      gravityFactor: 0.25,
      color: "#ffca7a"
    },
    ammo: {
      magazine: 12,
      reserve: 48,
      reloadSeconds: 1.3
    }
  },
  vectorSmg: {
    id: "vectorSmg",
    name: "Vector SMG",
    description: "Rapid PDW prototype tuned for controllable spray.",
    category: "ranged-mid",
    attackChain: [],
    projectile: {
      radius: 5,
      speed: 620,
      damage: 10,
      knockback: 70,
      lifetime: 0.85,
      gravityFactor: 0.18,
      color: "#98d8ff"
    },
    ammo: {
      magazine: 32,
      reserve: 160,
      reloadSeconds: 2.1
    },
    recoil: {
      horizontal: 0.6,
      vertical: 1.4,
      decay: 10
    },
    spread: {
      base: 1.5,
      perShot: 0.6,
      max: 6.5,
      recovery: 3.2
    }
  },
  fragGrenade: {
    id: "fragGrenade",
    name: "Frag Grenade",
    description: "Timed explosive. Toss, bounce, and detonate in a wide area.",
    category: "throwable",
    attackChain: [],
    throwable: {
      fuseSeconds: 1.6,
      explosionRadius: 120,
      damage: 45,
      knockback: 260,
      arcVelocity: { vx: 280, vy: -420 },
      gravityFactor: 0.5,
      bounciness: 0.45,
      color: "#ffb347",
      radius: 16,
      cooldownSeconds: 1.05,
      explosionDuration: 0.32,
      selfDamageScale: 0.55,
      selfKnockbackScale: 0.5,
      effectType: "explosive"
    }
  },
  flashBang: {
    id: "flashBang",
    name: "Flashbang",
    description: "Blinding charge that staggers enemies caught in the burst.",
    category: "throwable",
    attackChain: [],
    throwable: {
      fuseSeconds: 1.2,
      explosionRadius: 160,
      damage: 0,
      knockback: 0,
      arcVelocity: { vx: 260, vy: -420 },
      gravityFactor: 0.45,
      bounciness: 0.4,
      color: "#f9f2c7",
      radius: 14,
      cooldownSeconds: 1.4,
      explosionDuration: 0.24,
      effectType: "flash",
      stunDuration: 1.8,
      playerStunDuration: 0.9
    }
  },
  smokeCanister: {
    id: "smokeCanister",
    name: "Smoke Canister",
    description: "Rapid-deploy screen that slows foes and softens line of sight.",
    category: "throwable",
    attackChain: [],
    throwable: {
      fuseSeconds: 0.9,
      explosionRadius: 80,
      damage: 0,
      knockback: 0,
      arcVelocity: { vx: 220, vy: -360 },
      gravityFactor: 0.52,
      bounciness: 0.35,
      color: "#aeb9c6",
      radius: 18,
      cooldownSeconds: 2.3,
      explosionDuration: 0.2,
      effectType: "smoke",
      smokeDuration: 4.6,
      smokeRadius: 150,
      smokeExpansion: 1.35,
      smokeSlowMultiplier: 0.55,
      smokeTickDuration: 0.45
    }
  },
  turretDrone: {
    id: "turretDrone",
    name: "Deployable Turret",
    description: "Drops an auto-targeting sentry that covers a lane with suppressive fire.",
    category: "gadget",
    attackChain: [],
    gadget: {
      type: "turret",
      cooldownSeconds: 3.2,
      duration: 8.5,
      range: 260,
      fireInterval: 0.55,
      maxActive: 2,
      height: 54,
      spawnOffset: { x: 70, y: 0 },
      baseColor: "#6f7bff",
      headColor: "#d6dcff",
      projectile: {
        speed: 540,
        radius: 4,
        damage: 9,
        knockback: 80,
        lifetime: 1.1,
        color: "#9ae9ff"
      }
    }
  },
  grappleRig: {
    id: "grappleRig",
    name: "Grapple Rig",
    description: "Launch, latch, and zip to an overhead anchor for quick repositioning.",
    category: "gadget",
    attackChain: [],
    gadget: {
      type: "grapple",
      cooldownSeconds: 1.8,
      duration: 0.6,
      maxLength: 320,
      maxRise: 260,
      travelSpeed: 900,
      pullSpeed: 760,
      color: "#8cf1ff",
    }
  },
  thunderCannon: {
    id: "thunderCannon",
    name: "Thunder Cannon",
    description: "Supply drop-exclusive launcher that fires high-impact bolts.",
    category: "ranged-heavy",
    attackChain: [],
    projectile: {
      radius: 10,
      speed: 620,
      damage: 42,
      knockback: 260,
      lifetime: 1.2,
      gravityFactor: 0.18,
      color: "#ffd76a"
    },
    ammo: {
      magazine: 4,
      reserve: 12,
      reloadSeconds: 2.9
    },
    recoil: {
      horizontal: 2.2,
      vertical: 5.4,
      recovery: 6.5
    },
    spread: {
      base: 1.5,
      max: 6,
      increase: 1.1,
      recovery: 3.5
    }
  },
  shieldBubble: {
    id: "shieldBubble",
    name: "Shield Bubble",
    description: "Pop a temporary energy shell that soaks damage and keeps you grounded.",
    category: "gadget",
    attackChain: [],
    gadget: {
      type: "shield",
      cooldownSeconds: 4.5,
      duration: 6,
      strength: 90,
      radius: 96,
      color: "#7cd6ff"
    }
  }
};

const DEFAULT_LOADOUT = ["combatFists", "shockBaton", "strikerPistol", "fragGrenade", "flashBang", "smokeCanister", "turretDrone", "grappleRig", "shieldBubble"];

export { WEAPON_DEFINITIONS, DEFAULT_LOADOUT };

