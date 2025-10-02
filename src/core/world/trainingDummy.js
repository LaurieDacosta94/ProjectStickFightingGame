import { trainingDummy } from "../../state/entities.js";

function updateTrainingDummy(delta) {
  if (trainingDummy.flashTimer > 0) {
    trainingDummy.flashTimer = Math.max(0, trainingDummy.flashTimer - delta);
  }

  if (trainingDummy.shakeTimer > 0) {
    trainingDummy.shakeTimer = Math.max(0, trainingDummy.shakeTimer - delta);
  }

  trainingDummy.shakeMagnitude = Math.max(0, trainingDummy.shakeMagnitude - delta * 20);

  if (trainingDummy.health <= 0) {
    trainingDummy.respawnTimer = Math.max(0, trainingDummy.respawnTimer - delta);
    if (trainingDummy.respawnTimer === 0) {
      trainingDummy.health = trainingDummy.maxHealth;
      trainingDummy.flashTimer = 0;
      trainingDummy.shakeTimer = 0;
      trainingDummy.shakeMagnitude = 0;
    }
  }
}

export { updateTrainingDummy };
