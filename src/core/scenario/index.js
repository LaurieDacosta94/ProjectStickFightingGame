import { getScenarioSlots, setScenarioField, adjustScenarioNumber, cycleScenarioEnvironment, resetScenario } from "../../state/scenarios.js";
import { ENVIRONMENT_DEFINITIONS, ENVIRONMENT_SEQUENCE } from "../../config/environments.js";

const MESSAGE_DURATION = 2.6;

const FIELDS = [
  { id: "scenarioSlot", label: "Scenario Slot" },
  { id: "name", label: "Scenario Name", editable: true },
  { id: "environmentId", label: "Environment" },
  { id: "startingMaterials", label: "Starting Materials", step: 250 },
  { id: "enemyCount", label: "Enemy Count", step: 1 },
  { id: "playerSpawnRatio", label: "Player Spawn %", step: 0.02 },
  { id: "dummySpawnRatio", label: "Dummy Spawn %", step: 0.02 },
  { id: "enemySpawnLeft", label: "Enemy Left %", step: 0.02 },
  { id: "enemySpawnRight", label: "Enemy Right %", step: 0.02 },
  { id: "description", label: "Mission Brief", editable: true }
];

const uiState = {
  visible: false,
  fieldIndex: 0,
  slotIndex: 0,
  message: null,
  messageTimer: 0
};

const runtimeState = {
  pendingApplication: null,
  appliedScenarioId: null,
  spawnOverride: null
};

let initialized = false;

function setMessage(message) {
  uiState.message = message ?? null;
  uiState.messageTimer = message ? MESSAGE_DURATION : 0;
}

function openEditor() {
  if (uiState.visible) {
    return;
  }
  uiState.visible = true;
  setMessage(null);
}

function closeEditor() {
  if (!uiState.visible) {
    return;
  }
  uiState.visible = false;
}

function getEnvironmentLabel(environmentId) {
  const def = environmentId ? ENVIRONMENT_DEFINITIONS[environmentId] : null;
  return def?.name ?? environmentId ?? "Unknown";
}

function clampFieldIndex(index) {
  const total = FIELDS.length;
  if (total === 0) {
    uiState.fieldIndex = 0;
    return;
  }
  uiState.fieldIndex = ((index % total) + total) % total;
}

function cycleField(delta) {
  clampFieldIndex(uiState.fieldIndex + delta);
  setMessage(null);
}

function cycleSlot(delta) {
  const scenarios = getScenarioSlots();
  if (scenarios.length === 0) {
    return;
  }
  const nextIndex = ((uiState.slotIndex + delta) % scenarios.length + scenarios.length) % scenarios.length;
  if (uiState.slotIndex !== nextIndex) {
    uiState.slotIndex = nextIndex;
    setMessage(`Scenario ${nextIndex + 1}: ${scenarios[nextIndex].name}`);
  }
}

function editFieldPrompt(fieldId) {
  const scenarios = getScenarioSlots();
  const scenario = scenarios[uiState.slotIndex];
  if (!scenario) {
    return;
  }
  if (fieldId === "name") {
    const nextName = typeof window !== "undefined" ? window.prompt("Scenario name", scenario.name) : null;
    if (nextName && nextName.trim()) {
      setScenarioField(uiState.slotIndex, "name", nextName.trim());
      setMessage(`Renamed to ${nextName.trim()}`);
    }
  } else if (fieldId === "description") {
    const nextDescription = typeof window !== "undefined" ? window.prompt("Mission brief", scenario.description ?? "") : null;
    if (nextDescription != null) {
      setScenarioField(uiState.slotIndex, "description", nextDescription);
      setMessage("Updated brief");
    }
  }
}

function adjustField(direction) {
  const field = FIELDS[uiState.fieldIndex];
  if (!field) {
    return;
  }
  const scenarios = getScenarioSlots();
  const scenario = scenarios[uiState.slotIndex];
  if (!scenario) {
    return;
  }
  const step = field.step ?? 1;
  switch (field.id) {
    case "scenarioSlot":
      cycleSlot(direction);
      break;
    case "environmentId": {
      const next = cycleScenarioEnvironment(uiState.slotIndex, direction);
      setMessage(`Environment: ${getEnvironmentLabel(next.environmentId)}`);
      break;
    }
    case "startingMaterials": {
      const next = adjustScenarioNumber(uiState.slotIndex, "startingMaterials", direction, step);
      setMessage(`Materials: ${next.startingMaterials}`);
      break;
    }
    case "enemyCount": {
      const next = adjustScenarioNumber(uiState.slotIndex, "enemyCount", direction, step);
      setMessage(`Enemies: ${next.enemyCount}`);
      break;
    }
    case "playerSpawnRatio": {
      const next = adjustScenarioNumber(uiState.slotIndex, "playerSpawnRatio", direction, step);
      setMessage(`Player Spawn: ${(next.playerSpawnRatio * 100).toFixed(0)}%`);
      break;
    }
    case "dummySpawnRatio": {
      const next = adjustScenarioNumber(uiState.slotIndex, "dummySpawnRatio", direction, step);
      setMessage(`Dummy Spawn: ${(next.dummySpawnRatio * 100).toFixed(0)}%`);
      break;
    }
    case "enemySpawnLeft": {
      const next = adjustScenarioNumber(uiState.slotIndex, "enemySpawnLeft", direction, step);
      setMessage(`Left Spawn: ${(next.enemySpawnRatios[0] * 100).toFixed(0)}%`);
      break;
    }
    case "enemySpawnRight": {
      const next = adjustScenarioNumber(uiState.slotIndex, "enemySpawnRight", direction, step);
      setMessage(`Right Spawn: ${(next.enemySpawnRatios[1] * 100).toFixed(0)}%`);
      break;
    }
    default:
      break;
  }
}

function queueScenarioApply() {
  const scenarios = getScenarioSlots();
  const scenario = scenarios[uiState.slotIndex];
  if (!scenario) {
    setMessage("No scenario to apply");
    return;
  }
  runtimeState.pendingApplication = {
    scenario,
    slotIndex: uiState.slotIndex
  };
  setMessage(`Scenario armed: ${scenario.name}`);
  closeEditor();
}

function handleReset() {
  const reset = resetScenario(uiState.slotIndex);
  setMessage(`Scenario reset: ${reset.name}`);
}

function handleKeyDown(event) {
  if (event.defaultPrevented) {
    return;
  }
  const code = event.code;
  if (!uiState.visible) {
    if (code === "F8") {
      openEditor();
      event.preventDefault();
      event.stopPropagation();
    }
    return;
  }

  switch (code) {
    case "Escape":
    case "F8":
      closeEditor();
      break;
    case "ArrowUp":
      cycleField(-1);
      break;
    case "ArrowDown":
      cycleField(1);
      break;
    case "Tab":
      cycleField(event.shiftKey ? -1 : 1);
      break;
    case "ArrowLeft":
      adjustField(-1);
      break;
    case "ArrowRight":
      adjustField(1);
      break;
    case "KeyE": {
      const field = FIELDS[uiState.fieldIndex];
      if (field?.editable) {
        editFieldPrompt(field.id);
      }
      break;
    }
    case "KeyR":
      handleReset();
      break;
    case "Enter":
      queueScenarioApply();
      break;
    default:
      return;
  }
  event.preventDefault();
  event.stopPropagation();
}

function handlePointerEvent(event) {
  if (!uiState.visible) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}

function initializeScenarioSystem() {
  if (initialized || typeof window === "undefined") {
    return;
  }
  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("mousedown", handlePointerEvent, true);
  window.addEventListener("mouseup", handlePointerEvent, true);
  window.addEventListener("contextmenu", handlePointerEvent, true);
  initialized = true;
}

function updateScenarioSystem(delta = 0) {
  if (uiState.messageTimer > 0) {
    uiState.messageTimer = Math.max(0, uiState.messageTimer - delta);
    if (uiState.messageTimer === 0) {
      uiState.message = null;
    }
  }
}

function isScenarioEditorVisible() {
  return uiState.visible;
}

function getScenarioEditorState() {
  const scenarios = getScenarioSlots();
  const scenario = scenarios[uiState.slotIndex] ?? null;
  return {
    visible: uiState.visible,
    slotIndex: uiState.slotIndex,
    fieldIndex: uiState.fieldIndex,
    fields: FIELDS,
    scenario,
    scenarios,
    environmentName: scenario ? getEnvironmentLabel(scenario.environmentId) : "--",
    message: uiState.message,
    messageTimer: uiState.messageTimer
  };
}

function consumeScenarioApplication() {
  const pending = runtimeState.pendingApplication;
  runtimeState.pendingApplication = null;
  return pending;
}

function setScenarioRuntimeApplied({ scenarioId, spawnOverride }) {
  runtimeState.appliedScenarioId = scenarioId ?? null;
  runtimeState.spawnOverride = spawnOverride ?? null;
}

function getScenarioSpawnOverride() {
  return runtimeState.spawnOverride;
}

export {
  initializeScenarioSystem,
  updateScenarioSystem,
  isScenarioEditorVisible,
  getScenarioEditorState,
  consumeScenarioApplication,
  setScenarioRuntimeApplied,
  getScenarioSpawnOverride
};
