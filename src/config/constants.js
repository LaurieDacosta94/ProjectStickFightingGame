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

export {
  SPEED,
  JUMP_SPEED,
  ROLL_SPEED,
  ROLL_DURATION,
  GRAVITY,
  POSES
};
