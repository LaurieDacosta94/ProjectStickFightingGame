const NETWORK_CONFIG = {
  serverApiBase: "https://projectstickfightinggame.onrender.com",
  refreshIntervalMs: 15000,
  heartbeatIntervalMs: 45000,
  hostTtlSeconds: 150,
  hostSecret: "sk-stickman-host-123456789987654321", // set this to match SERVER_SECRET on Render
  hostName: "ProjectStickFightingGame Lobby",
  defaultRegion: "na-west"
};

export { NETWORK_CONFIG };
