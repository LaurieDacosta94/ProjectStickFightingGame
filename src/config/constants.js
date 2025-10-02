
import { GROUND_Y } from "../environment/canvas.js";

const SPEED = 240;
const JUMP_SPEED = 460;
const ROLL_SPEED = 420;
const ROLL_DURATION = 0.32;
const GRAVITY = 1400;

const POSES = {
  standing: {
    headRadius: 16,
    bodyLength: 34,
    legLength: 36,
    armLength: 28,
    strideMultiplier: 1,
    armSwingAmplitude: 12,
    legSwingAmplitude: 12
  },
  crouching: {
    headRadius: 16,
    bodyLength: 24,
    legLength: 24,
    armLength: 22,
    strideMultiplier: 0.6,
    armSwingAmplitude: 6,
    legSwingAmplitude: 6
  },
  rolling: {
    headRadius: 16,
    bodyLength: 18,
    legLength: 18,
    armLength: 18,
    strideMultiplier: 0,
    armSwingAmplitude: 0,
    legSwingAmplitude: 0
  }
};

const DEBUG_PLATFORMS = [
  { x: -240, y: GROUND_Y - 26, width: 520, height: 26, type: "street" },
  { x: 320, y: GROUND_Y - 26, width: 420, height: 26, type: "street" },
  { x: 820, y: GROUND_Y - 26, width: 380, height: 26, type: "street" },
  { x: 1220, y: GROUND_Y - 26, width: 520, height: 26, type: "street" },
  { x: 40, y: GROUND_Y - 120, width: 260, height: 18, type: "metro" },
  { x: 360, y: GROUND_Y - 180, width: 280, height: 16, type: "rooftop" },
  { x: 680, y: GROUND_Y - 240, width: 220, height: 16, type: "skybridge" },
  { x: 960, y: GROUND_Y - 180, width: 320, height: 18, type: "rooftop" },
  { x: 1240, y: GROUND_Y - 140, width: 280, height: 16, type: "terrace" },
  { x: 1460, y: GROUND_Y - 220, width: 200, height: 14, type: "balcony" },
  { x: 600, y: GROUND_Y - 88, width: 260, height: 14, type: "median" },
  { x: 980, y: GROUND_Y - 96, width: 320, height: 14, type: "median" }
];

const LEVEL_WATER_ZONES = [
  { x: 580, width: 220, top: GROUND_Y - 16, depth: 18 }
];

const LEVEL_DECOR = [
  { type: "building", x: -120, y: GROUND_Y - 360, width: 220, height: 360 },
  { type: "building", x: 220, y: GROUND_Y - 420, width: 180, height: 420 },
  { type: "building", x: 520, y: GROUND_Y - 360, width: 260, height: 360 },
  { type: "building", x: 860, y: GROUND_Y - 440, width: 220, height: 440 },
  { type: "building", x: 1120, y: GROUND_Y - 400, width: 260, height: 400 },
  { type: "building", x: 1400, y: GROUND_Y - 360, width: 200, height: 360 },
  { type: "billboard", x: 320, y: GROUND_Y - 210, width: 180, height: 90, text: "Neo District" },
  { type: "billboard", x: 1040, y: GROUND_Y - 230, width: 200, height: 96, text: "Rail 7" },
  { type: "streetlight", x: 180, y: GROUND_Y - 160 },
  { type: "streetlight", x: 760, y: GROUND_Y - 160 },
  { type: "streetlight", x: 1280, y: GROUND_Y - 160 },
  { type: "hovercar", x: 560, y: GROUND_Y - 120 },
  { type: "hovercar", x: 1180, y: GROUND_Y - 150 }
];

export {
  SPEED,
  JUMP_SPEED,
  ROLL_SPEED,
  ROLL_DURATION,
  GRAVITY,
  POSES,
  DEBUG_PLATFORMS,
  LEVEL_WATER_ZONES,
  LEVEL_DECOR
};
