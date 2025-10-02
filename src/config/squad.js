const SQUAD_COMMANDS = [
  {
    id: "hold",
    label: "Hold",
    description: "Regroup on you and stay close.",
    order: 0
  },
  {
    id: "defend",
    label: "Defend",
    description: "Form a defensive ring and cover your position.",
    order: 1
  },
  {
    id: "attack",
    label: "Attack",
    description: "Press the nearest enemy with ranged fire.",
    order: 2
  },
  {
    id: "flank",
    label: "Flank",
    description: "Split wide and pressure the enemy from the side.",
    order: 3
  }
];

const SQUAD_SETTINGS = {
  maxSquadSize: 3,
  commandRange: 640,
  followRadius: 120,
  defendRadius: 180,
  flankOffset: 220,
  commandCooldown: 1.4,
  supportFireCooldown: 0.45,
  projectileSpeed: 520,
  projectileDamage: 12
};

export { SQUAD_COMMANDS, SQUAD_SETTINGS };
