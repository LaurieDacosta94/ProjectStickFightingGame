import { canvas } from "../environment/canvas.js";
import { getEnvironmentWidth, onEnvironmentChange } from "./environment.js";

const cameraState = {
  x: canvas.width * 0.5,
  targetX: canvas.width * 0.5
};

function getHalfViewWidth() {
  return canvas.width * 0.5;
}

function clampCameraX(value) {
  const half = getHalfViewWidth();
  const envWidth = getEnvironmentWidth();
  if (envWidth <= canvas.width) {
    return canvas.width * 0.5;
  }
  return Math.min(Math.max(value, half), envWidth - half);
}

function setCameraTargetX(x) {
  cameraState.targetX = clampCameraX(x);
}

function snapCameraTo(x) {
  cameraState.x = clampCameraX(x);
  cameraState.targetX = cameraState.x;
}

function resetCamera() {
  const envWidth = getEnvironmentWidth();
  snapCameraTo(envWidth * 0.5);
}

function updateCamera(delta) {
  const target = clampCameraX(cameraState.targetX);
  const lerpSpeed = 6;
  const t = Math.min(1, delta * lerpSpeed);
  cameraState.x += (target - cameraState.x) * t;
  cameraState.x = clampCameraX(cameraState.x);
}

function getCamera() {
  const half = getHalfViewWidth();
  const envWidth = getEnvironmentWidth();
  const clampedX = clampCameraX(cameraState.x);
  let left = clampedX - half;
  if (envWidth <= canvas.width) {
    left = Math.max(0, (envWidth * 0.5) - half);
  } else {
    left = Math.min(Math.max(0, left), envWidth - canvas.width);
  }
  const right = left + canvas.width;
  return {
    x: clampedX,
    y: 0,
    halfWidth: half,
    left,
    right,
    offsetX: left
  };
}

onEnvironmentChange(() => {
  resetCamera();
});

resetCamera();

export { getCamera, setCameraTargetX, updateCamera, resetCamera };
