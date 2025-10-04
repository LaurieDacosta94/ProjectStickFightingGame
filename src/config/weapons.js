const WEAPON_DEFINITIONS = {
  combatFists: {
    id: "combatFists",
    name: "Combat Fists",
    description: "Baseline martial arts combo with balanced speed and control.",
    category: "melee-short",
    attackChain: [
      {
        name: "Quick Jab",
        windup: 0.05,
        active: 0.1,
        recovery: 0.12,
        comboStart: 0.1,
        comboWindow: 0.16,
        range: 74,
        heightOffset: -46,
        radius: 26,
        damage: 9,
        knockback: 130,
        launch: 0
      },
      {
        name: "Cross Strike",
        windup: 0.08,
        active: 0.12,
        recovery: 0.16,
        comboStart: 0.16,
        comboWindow: 0.18,
        range: 82,
        heightOffset: -40,
        radius: 28,
        damage: 14,
        knockback: 190,
        launch: 0
      },
      {
        name: "Rising Kick",
        windup: 0.11,
        active: 0.15,
        recovery: 0.22,
        comboStart: 0.22,
        comboWindow: 0.22,
        range: 68,
        heightOffset: -64,
        radius: 30,
        damage: 20,
        knockback: 240,
        launch: 200
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
        damage: 11,
        knockback: 110,
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
        damage: 18,
        knockback: 210,
        launch: 40
      },
      {
        name: "Arc Burst",
        windup: 0.15,
        active: 0.2,
        recovery: 0.3,
        comboStart: 0.28,
        comboWindow: 0.22,
        range: 94,
        heightOffset: -28,
        radius: 42,
        damage: 30,
        knockback: 340,
        launch: 210
      }
    ]
  },
  strikerPistol: {
    id: "strikerPistol",
    name: "Striker Pistol",
    description: "Semi-auto sidearm. Tap fire for consistent ranged pressure.",
    category: "ranged-short",
    attackChain: [],
    fireInterval: 0.25,
    auto: false,
    spread: {
      base: 0.5,
      perShot: 0.35,
      max: 3,
      recovery: 6
    },
    projectile: {
      radius: 6,
      speed: 560,
      damage: 16,
      knockback: 95,
      lifetime: 1.05,
      gravityFactor: 0.18,
      color: "#ffca7a"
    },
    ammo: {
      magazine: 14,
      reserve: 84,
      reloadSeconds: 1.2
    },
    recoil: {
      horizontal: 0.35,
      vertical: 1.6,
      decay: 10
    }
  },
  vectorSmg: {
    id: "vectorSmg",
    name: "Vector SMG",
    description: "Rapid PDW prototype tuned for controllable spray.",
    category: "ranged-mid",
    attackChain: [],
    fireInterval: 0.08,
    auto: true,
    projectile: {
      radius: 5,
      speed: 660,
      damage: 11,
      knockback: 75,
      lifetime: 0.9,
      gravityFactor: 0.14,
      color: "#98d8ff"
    },
    ammo: {
      magazine: 38,
      reserve: 190,
      reloadSeconds: 2.2
    },
    recoil: {
      horizontal: 1.1,
      vertical: 1.8,
      decay: 14
    },
    spread: {
      base: 1.2,
      perShot: 0.55,
      max: 7.5,
      recovery: 4
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
      explosionRadius: 125,
      damage: 50,
      knockback: 300,
      arcVelocity: { vx: 280, vy: -420 },
      gravityFactor: 0.5,
      bounciness: 0.45,
      color: "#ffb347",
      radius: 16,
      cooldownSeconds: 1.3,
      explosionDuration: 0.34,
      selfDamageScale: 0.45,
      selfKnockbackScale: 0.45,
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
      fuseSeconds: 1.15,
      explosionRadius: 170,
      damage: 0,
      knockback: 0,
      arcVelocity: { vx: 260, vy: -420 },
      gravityFactor: 0.45,
      bounciness: 0.4,
      color: "#f9f2c7",
      radius: 14,
      cooldownSeconds: 1.6,
      explosionDuration: 0.24,
      effectType: "flash",
      stunDuration: 2.2,
      playerStunDuration: 1.1
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
      cooldownSeconds: 2.2,
      explosionDuration: 0.2,
      effectType: "smoke",
      smokeDuration: 6,
      smokeRadius: 160,
      smokeExpansion: 1.4,
      smokeSlowMultiplier: 0.5,
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
      cooldownSeconds: 3.8,
      duration: 10,
      range: 280,
      fireInterval: 0.48,
      maxActive: 2,
      height: 54,
      spawnOffset: { x: 70, y: 0 },
      baseColor: "#6f7bff",
      headColor: "#d6dcff",
      projectile: {
        speed: 560,
        radius: 4,
        damage: 11,
        knockback: 90,
        lifetime: 1.25,
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
      cooldownSeconds: 1.5,
      duration: 0.65,
      maxLength: 340,
      maxRise: 280,
      travelSpeed: 940,
      pullSpeed: 820,
      color: "#8cf1ff",
    }
  },
  thunderCannon: {
    id: "thunderCannon",
    name: "Thunder Cannon",
    description: "Supply drop-exclusive launcher that fires high-impact bolts.",
    category: "ranged-heavy",
    attackChain: [],
    fireInterval: 0.6,
    auto: false,
    projectile: {
      radius: 10,
      speed: 640,
      damage: 56,
      knockback: 320,
      lifetime: 1.3,
      gravityFactor: 0.15,
      color: "#ffd76a"
    },
    ammo: {
      magazine: 3,
      reserve: 9,
      reloadSeconds: 3.4
    },
    recoil: {
      horizontal: 2.4,
      vertical: 5.8,
      decay: 6.5
    },
    spread: {
      base: 1.1,
      perShot: 0.65,
      max: 5.5,
      recovery: 2.9
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
      cooldownSeconds: 6,
      duration: 6.5,
      strength: 130,
      radius: 100,
      color: "#7cd6ff"
    }
  }
};

const DEFAULT_LOADOUT = ["combatFists", "shockBaton", "strikerPistol", "fragGrenade", "flashBang", "smokeCanister", "turretDrone", "grappleRig", "shieldBubble"];

export { WEAPON_DEFINITIONS, DEFAULT_LOADOUT };

