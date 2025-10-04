import { canvas } from "../../environment/canvas.js";
import { getCamera } from "../../state/camera.js";

const input = Object.seal({
  left: false,
  right: false,
  jump: false,
  down: false,
  roll: false,
  attackBuffered: false,
  throwBuffered: false,
  reloadBuffered: false,
  interactBuffered: false,
  attackDown: false,
  throwDown: false,
  squadCommandCycleBuffered: false,
  squadCommandSelect: null,
  serverBrowserToggleBuffered: false,
  serverBrowserNavigate: 0,
  serverBrowserJoinBuffered: false,
  serverBrowserHostBuffered: false,
  serverBrowserStopHostBuffered: false,
  serverBrowserCopyOfferBuffered: false,
  serverBrowserPasteOfferBuffered: false,
  serverBrowserAcceptAnswerBuffered: false,
  serverBrowserCopyCandidatesBuffered: false,
  serverBrowserPasteCandidatesBuffered: false,
  buildToggleBuffered: false,
  buildCycleBuffered: 0,
  buildConfirmBuffered: false,
  buildCancelBuffered: false,
  survivalToggleBuffered: false,
  sandboxToggleBuffered: false,
  coopToggleBuffered: false,
  campaignStartBuffered: false,
});

const pointer = Object.seal({
  screenX: canvas.width * 0.5,
  screenY: canvas.height * 0.5,
  worldX: canvas.width * 0.5,
  worldY: canvas.height * 0.5,
  active: false,
  lastUpdate: 0
});

function refreshPointerWorld() {
  const camera = getCamera();
  const offsetX = camera?.offsetX ?? 0;
  const offsetY = camera?.y ?? 0;
  pointer.worldX = pointer.screenX + offsetX;
  pointer.worldY = pointer.screenY + offsetY;
}

function updatePointerPosition(event) {
  if (!canvas || !event) {
    refreshPointerWorld();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
  pointer.screenX = localX * scaleX;
  pointer.screenY = localY * scaleY;
  pointer.active = localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height;
  pointer.lastUpdate = typeof performance !== "undefined" ? performance.now() : Date.now();
  refreshPointerWorld();
}

function handlePointerMove(event) {
  updatePointerPosition(event);
}

function handlePointerLeave() {
  pointer.active = false;
}

let initialized = false;

function handleKey(isDown, event) {
  switch (event.code) {
    case "ArrowLeft":
    case "KeyA":
      input.left = isDown;
      event.preventDefault();
      break;
    case "ArrowRight":
    case "KeyD":
      input.right = isDown;
      event.preventDefault();
      break;
    case "ArrowUp":
    case "KeyW":
    case "Space":
      input.jump = isDown;
      event.preventDefault();
      break;
    case "ArrowDown":
    case "KeyS":
      input.down = isDown;
      event.preventDefault();
      break;
    case "Comma":
      if (isDown) {
        input.buildCycleBuffered = -1;
        event.preventDefault();
      }
      break;
    case "Period":
      if (isDown) {
        input.buildCycleBuffered = 1;
        event.preventDefault();
      }
      break;
    case "Escape":
      if (isDown) {
        input.buildCancelBuffered = true;
        event.preventDefault();
      }
    case "ShiftLeft":
    case "ShiftRight":
      if (isDown) {
        input.roll = true;
        event.preventDefault();
      }
      break;
    case "KeyB":
      if (isDown) {
        input.buildToggleBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyY":
      if (isDown) {
        input.survivalToggleBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyK":
      if (isDown) {
        input.sandboxToggleBuffered = true;
        event.preventDefault();
      }
      break;
    case "F9":
      if (isDown) {
        input.coopToggleBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyJ":
    case "KeyF":
      if (isDown) {
        input.attackBuffered = true;
        input.attackDown = true;
        event.preventDefault();
      } else {
        input.attackDown = false;
        event.preventDefault();
      }
      break;
    case "KeyG":
      if (isDown) {
        input.throwBuffered = true;
        input.throwDown = true;
        event.preventDefault();
      } else {
        input.throwDown = false;
        event.preventDefault();
      }
      break;
    case "KeyR":
      if (isDown) {
        input.reloadBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyE":
      if (isDown) {
        input.interactBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyT":
      if (isDown) {
        input.squadCommandCycleBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyQ":
      if (isDown) {
        input.campaignStartBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyZ":
      if (isDown) {
        input.squadCommandSelect = "hold";
        event.preventDefault();
      }
      break;
    case "KeyX":
      if (isDown) {
        input.squadCommandSelect = "defend";
        event.preventDefault();
      }
      break;
    case "KeyC":
      if (isDown) {
        input.squadCommandSelect = "attack";
        event.preventDefault();
      }
      break;
    case "KeyV":
      if (isDown) {
        input.squadCommandSelect = "flank";
        event.preventDefault();
      }
      break;
    case "KeyL":
      if (isDown) {
        input.serverBrowserToggleBuffered = true;
        event.preventDefault();
      }
      break;
    case "BracketLeft":
      if (isDown) {
        input.serverBrowserNavigate = -1;
        event.preventDefault();
      }
      break;
    case "BracketRight":
      if (isDown) {
        input.serverBrowserNavigate = 1;
        event.preventDefault();
      }
      break;
    case "Slash":
      if (isDown) {
        input.serverBrowserNavigate = 1;
        event.preventDefault();
      }
      break;
    case "Enter":
      if (isDown) {
        input.serverBrowserJoinBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyH":
      if (isDown) {
        input.serverBrowserHostBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyU":
      if (isDown) {
        input.serverBrowserStopHostBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyO":
      if (isDown) {
        input.serverBrowserCopyOfferBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyP":
      if (isDown) {
        input.serverBrowserPasteOfferBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyI":
      if (isDown) {
        input.serverBrowserAcceptAnswerBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyM":
      if (isDown) {
        input.serverBrowserCopyCandidatesBuffered = true;
        event.preventDefault();
      }
      break;
    case "KeyN":
      if (isDown) {
        input.serverBrowserPasteCandidatesBuffered = true;
        event.preventDefault();
      }
      break;
    default:
      break;
  }
}

function handleMouseDown(event) {
  updatePointerPosition(event);
  if (event.button === 0) {
    input.attackBuffered = true;
    input.attackDown = true;
    event.preventDefault();
  } else if (event.button === 2) {
    input.throwBuffered = true;
    input.throwDown = true;
    event.preventDefault();
  }
}

function handleMouseUp(event) {
  updatePointerPosition(event);
  if (event.button === 0) {
    input.attackDown = false;
    event.preventDefault();
  } else if (event.button === 2) {
    input.throwDown = false;
    event.preventDefault();
  }
}

function resetInputs() {
  input.left = false;
  input.right = false;
  input.jump = false;
  input.down = false;
  input.roll = false;
  input.attackBuffered = false;
  input.throwBuffered = false;
  input.reloadBuffered = false;
  input.interactBuffered = false;
  input.attackDown = false;
  input.throwDown = false;
  input.squadCommandCycleBuffered = false;
  input.squadCommandSelect = null;
  input.serverBrowserToggleBuffered = false;
  input.serverBrowserNavigate = 0;
  input.serverBrowserJoinBuffered = false;
  input.serverBrowserHostBuffered = false;
  input.serverBrowserStopHostBuffered = false;
  input.serverBrowserCopyOfferBuffered = false;
  input.serverBrowserPasteOfferBuffered = false;
  input.serverBrowserAcceptAnswerBuffered = false;
  input.serverBrowserCopyCandidatesBuffered = false;
  input.serverBrowserPasteCandidatesBuffered = false;
  input.campaignStartBuffered = false;
}

function initializeInput() {
  if (initialized) {
    return;
  }
  window.addEventListener("keydown", (event) => handleKey(true, event));
  window.addEventListener("keyup", (event) => handleKey(false, event));
  window.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("mousemove", handlePointerMove);
  window.addEventListener("mouseleave", handlePointerLeave);
  window.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("blur", resetInputs);
  refreshPointerWorld();
  initialized = true;
}


export { input, pointer, initializeInput, resetInputs, refreshPointerWorld };














