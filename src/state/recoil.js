import { getElapsedTime } from "../core/utils/time.js";


const recoilState = {
  horizontalKick: 0,
  verticalKick: 0,
  decay: 12,
  lastShotTime: 0
};

function applyRecoil(kick) {
  recoilState.horizontalKick += kick?.horizontal ?? 0;
  recoilState.verticalKick += kick?.vertical ?? 0;
  recoilState.decay = kick?.decay ?? recoilState.decay;
  recoilState.lastShotTime = getElapsedTime();
}

function updateRecoil(delta) {
  const decayRate = recoilState.decay ?? 12;
  const decayFactor = Math.max(0, 1 - decayRate * delta);
  recoilState.horizontalKick *= decayFactor;
  recoilState.verticalKick *= decayFactor;
}

function getRecoilOffset() {
  return {
    horizontal: recoilState.horizontalKick,
    vertical: recoilState.verticalKick
  };
}

export { applyRecoil, updateRecoil, getRecoilOffset };


