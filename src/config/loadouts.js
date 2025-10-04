const LOADOUT_SLOTS = [
  {
    id: "meleePrimary",
    label: "Melee I",
    allowedCategories: ["melee-short", "melee-mid"],
    defaultWeaponId: "combatFists"
  },
  {
    id: "meleeSecondary",
    label: "Melee II",
    allowedCategories: ["melee-short", "melee-mid"],
    defaultWeaponId: "shockBaton"
  },
  {
    id: "rangedPrimary",
    label: "Ranged",
    allowedCategories: ["ranged-short", "ranged-mid", "ranged-heavy"],
    defaultWeaponId: "strikerPistol"
  },
  {
    id: "throwableAlpha",
    label: "Throwable I",
    allowedCategories: ["throwable"],
    defaultWeaponId: "fragGrenade"
  },
  {
    id: "throwableBeta",
    label: "Throwable II",
    allowedCategories: ["throwable"],
    defaultWeaponId: "flashBang"
  },
  {
    id: "throwableGamma",
    label: "Throwable III",
    allowedCategories: ["throwable"],
    defaultWeaponId: "smokeCanister"
  },
  {
    id: "gadgetAlpha",
    label: "Gadget I",
    allowedCategories: ["gadget"],
    defaultWeaponId: "turretDrone"
  },
  {
    id: "gadgetBeta",
    label: "Gadget II",
    allowedCategories: ["gadget"],
    defaultWeaponId: "grappleRig"
  },
  {
    id: "gadgetGamma",
    label: "Gadget III",
    allowedCategories: ["gadget"],
    defaultWeaponId: "shieldBubble"
  }
];

const LOADOUT_STORAGE_KEY = "stickman-warfare-loadout.v1";

export { LOADOUT_SLOTS, LOADOUT_STORAGE_KEY };
