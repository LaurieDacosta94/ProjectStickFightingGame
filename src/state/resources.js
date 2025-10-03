const resourceState = {
  materials: 120,
  pickups: []
};

let nextPickupId = 1;

function getResourceState() {
  return resourceState;
}

function getMaterialCount() {
  return resourceState.materials;
}

function setMaterialCount(amount) {
  resourceState.materials = Math.max(0, Math.floor(amount ?? 0));
}

function addMaterials(amount, source = "") {
  if (!Number.isFinite(amount) || amount === 0) {
    return;
  }
  resourceState.materials = Math.max(0, resourceState.materials + Math.round(amount));
}

function canAfford(cost) {
  return resourceState.materials >= (cost ?? 0);
}

function spendMaterials(cost) {
  const amount = Math.round(cost ?? 0);
  if (amount <= 0) {
    return true;
  }
  if (!canAfford(amount)) {
    return false;
  }
  resourceState.materials -= amount;
  return true;
}

function spawnSalvagePickup({ x = 0, y = 0, amount = 10, vx = (Math.random() - 0.5) * 80, vy = -120, ttl = 6 } = {}) {
  const pickup = {
    id: `salvage-${nextPickupId++}`,
    x,
    y,
    vx,
    vy,
    amount: Math.max(1, Math.round(amount ?? 1)),
    ttl,
    maxTtl: ttl,
    collected: false
  };
  resourceState.pickups.push(pickup);
  return pickup;
}

function clearResourcePickups() {
  resourceState.pickups.length = 0;
}

export {
  getResourceState,
  getMaterialCount,
  setMaterialCount,
  addMaterials,
  canAfford,
  spendMaterials,
  spawnSalvagePickup,
  clearResourcePickups
};
