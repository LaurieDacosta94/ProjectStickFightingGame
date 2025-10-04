let activeCamera = null;

const performanceStats = {
  enemiesTotal: 0,
  enemiesCulled: 0,
  squadTotal: 0,
  squadCulled: 0,
  remoteTotal: 0,
  remoteCulled: 0,
  vehicleTotal: 0,
  vehicleCulled: 0,
  destructibleTotal: 0,
  destructibleCulled: 0,
  interactableTotal: 0,
  interactableCulled: 0,
  buildingTotal: 0,
  buildingCulled: 0,
  resourceTotal: 0,
  resourceCulled: 0
};

function resetPerformanceStats() {
  for (const key of Object.keys(performanceStats)) {
    performanceStats[key] = 0;
  }
}

function setActiveCamera(camera) {
  activeCamera = camera || null;
}

function getActiveCamera() {
  return activeCamera;
}

function isWithinView(x, halfWidth = 0, margin = 240) {
  const camera = activeCamera;
  if (!camera) {
    return true;
  }
  const left = (camera.left ?? 0) - margin;
  const right = (camera.right ?? ((camera.left ?? 0) + ((camera.halfWidth ?? 0) * 2))) + margin;
  const min = x - halfWidth;
  const max = x + halfWidth;
  return max >= left && min <= right;
}

function recordVisibility(prefix, culled) {
  const totalKey = `${prefix}Total`;
  const culledKey = `${prefix}Culled`;
  if (Object.prototype.hasOwnProperty.call(performanceStats, totalKey)) {
    performanceStats[totalKey] += 1;
    if (culled && Object.prototype.hasOwnProperty.call(performanceStats, culledKey)) {
      performanceStats[culledKey] += 1;
    }
  }
}

export { setActiveCamera, getActiveCamera, isWithinView, resetPerformanceStats, recordVisibility, performanceStats };
