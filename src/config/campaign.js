const CAMPAIGN_SETTINGS = {
  briefingDuration: 4,
  successHoldDuration: 6,
  failureHoldDuration: 5,
  betweenMissionsDelay: 4,
  startKeyLabel: "Q"
};

const CAMPAIGN_MISSIONS = [
  {
    id: "neo-break-line",
    name: "Break the Line",
    environmentId: "neoDistrict",
    description: "Push hostile raiders out of the plaza and secure the street.",
    briefing: "Command wants the plaza cleared. Sweep through and eliminate the raiders.",
    objective: {
      type: "eliminate",
      label: "Neutralize raider squads",
      target: 4
    },
    spawn: {
      batchSize: 2,
      replenishDelay: 3.2,
      autoRespawn: false
    },
    rewards: {
      materials: 60
    },
    successMessage: "Plaza secured. Supply convoy rolling in.",
    failureMessage: "Raiders regained ground; rally and try again."
  },
  {
    id: "verdant-holdout",
    name: "Hold the Ridge",
    environmentId: "verdantWilds",
    description: "Hold the ridge until evac arrives and keep the squad alive.",
    briefing: "Allied transports are inbound. Hold the ridge until they arrive.",
    objective: {
      type: "survive",
      label: "Hold position until evac arrives",
      duration: 45
    },
    spawn: {
      batchSize: 2,
      replenishDelay: 2.4,
      autoRespawn: true
    },
    rewards: {
      materials: 90
    },
    successMessage: "Evac transports secured the ridge. Nice hold.",
    failureMessage: "The ridge fell before evac arrived. They need you back in the fight."
  },
  {
    id: "orbital-insertion",
    name: "Orbital Insertion",
    environmentId: "orbitalSpire",
    description: "Clear the orbital spire landing pads and neutralize the security teams guarding them.",
    briefing: "The spire lifts are jammed. Clear the pads so the boarding teams can land.",
    objective: {
      type: "eliminate",
      label: "Disable spire security",
      target: 6
    },
    spawn: {
      batchSize: 2,
      replenishDelay: 2.8,
      autoRespawn: false
    },
    rewards: {
      materials: 120
    },
    successMessage: "Landing pads clear. Boarding teams inbound.",
    failureMessage: "Security sealed the spire. Regroup for another push."
  }
];

export { CAMPAIGN_MISSIONS, CAMPAIGN_SETTINGS };
