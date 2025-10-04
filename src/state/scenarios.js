import { ENVIRONMENT_DEFINITIONS, ENVIRONMENT_SEQUENCE } from "../config/environments.js";

const SCENARIO_STORAGE_KEY = "stickman-warfare-scenarios.v1";

const DEFAULT_SCENARIOS = [
  {
    id: "urban-gauntlet",
    name: "Urban Gauntlet",
    environmentId: ENVIRONMENT_SEQUENCE?.[0] ?? Object.keys(ENVIRONMENT_DEFINITIONS)[0],
    description: "Dual-lane rush with staggered reinforcements.",
    startingMaterials: 1800,
    enemyCount: 6,
    playerSpawnRatio: 0.42,
    dummySpawnRatio: 0.78,
    enemySpawnRatios: [0.16, 0.78]
  },
  {
    id: "verdant-encirclement",
    name: "Verdant Encirclement",
    environmentId: ENVIRONMENT_SEQUENCE?.[1] ?? Object.keys(ENVIRONMENT_DEFINITIONS)[0],
    description: "Flank threats among elevated jungle walkways.",
    startingMaterials: 2200,
    enemyCount: 8,
    playerSpawnRatio: 0.48,
    dummySpawnRatio: 0.72,
    enemySpawnRatios: [0.24, 0.68]
  },
  {
    id: "spire-overwatch",
    name: "Spire Overwatch",
    environmentId: ENVIRONMENT_SEQUENCE?.[3] ?? Object.keys(ENVIRONMENT_DEFINITIONS)[0],
    description: "Skylanes with vertical sightlines and tight AI patrols.",
    startingMaterials: 2600,
    enemyCount: 10,
    playerSpawnRatio: 0.5,
    dummySpawnRatio: 0.82,
    enemySpawnRatios: [0.3, 0.74]
  }
];

function cloneScenario(scenario) {
  return JSON.parse(JSON.stringify(scenario));
}

const scenarioData = {
  scenarios: DEFAULT_SCENARIOS.map(cloneScenario)
};

function validateEnvironmentId(environmentId) {
  if (environmentId && ENVIRONMENT_DEFINITIONS[environmentId]) {
    return environmentId;
  }
  return ENVIRONMENT_SEQUENCE?.[0] ?? Object.keys(ENVIRONMENT_DEFINITIONS)[0];
}

function normalizeRatio(value, fallback = 0.5) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(0.98, Math.max(0.02, value));
}

function normalizeScenario(data, fallback = DEFAULT_SCENARIOS[0]) {
  const base = data && typeof data === "object" ? data : fallback;
  return {
    id: typeof base.id === "string" ? base.id : fallback.id,
    name: typeof base.name === "string" ? base.name : fallback.name,
    environmentId: validateEnvironmentId(base.environmentId ?? fallback.environmentId),
    description: typeof base.description === "string" ? base.description : fallback.description,
    startingMaterials: Number.isFinite(base.startingMaterials) ? Math.max(0, Math.round(base.startingMaterials)) : fallback.startingMaterials,
    enemyCount: Number.isFinite(base.enemyCount) ? Math.max(0, Math.round(base.enemyCount)) : fallback.enemyCount,
    playerSpawnRatio: normalizeRatio(base.playerSpawnRatio, fallback.playerSpawnRatio),
    dummySpawnRatio: normalizeRatio(base.dummySpawnRatio, fallback.dummySpawnRatio),
    enemySpawnRatios: Array.isArray(base.enemySpawnRatios) && base.enemySpawnRatios.length >= 2
      ? [normalizeRatio(base.enemySpawnRatios[0], fallback.enemySpawnRatios[0]), normalizeRatio(base.enemySpawnRatios[1], fallback.enemySpawnRatios[1])]
      : fallback.enemySpawnRatios.slice()
  };
}

function loadScenarios() {
  if (typeof localStorage === "undefined") {
    return scenarioData.scenarios;
  }
  try {
    const raw = localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) {
      return scenarioData.scenarios;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return scenarioData.scenarios;
    }
    const next = parsed.map((entry, index) => normalizeScenario(entry, DEFAULT_SCENARIOS[index % DEFAULT_SCENARIOS.length]));
    scenarioData.scenarios = next;
  } catch (error) {
    console.warn("Failed to load scenarios", error);
    scenarioData.scenarios = DEFAULT_SCENARIOS.map(cloneScenario);
  }
  return scenarioData.scenarios;
}

function saveScenarios() {
  if (typeof localStorage === "undefined") {
    return false;
  }
  try {
    localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenarioData.scenarios));
    return true;
  } catch (error) {
    console.warn("Failed to save scenarios", error);
    return false;
  }
}

function getScenarioSlots() {
  return scenarioData.scenarios.map(cloneScenario);
}

function getScenarioByIndex(index = 0) {
  const scenarios = scenarioData.scenarios;
  if (scenarios.length === 0) {
    return null;
  }
  const normalizedIndex = ((index % scenarios.length) + scenarios.length) % scenarios.length;
  return scenarios[normalizedIndex];
}

function ensureScenarioIndex(index) {
  const scenarios = scenarioData.scenarios;
  if (scenarios.length === 0) {
    return 0;
  }
  return ((index % scenarios.length) + scenarios.length) % scenarios.length;
}

function setScenarioField(index, field, value) {
  const slotIndex = ensureScenarioIndex(index);
  const current = scenarioData.scenarios[slotIndex];
  if (!current) {
    return current;
  }
  const next = { ...current };
  switch (field) {
    case "name":
      next.name = typeof value === "string" && value.trim().length > 0 ? value.trim() : current.name;
      break;
    case "description":
      next.description = typeof value === "string" ? value.trim() : current.description;
      break;
    case "environmentId":
      next.environmentId = validateEnvironmentId(value) ?? current.environmentId;
      break;
    case "startingMaterials":
      next.startingMaterials = Math.max(0, Math.round(Number(value) || 0));
      break;
    case "enemyCount":
      next.enemyCount = Math.max(0, Math.round(Number(value) || 0));
      break;
    case "playerSpawnRatio":
      next.playerSpawnRatio = normalizeRatio(Number(value), current.playerSpawnRatio);
      break;
    case "dummySpawnRatio":
      next.dummySpawnRatio = normalizeRatio(Number(value), current.dummySpawnRatio);
      break;
    case "enemySpawnRatios":
      if (Array.isArray(value) && value.length >= 2) {
        next.enemySpawnRatios = [normalizeRatio(value[0], current.enemySpawnRatios[0]), normalizeRatio(value[1], current.enemySpawnRatios[1])];
      }
      break;
    default:
      break;
  }
  scenarioData.scenarios[slotIndex] = next;
  saveScenarios();
  return next;
}

function adjustScenarioNumber(index, field, delta, step = 1) {
  const slotIndex = ensureScenarioIndex(index);
  const current = scenarioData.scenarios[slotIndex];
  if (!current) {
    return current;
  }
  switch (field) {
    case "startingMaterials":
      return setScenarioField(slotIndex, field, current.startingMaterials + delta * step);
    case "enemyCount":
      return setScenarioField(slotIndex, field, current.enemyCount + delta * step);
    case "playerSpawnRatio":
      return setScenarioField(slotIndex, field, current.playerSpawnRatio + delta * step);
    case "dummySpawnRatio":
      return setScenarioField(slotIndex, field, current.dummySpawnRatio + delta * step);
    case "enemySpawnLeft":
      return setScenarioField(slotIndex, "enemySpawnRatios", [current.enemySpawnRatios[0] + delta * step, current.enemySpawnRatios[1]]);
    case "enemySpawnRight":
      return setScenarioField(slotIndex, "enemySpawnRatios", [current.enemySpawnRatios[0], current.enemySpawnRatios[1] + delta * step]);
    default:
      return current;
  }
}

function cycleScenarioEnvironment(index, direction = 1) {
  const slotIndex = ensureScenarioIndex(index);
  const current = scenarioData.scenarios[slotIndex];
  if (!current) {
    return current;
  }
  const sequence = Array.isArray(ENVIRONMENT_SEQUENCE) && ENVIRONMENT_SEQUENCE.length > 0
    ? ENVIRONMENT_SEQUENCE
    : Object.keys(ENVIRONMENT_DEFINITIONS);
  const currentIndex = sequence.indexOf(current.environmentId);
  const normalized = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (normalized + direction + sequence.length) % sequence.length;
  return setScenarioField(slotIndex, "environmentId", sequence[nextIndex]);
}

function resetScenario(index) {
  const slotIndex = ensureScenarioIndex(index);
  const fallback = DEFAULT_SCENARIOS[slotIndex % DEFAULT_SCENARIOS.length] ?? DEFAULT_SCENARIOS[0];
  scenarioData.scenarios[slotIndex] = cloneScenario(fallback);
  saveScenarios();
  return scenarioData.scenarios[slotIndex];
}

loadScenarios();

export {
  getScenarioSlots,
  getScenarioByIndex,
  setScenarioField,
  adjustScenarioNumber,
  cycleScenarioEnvironment,
  resetScenario,
  saveScenarios
};
