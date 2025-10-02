let elapsed = 0;

function advanceTime(delta) {
  elapsed += delta;
}

function getElapsedTime() {
  return elapsed;
}

export { advanceTime, getElapsedTime };
