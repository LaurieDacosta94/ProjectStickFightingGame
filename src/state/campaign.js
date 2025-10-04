import { CAMPAIGN_MISSIONS, CAMPAIGN_SETTINGS } from "../config/campaign.js";

function createDefaultObjective() {
  return {
    type: "none",
    label: "",
    target: 0,
    progress: 0,
    duration: 0,
    remaining: 0
  };
}

function createDefaultSpawn() {
  return {
    batchSize: 0,
    replenishDelay: 0,
    autoRespawn: false,
    cooldown: 0
  };
}

const campaignState = {
  active: false,
  stage: "inactive",
  missionIndex: -1,
  missionId: null,
  completedMissions: 0,
  totalMissions: CAMPAIGN_MISSIONS.length,
  message: "",
  stageTimer: 0,
  objective: createDefaultObjective(),
  spawn: createDefaultSpawn(),
  rewards: {},
  successMessage: "Mission complete.",
  failureMessage: "Mission failed.",
  briefing: "",
  environmentId: null,
  lastOutcome: null
};

function resetCampaignState() {
  campaignState.active = false;
  campaignState.stage = "inactive";
  campaignState.missionIndex = -1;
  campaignState.missionId = null;
  campaignState.completedMissions = 0;
  campaignState.message = "";
  campaignState.stageTimer = 0;
  campaignState.objective = createDefaultObjective();
  campaignState.spawn = createDefaultSpawn();
  campaignState.rewards = {};
  campaignState.successMessage = "Mission complete.";
  campaignState.failureMessage = "Mission failed.";
  campaignState.briefing = "";
  campaignState.environmentId = null;
  campaignState.lastOutcome = null;
}

function getCampaignState() {
  return campaignState;
}

function getCampaignMissionDefinition(index = campaignState.missionIndex) {
  if (index < 0 || index >= CAMPAIGN_MISSIONS.length) {
    return null;
  }
  return CAMPAIGN_MISSIONS[index];
}

function getCampaignMissions() {
  return CAMPAIGN_MISSIONS;
}

function setCampaignActive(active) {
  campaignState.active = Boolean(active);
}

function setCampaignStage(stage, timer = 0) {
  campaignState.stage = stage;
  campaignState.stageTimer = Math.max(0, timer ?? 0);
}

function setCampaignStageTimer(timer) {
  campaignState.stageTimer = Math.max(0, timer ?? 0);
}

function decrementCampaignStageTimer(delta) {
  campaignState.stageTimer = Math.max(0, campaignState.stageTimer - delta);
}

function configureCampaignMission(index) {
  const mission = getCampaignMissionDefinition(index);
  if (!mission) {
    return null;
  }
  campaignState.missionIndex = index;
  campaignState.missionId = mission.id;
  campaignState.environmentId = mission.environmentId ?? null;
  campaignState.objective = {
    type: mission.objective?.type ?? "none",
    label: mission.objective?.label ?? "",
    target: Math.max(0, Math.floor(mission.objective?.target ?? mission.objective?.duration ?? 0)),
    progress: 0,
    duration: Math.max(0, mission.objective?.duration ?? 0),
    remaining: Math.max(0, mission.objective?.duration ?? 0)
  };
  campaignState.spawn = {
    batchSize: Math.max(0, Math.floor(mission.spawn?.batchSize ?? 0)),
    replenishDelay: Math.max(0, mission.spawn?.replenishDelay ?? 0),
    autoRespawn: Boolean(mission.spawn?.autoRespawn),
    cooldown: 0
  };
  campaignState.rewards = mission.rewards ?? {};
  campaignState.successMessage = mission.successMessage ?? "Mission complete.";
  campaignState.failureMessage = mission.failureMessage ?? "Mission failed.";
  campaignState.briefing = mission.briefing ?? mission.description ?? "";
  campaignState.message = campaignState.briefing;
  campaignState.lastOutcome = null;
  return mission;
}

function setCampaignMessage(message) {
  campaignState.message = message ?? "";
}

function setCampaignSuccessMessage(message) {
  campaignState.successMessage = message ?? "Mission complete.";
}

function setCampaignFailureMessage(message) {
  campaignState.failureMessage = message ?? "Mission failed.";
}

function incrementCampaignProgress(amount = 1) {
  campaignState.objective.progress = Math.max(0, Math.min(
    (campaignState.objective.target || campaignState.objective.duration || Number.POSITIVE_INFINITY),
    campaignState.objective.progress + amount
  ));
}

function setCampaignProgress(value) {
  campaignState.objective.progress = Math.max(0, value ?? 0);
}

function setCampaignRemaining(value) {
  campaignState.objective.remaining = Math.max(0, value ?? 0);
}

function decrementCampaignRemaining(delta) {
  campaignState.objective.remaining = Math.max(0, campaignState.objective.remaining - delta);
}

function resetCampaignRemaining() {
  campaignState.objective.remaining = Math.max(0, campaignState.objective.duration ?? 0);
}

function setCampaignSpawnCooldown(value) {
  campaignState.spawn.cooldown = Math.max(0, value ?? 0);
}

function decrementCampaignSpawnCooldown(delta) {
  campaignState.spawn.cooldown = Math.max(0, campaignState.spawn.cooldown - delta);
}

function setCampaignLastOutcome(outcome) {
  campaignState.lastOutcome = outcome ?? null;
}

function setCompletedMissions(value) {
  const nextValue = Math.max(0, Math.min(CAMPAIGN_MISSIONS.length, Math.floor(value ?? 0)));
  campaignState.completedMissions = Math.max(campaignState.completedMissions, nextValue);
}

function getCampaignSettings() {
  return CAMPAIGN_SETTINGS;
}

export {
  getCampaignState,
  getCampaignMissionDefinition,
  getCampaignMissions,
  getCampaignSettings,
  resetCampaignState,
  setCampaignActive,
  setCampaignStage,
  setCampaignStageTimer,
  decrementCampaignStageTimer,
  configureCampaignMission,
  setCampaignMessage,
  setCampaignSuccessMessage,
  setCampaignFailureMessage,
  incrementCampaignProgress,
  setCampaignProgress,
  setCampaignRemaining,
  decrementCampaignRemaining,
  resetCampaignRemaining,
  setCampaignSpawnCooldown,
  decrementCampaignSpawnCooldown,
  setCampaignLastOutcome,
  setCompletedMissions
};
