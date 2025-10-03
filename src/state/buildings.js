import { BUILDING_DEFINITIONS } from "../config/buildings.js";
import { onEnvironmentChange } from "./environment.js";

const structures = [];

const buildState = {
  active: false,
  blueprintIndex: 0,
  lastPreview: {
    x: 0,
    y: 0,
    valid: false
  }
};

function getBuildingDefinitions() {
  return Object.values(BUILDING_DEFINITIONS);
}

function getBlueprintByIndex(index = 0) {
  const defs = getBuildingDefinitions();
  if (defs.length === 0) {
    return null;
  }
  const safeIndex = ((index % defs.length) + defs.length) % defs.length;
  return defs[safeIndex];
}

function addStructure(structure) {
  structures.push(structure);
}

function resetStructures() {
  structures.length = 0;
}

function getStructures() {
  return structures;
}

function getBuildState() {
  return buildState;
}

onEnvironmentChange(() => {
  resetStructures();
  buildState.active = false;
  buildState.lastPreview = { ...buildState.lastPreview, valid: false };
});

export {
  getBuildingDefinitions,
  getBlueprintByIndex,
  getStructures,
  addStructure,
  resetStructures,
  getBuildState
};
