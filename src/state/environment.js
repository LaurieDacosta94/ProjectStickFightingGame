import { ENVIRONMENT_DEFINITIONS, ENVIRONMENT_SEQUENCE } from "../config/environments.js";
import { canvas } from "../environment/canvas.js";
import { clearResourcePickups } from "./resources.js";

let currentEnvironmentId = ENVIRONMENT_SEQUENCE[0] ?? Object.keys(ENVIRONMENT_DEFINITIONS)[0];
const listeners = new Set();
let controlsInitialized = false;

function getEnvironmentDefinition(id = currentEnvironmentId) {
  const definition = ENVIRONMENT_DEFINITIONS[id];
  if (definition) {
    return definition;
  }
  const fallbackId = ENVIRONMENT_SEQUENCE[0] ?? Object.keys(ENVIRONMENT_DEFINITIONS)[0];
  currentEnvironmentId = fallbackId;
  return ENVIRONMENT_DEFINITIONS[fallbackId];
}

function getEnvironmentWidth() {
  const environment = getEnvironmentDefinition();
  return typeof environment?.width === "number" ? environment.width : canvas.width;
}

function getEnvironmentId() {
  return currentEnvironmentId;
}

function getEnvironmentPlatforms() {
  const environment = getEnvironmentDefinition();
  return Array.isArray(environment?.platforms) ? environment.platforms : [];
}

function getEnvironmentWaterZones() {
  const environment = getEnvironmentDefinition();
  return Array.isArray(environment?.waterZones) ? environment.waterZones : [];
}

function getEnvironmentDecor() {
  const environment = getEnvironmentDefinition();
  return Array.isArray(environment?.decor) ? environment.decor : [];
}

function getEnvironmentDestructibleSpawns() {
  const environment = getEnvironmentDefinition();
  return Array.isArray(environment?.destructibles) ? environment.destructibles : [];
}

function getEnvironmentInteractableSpawns() {
  const environment = getEnvironmentDefinition();
  return Array.isArray(environment?.interactables) ? environment.interactables : [];
}

function getEnvironmentAmbientLights() {
  const environment = getEnvironmentDefinition();
  return Array.isArray(environment?.ambientLights) ? environment.ambientLights : [];
}

function getEnvironmentSpawnSettings() {
  const environment = getEnvironmentDefinition();
  return environment?.spawn ?? {};
}

function notifyListeners() {
  const definition = getEnvironmentDefinition();
  for (const listener of listeners) {
    try {
      listener(definition);
    } catch (error) {
      if (typeof console !== "undefined" && console.error) {
        console.error("Environment listener error", error);
      }
    }
  }
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent("environment:changed", {
        detail: { environment: definition, id: definition?.id ?? currentEnvironmentId }
      })
    );
  }
}

function setEnvironment(environmentId) {
  if (!environmentId || !ENVIRONMENT_DEFINITIONS[environmentId]) {
    return false;
  }
  if (environmentId === currentEnvironmentId) {
    return false;
  }
  currentEnvironmentId = environmentId;
  clearResourcePickups();
  notifyListeners();
  return true;
}

function cycleEnvironment(direction = 1) {
  if (!Array.isArray(ENVIRONMENT_SEQUENCE) || ENVIRONMENT_SEQUENCE.length === 0) {
    return false;
  }
  const index = ENVIRONMENT_SEQUENCE.indexOf(currentEnvironmentId);
  const normalizedIndex = index >= 0 ? index : 0;
  const nextIndex = (normalizedIndex + direction + ENVIRONMENT_SEQUENCE.length) % ENVIRONMENT_SEQUENCE.length;
  return setEnvironment(ENVIRONMENT_SEQUENCE[nextIndex]);
}

function onEnvironmentChange(listener, options = {}) {
  if (typeof listener !== "function") {
    return () => {};
  }
  listeners.add(listener);
  if (options.immediate !== false) {
    listener(getEnvironmentDefinition());
  }
  return () => {
    listeners.delete(listener);
  };
}

function handleEnvironmentHotkeys(event) {
  if (!event.altKey || event.repeat) {
    return;
  }
  if (event.code === "Digit9" || event.code === "Digit0") {
    const direction = event.code === "Digit9" ? -1 : 1;
    const changed = cycleEnvironment(direction);
    if (changed && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
  }
}

function initializeEnvironmentControls() {
  if (controlsInitialized || typeof window === "undefined") {
    return;
  }
  window.addEventListener("keydown", handleEnvironmentHotkeys);
  controlsInitialized = true;
}


function refreshEnvironment() {
  notifyListeners();
}

export {
  getEnvironmentDefinition,
  getEnvironmentId,
  getEnvironmentWidth,
  getEnvironmentPlatforms,
  getEnvironmentWaterZones,
  getEnvironmentDecor,
  getEnvironmentDestructibleSpawns,
  getEnvironmentInteractableSpawns,
  getEnvironmentAmbientLights,
  getEnvironmentSpawnSettings,
  setEnvironment,
  cycleEnvironment,
  onEnvironmentChange,
  initializeEnvironmentControls,
  refreshEnvironment
};
