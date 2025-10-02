import { canvas } from "../../environment/canvas.js";
import { enemies, createGruntEnemy } from "../../state/entities.js";
import { ENEMY_SPAWN_SETTINGS } from "../../config/spawn.js";

const spawnState = {
  timer: ENEMY_SPAWN_SETTINGS.spawnInterval,
  seeded: false
};

function seedInitialEnemies() {
  if (spawnState.seeded) {
    return;
  }
  spawnState.seeded = true;
  const initial = Math.max(ENEMY_SPAWN_SETTINGS.minCount - enemies.length, 0);
  if (initial <= 0) {
    return;
  }
  spawnEnemies(initial);
}

function spawnEnemies(count) {
  for (let i = 0; i < count; i += 1) {
    if (enemies.length >= ENEMY_SPAWN_SETTINGS.maxCount) {
      break;
    }
    const padding = ENEMY_SPAWN_SETTINGS.spawnPadding ?? 80;
    const spawnX = padding + Math.random() * (canvas.width - padding * 2);
    const enemy = createGruntEnemy(spawnX);
    enemy.spawnX = spawnX;
    enemy.spawnY = enemy.y;
    enemy.respawnTimer = 0;
    enemies.push(enemy);
  }
}

function updateEnemySpawner(delta) {
  seedInitialEnemies();
  if (enemies.length >= ENEMY_SPAWN_SETTINGS.maxCount) {
    spawnState.timer = ENEMY_SPAWN_SETTINGS.spawnInterval;
    return;
  }

  spawnState.timer -= delta;
  if (spawnState.timer <= 0) {
    const deficit = Math.max(ENEMY_SPAWN_SETTINGS.minCount - enemies.length, 0);
    const batch = Math.min(ENEMY_SPAWN_SETTINGS.spawnBatch, ENEMY_SPAWN_SETTINGS.maxCount - enemies.length);
    const spawnCount = Math.max(batch, deficit);
    spawnEnemies(spawnCount);
    spawnState.timer = ENEMY_SPAWN_SETTINGS.spawnInterval;
  }
}

export { updateEnemySpawner };
