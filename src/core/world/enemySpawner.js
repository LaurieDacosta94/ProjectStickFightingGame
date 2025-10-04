import { enemies, createGruntEnemy } from "../../state/entities.js";
import { ENEMY_SPAWN_SETTINGS } from "../../config/spawn.js";
import { getEnvironmentWidth, getEnvironmentSpawnSettings } from "../../state/environment.js";
import { getScenarioSpawnOverride } from "../scenario/index.js";

function resolveSpawnPoints() {
  const envWidth = getEnvironmentWidth();
  const spawnSettings = getEnvironmentSpawnSettings();
  const points = Array.isArray(spawnSettings?.enemies) ? spawnSettings.enemies.slice(0, 2) : [];
  if (points.length >= 2) {
    return points;
  }
  const left = envWidth * 0.25;
  const right = envWidth * 0.75;
  return [left, right];
}

function spawnEnemies(count, options = {}) {
  const contextTag = options.context ?? "sandbox";
  const autoRespawn = options.autoRespawn ?? contextTag !== "survival";
  const override = getScenarioSpawnOverride();
  const overridePoints = override && Array.isArray(override.points) && override.points.length >= 2 && (!override.context || override.context === contextTag)
    ? override.points
    : null;
  const spawnPoints = overridePoints ?? resolveSpawnPoints();
  const maxActive = Math.min(spawnPoints.length, ENEMY_SPAWN_SETTINGS.maxCount);
  let spawned = 0;

  for (let sideIndex = 0; sideIndex < spawnPoints.length; sideIndex += 1) {
    if (spawned >= count || enemies.length >= ENEMY_SPAWN_SETTINGS.maxCount) {
      break;
    }
    if (contextTag === "survival") {
      const hasAlive = enemies.some(
        (enemy) => enemy.spawnContext === "survival" && enemy.spawnSide === sideIndex && enemy.health > 0
      );
      if (hasAlive) {
        continue;
      }
    }
    const spawnX = spawnPoints[sideIndex];
    const enemy = createGruntEnemy(spawnX, {
      context: contextTag,
      autoRespawn,
      spawnSide: sideIndex,
      facing: sideIndex === 0 ? 1 : -1
    });
    enemy.spawnX = spawnX;
    enemy.spawnY = enemy.y;
    enemy.respawnTimer = 0;
    enemies.push(enemy);
    spawned += 1;
    if (spawned >= maxActive) {
      break;
    }
  }
}

function updateEnemySpawner() {}

export { updateEnemySpawner, spawnEnemies };
