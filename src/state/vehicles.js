import { canvas, GROUND_Y } from "../environment/canvas.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const VEHICLE_DEFINITIONS = {
  buggy: {
    label: "Recon Buggy",
    movementType: "ground",
    width: 132,
    height: 48,
    wheelRadius: 18,
    wheelBase: 76,
    driverSeat: { x: -6, y: 42 },
    exitOffsets: [
      { x: 72, y: 0 },
      { x: -72, y: 0 }
    ],
    enterRadius: 96,
    acceleration: 540,
    braking: 880,
    maxSpeed: 420,
    idleDrag: 320,
    airDrag: 0.92,
    baseHealth: 280,
    colorBody: "#2e3147",
    colorAccent: "#ffb84d",
    colorDetail: "#f7f9ff"
  },
  raptorHeli: {
    label: "Raptor Helicopter",
    movementType: "air",
    mountedWeapons: [
      {
        id: "raptorHeli.noseCannon",
        label: "Nose Cannon",
        binding: "primary",
        offset: { x: 32, y: 2 },
        muzzles: [
          { x: 46, y: -3 },
          { x: 46, y: 3 }
        ],
        projectile: {
          speed: 720,
          damage: 14,
          radius: 4,
          color: "#8cf4ff",
          gravityFactor: 0.04,
          knockback: 70
        },
        scatter: 3.5,
        fireInterval: 0.1,
        flashDuration: 0.07,
        flashRadius: 12,
        barrelLength: 52,
        barrelWidth: 5,
        barrelColor: "#8cf4ff"
      }
    ],
    width: 156,
    height: 54,
    driverSeat: { x: 6, y: 44 },
    exitOffsets: [
      { x: 88, y: 0 },
      { x: -88, y: 0 }
    ],
    enterRadius: 128,
    horizontalAcceleration: 320,
    horizontalMaxSpeed: 300,
    horizontalDrag: 180,
    idleDrag: 140,
    airDrag: 0.98,
    liftPower: 880,
    descendPower: 620,
    gravityScale: 0.3,
    maxVerticalSpeed: 240,
    verticalDamping: 0.9,
    hoverMinAltitude: 28,
    hoverMaxAltitude: 260,
    spawnHover: 60,
    autopilotStrength: 5.2,
    baseHealth: 420,
    colorBody: "#303952",
    colorAccent: "#8cf4ff",
    colorDetail: "#f4fbff",
    rotorSpan: 210,
    rotorThickness: 7,
    tailLength: 86
  },
  arrowJet: {
    label: "Arrow Fighter",
    movementType: "air",
    mountedWeapons: [
      {
        id: "arrowJet.rackRockets",
        label: "Wing Rockets",
        binding: "secondary",
        offset: { x: 12, y: -6 },
        muzzles: [
          { x: 52, y: -12 },
          { x: 52, y: 12 }
        ],
        projectile: {
          speed: 780,
          damage: 24,
          radius: 6,
          color: "#ff6b80",
          gravityFactor: 0.05,
          knockback: 140
        },
        scatter: 4,
        fireInterval: 0.28,
        flashDuration: 0.09,
        flashRadius: 15,
        barrelLength: 54,
        barrelWidth: 5,
        barrelColor: "#ff6b80"
      }
    ],
    width: 180,
    height: 36,
    driverSeat: { x: 0, y: 32 },
    exitOffsets: [
      { x: 96, y: -8 },
      { x: -96, y: -8 }
    ],
    enterRadius: 140,
    horizontalAcceleration: 520,
    horizontalMaxSpeed: 520,
    horizontalDrag: 120,
    idleDrag: 80,
    airDrag: 0.99,
    liftPower: 780,
    descendPower: 540,
    gravityScale: 0.42,
    maxVerticalSpeed: 280,
    verticalDamping: 0.92,
    hoverMinAltitude: 80,
    hoverMaxAltitude: 360,
    spawnHover: 120,
    autopilotStrength: 3.8,
    baseHealth: 350,
    colorBody: "#262c3e",
    colorAccent: "#ff6b80",
    colorDetail: "#f8f8ff",
    wingSpan: 230
  },
  tideSkiff: {
    label: "Tide Skiff",
    movementType: "water",
    mountedWeapons: [
      {
        id: "tideSkiff.prowCannon",
        label: "Prow Cannon",
        binding: "primary",
        offset: { x: 28, y: -18 },
        muzzles: [
          { x: 36, y: -4 }
        ],
        projectile: {
          speed: 560,
          damage: 18,
          radius: 6,
          color: "#ffdd8a",
          gravityFactor: 0.08,
          knockback: 110
        },
        scatter: 2.5,
        fireInterval: 0.22,
        flashDuration: 0.1,
        flashRadius: 14,
        barrelLength: 46,
        barrelWidth: 6,
        barrelColor: "#5fd3ff"
      }
    ],
    width: 150,
    height: 42,
    driverSeat: { x: -10, y: 34 },
    exitOffsets: [
      { x: 92, y: -4 },
      { x: -92, y: -4 }
    ],
    enterRadius: 120,
    waterSurfaceOffset: 28,
    waterAcceleration: 260,
    waterMaxSpeed: 240,
    waterReverseSpeed: 140,
    waterIdleDrag: 180,
    turnDrag: 220,
    bobAmplitude: 6,
    bobSpeed: 1.5,
    buoyancyPoint: 0.58,
    splashIntensity: 0.4,
    baseHealth: 320,
    colorBody: "#1f2e3f",
    colorAccent: "#5fd3ff",
    colorDetail: "#f5fbff"
  },
  stormBarge: {
    label: "Storm Barge",
    movementType: "water",
    mountedWeapons: [
      {
        id: "stormBarge.deckChaingun",
        label: "Deck Chaingun",
        binding: "primary",
        offset: { x: 18, y: -24 },
        muzzles: [
          { x: 58, y: -6 },
          { x: 58, y: 6 }
        ],
        projectile: {
          speed: 620,
          damage: 16,
          radius: 5,
          color: "#ffc86d",
          gravityFactor: 0.06,
          knockback: 90
        },
        scatter: 5,
        fireInterval: 0.12,
        flashDuration: 0.08,
        flashRadius: 16,
        barrelLength: 58,
        barrelWidth: 6,
        barrelColor: "#ffa94d"
      }
    ],
    width: 200,
    height: 60,
    driverSeat: { x: 14, y: 46 },
    exitOffsets: [
      { x: 110, y: -6 },
      { x: -110, y: -6 }
    ],
    enterRadius: 132,
    waterSurfaceOffset: 32,
    waterAcceleration: 180,
    waterMaxSpeed: 180,
    waterReverseSpeed: 110,
    waterIdleDrag: 260,
    turnDrag: 320,
    bobAmplitude: 4,
    bobSpeed: 1.2,
    buoyancyPoint: 0.62,
    splashIntensity: 0.3,
    baseHealth: 480,
    colorBody: "#232f3a",
    colorAccent: "#ffa94d",
    colorDetail: "#f0f4ff"
  },
  abyssSub: {
    label: "Abyss Sub",
    movementType: "water",
    mountedWeapons: [
      {
        id: "abyssSub.torpedoLauncher",
        label: "Twin Torpedoes",
        binding: "secondary",
        offset: { x: 12, y: -10 },
        muzzles: [
          { x: 40, y: -6 },
          { x: 40, y: 6 }
        ],
        projectile: {
          speed: 480,
          damage: 28,
          radius: 7,
          color: "#8c9eff",
          gravityFactor: 0.02,
          knockback: 160
        },
        scatter: 1.5,
        fireInterval: 0.6,
        flashDuration: 0.12,
        flashRadius: 18,
        barrelLength: 48,
        barrelWidth: 7,
        barrelColor: "#8c9eff"
      }
    ],
    width: 132,
    height: 48,
    driverSeat: { x: 0, y: 36 },
    exitOffsets: [
      { x: 78, y: -10 },
      { x: -78, y: -10 }
    ],
    enterRadius: 110,
    waterSurfaceOffset: 36,
    waterAcceleration: 300,
    waterMaxSpeed: 260,
    waterReverseSpeed: 160,
    waterIdleDrag: 210,
    turnDrag: 240,
    bobAmplitude: 3,
    bobSpeed: 1.1,
    buoyancyPoint: 0.5,
    submergedOffset: 18,
    splashIntensity: 0.2,
    baseHealth: 360,
    colorBody: "#182733",
    colorAccent: "#8c9eff",
    colorDetail: "#e9f1ff"
  },
  scoutDrone: {
    label: "Scout Drone",
    movementType: "air",
    width: 72,
    height: 28,
    driverSeat: { x: 0, y: 20 },
    exitOffsets: [
      { x: 48, y: 0 },
      { x: -48, y: 0 }
    ],
    enterRadius: 90,
    horizontalAcceleration: 280,
    horizontalMaxSpeed: 260,
    horizontalDrag: 220,
    idleDrag: 200,
    airDrag: 0.95,
    liftPower: 660,
    descendPower: 520,
    gravityScale: 0.26,
    maxVerticalSpeed: 200,
    verticalDamping: 0.88,
    hoverMinAltitude: 24,
    hoverMaxAltitude: 220,
    spawnHover: 48,
    autopilotStrength: 6.2,
    baseHealth: 180,
    colorBody: "#293444",
    colorAccent: "#ffe066",
    colorDetail: "#edf4ff"
  }
};

let vehicleCounter = 0;

function createVehicle(type, x, options = {}) {
  const definition = VEHICLE_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`Unknown vehicle type: ${type}`);
  }

  const movementType = definition.movementType ?? "ground";
  const minX = definition.width * 0.5;
  const maxX = canvas.width - definition.width * 0.5;
  const centerX = clamp(x ?? canvas.width * 0.5, minX, maxX);

  let top;
  let onGround = true;
  let waterLineY = null;
  let preferredAltitude = options.hover ?? definition.spawnHover ?? 0;

  if (movementType === "air") {
    const minAltitude = definition.hoverMinAltitude ?? 0;
    const maxAltitude = definition.hoverMaxAltitude ?? minAltitude;
    const altitude = clamp(preferredAltitude, minAltitude, maxAltitude);
    top = GROUND_Y - definition.height - altitude;
    onGround = false;
    preferredAltitude = altitude;
  } else if (movementType === "water") {
    const surfaceOffset = definition.waterSurfaceOffset ?? 24;
    waterLineY = GROUND_Y - surfaceOffset;
    const buoyancyPoint = clamp(definition.buoyancyPoint ?? 0.55, 0.2, 0.9);
    const submergedOffset = definition.submergedOffset ?? 0;
    top = waterLineY - definition.height * buoyancyPoint + submergedOffset;
    onGround = false;
    preferredAltitude = 0;
  } else {
    top = GROUND_Y - definition.height;
  }

  const vehicle = {
    id: `vehicle-${type}-${vehicleCounter += 1}`,
    type,
    x: centerX,
    y: top,
    vx: 0,
    vy: 0,
    tilt: 0,
    facing: 1,
    driverId: null,
    health: definition.baseHealth,
    maxHealth: definition.baseHealth,
    enterCooldown: 0,
    damageFlash: 0,
    onGround,
    preferredAltitude: movementType === "air" ? preferredAltitude : 0,
    waterLineY,
    bobPhase: Math.random() * Math.PI * 2
  };

  vehicle.mounts = (definition.mountedWeapons ?? []).map((mountDef, index) => ({
    id: mountDef.id ?? `${type}-mount-${index}`,
    cooldown: 0,
    flashTimer: 0,
    muzzleIndex: 0,
    lastMuzzleX: null,
    lastMuzzleY: null
  }));

  return vehicle;
}

const vehicles = [
  createVehicle("buggy", canvas.width * 0.14),
  createVehicle("buggy", canvas.width * 0.28),
  createVehicle("tideSkiff", canvas.width * 0.38),
  createVehicle("raptorHeli", canvas.width * 0.56, { hover: 140 }),
  createVehicle("arrowJet", canvas.width * 0.64, { hover: 200 }),
  createVehicle("stormBarge", canvas.width * 0.74),
  createVehicle("abyssSub", canvas.width * 0.78),
  createVehicle("scoutDrone", canvas.width * 0.9, { hover: 100 })
];

function getVehicleById(id) {
  return vehicles.find((vehicle) => vehicle.id === id) ?? null;
}

export { VEHICLE_DEFINITIONS, vehicles, createVehicle, getVehicleById };