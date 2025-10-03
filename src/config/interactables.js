const INTERACTABLE_TEMPLATES = {
  pushCrate: {
    category: "movable",
    width: 96,
    height: 72,
    mass: 3.2,
    friction: 3.6,
    maxSpeed: 160,
    pushImpulse: 360,
    hitImpulse: 520,
    bodyColor: "#8b6f4a",
    edgeColor: "#4a3b28",
    braceColor: "#c59b61",
    highlightColor: "#ffd89a"
  },
  kickBarrel: {
    category: "rolling",
    radius: 30,
    height: 78,
    mass: 1.1,
    friction: 1.8,
    maxSpeed: 320,
    pushImpulse: 280,
    hitImpulse: 680,
    bodyColor: "#a33b32",
    stripeColor: "#ffd45f",
    edgeColor: "#3a1c18",
    topColor: "#c95b4f"
  },
  shockTrap: {
    category: "trap",
    width: 110,
    height: 20,
    damage: 24,
    knockback: 90,
    launch: -160,
    cooldown: 2.8,
    stunDuration: 0.75,
    bodyColor: "#2a374b",
    accentColor: "#6ddcff",
    glowColor: "#8cf7ff"
  }
};

export { INTERACTABLE_TEMPLATES };
