const COSMETIC_CATEGORIES = [
  {
    id: "helmet",
    label: "Helmet",
    description: "Headgear and visors for the operative.",
    options: [
      {
        id: "helmet-none",
        name: "No Helmet",
        description: "Keeps the classic stickman silhouette.",
        style: { type: "none" }
      },
      {
        id: "helmet-strike",
        name: "Strike Visor",
        description: "Angled carbon shell with cyan visor glow.",
        style: {
          type: "visor",
          shellColor: "#1a2233",
          accentColor: "#2f3b55",
          visorColor: "#68e7ff",
          visorAlpha: 0.7
        }
      },
      {
        id: "helmet-vanguard",
        name: "Vanguard Helm",
        description: "Tactical helmet with reinforced cheek plates.",
        style: {
          type: "plated",
          shellColor: "#2f2a3f",
          accentColor: "#5f4c7d",
          trimColor: "#ffb36a"
        }
      }
    ]
  },
  {
    id: "armor",
    label: "Armor",
    description: "Chest harness and shoulder plating.",
    options: [
      {
        id: "armor-lite",
        name: "Light Harness",
        description: "Minimal straps with subdued accents.",
        style: {
          type: "harness",
          strapColor: "#444b63",
          accentColor: "#8ca3ff"
        }
      },
      {
        id: "armor-carbon",
        name: "Carbon Plating",
        description: "Segmented chest plates with copper trim.",
        style: {
          type: "plating",
          plateColor: "#212733",
          trimColor: "#ffad66",
          glowColor: "#ffa24b"
        }
      },
      {
        id: "armor-scout",
        name: "Recon Webbing",
        description: "Layered harness with utility pouches.",
        style: {
          type: "webbing",
          strapColor: "#2f3a44",
          pouchColor: "#556668",
          accentColor: "#9ad6ff"
        }
      }
    ]
  },
  {
    id: "jetpack",
    label: "Jetpack",
    description: "Back-mounted rigs for aerial flair.",
    options: [
      {
        id: "jetpack-none",
        name: "No Jetpack",
        description: "Travel light and nimble.",
        style: { type: "none" }
      },
      {
        id: "jetpack-sprint",
        name: "Sprint Thrusters",
        description: "Compact dual thrusters with teal exhaust glow.",
        style: {
          type: "dual",
          bodyColor: "#1f2d44",
          exhaustColor: "#76e6ff",
          exhaustAlpha: 0.75
        }
      },
      {
        id: "jetpack-bastion",
        name: "Bastion Pack",
        description: "Armored flight rig with amber burn.",
        style: {
          type: "shielded",
          bodyColor: "#3a2f2f",
          panelColor: "#5e4a3a",
          exhaustColor: "#ffb96a",
          exhaustAlpha: 0.8
        }
      }
    ]
  }
];

const COSMETIC_ITEMS = COSMETIC_CATEGORIES.reduce((map, category) => {
  category.options.forEach((option) => {
    map[option.id] = { ...option, category: category.id };
  });
  return map;
}, {});

const DEFAULT_COSMETICS = {
  helmet: "helmet-strike",
  armor: "armor-carbon",
  jetpack: "jetpack-none"
};

const COSMETIC_STORAGE_KEY = "stickman-warfare-cosmetics.v1";

export { COSMETIC_CATEGORIES, COSMETIC_ITEMS, DEFAULT_COSMETICS, COSMETIC_STORAGE_KEY };
