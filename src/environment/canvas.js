const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Canvas 2D context not available.");
}

const GROUND_Y = canvas.height - 60;

export { canvas, context, GROUND_Y };
