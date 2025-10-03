import { canvas, GROUND_Y } from "../../environment/canvas.js";
import { vehicles, VEHICLE_DEFINITIONS, getVehicleById } from "../../state/vehicles.js";
import { getEnvironmentWidth } from "../../state/environment.js";
import { stickman, getTotalHeight } from "../../state/entities.js";
import { input } from "../input/index.js";
import { clamp } from "../utils/math.js";
import { spawnProjectile } from "../combat/projectiles.js";
import { POSES, GRAVITY } from "../../config/constants.js";

const PLAYER_DRIVER_ID = "player-stickman";

function getPlayerVehicle() {
  return stickman.vehicleId ? getVehicleById(stickman.vehicleId) : null;
}

function applyIdleDrag(vehicle, dragAmount, delta) {
  if (dragAmount <= 0) {
    return;
  }
  const drag = dragAmount * delta;
  if (vehicle.vx > 0) {
    vehicle.vx = Math.max(0, vehicle.vx - drag);
  } else if (vehicle.vx < 0) {
    vehicle.vx = Math.min(0, vehicle.vx + drag);
  }
}

function applyGroundDriverInput(vehicle, definition, delta) {
  const accelerateRight = input.right && !input.left;
  const accelerateLeft = input.left && !input.right;
  const direction = accelerateRight ? 1 : accelerateLeft ? -1 : 0;
  const acceleration = definition.acceleration ?? 0;
  const braking = definition.braking ?? 600;
  const maxSpeed = definition.maxSpeed ?? 360;
  const idleDrag = definition.idleDrag ?? 0;

  if (direction !== 0 && acceleration > 0) {
    vehicle.vx += direction * acceleration * delta;
  }

  if (input.down && vehicle.onGround && braking > 0) {
    const brake = braking * delta;
    if (vehicle.vx > 0) {
      vehicle.vx = Math.max(0, vehicle.vx - brake);
    } else if (vehicle.vx < 0) {
      vehicle.vx = Math.min(0, vehicle.vx + brake);
    }
  } else if (direction === 0) {
    applyIdleDrag(vehicle, idleDrag, delta);
  }

  if (maxSpeed > 0) {
    vehicle.vx = clamp(vehicle.vx, -maxSpeed, maxSpeed);
  }

  if (direction !== 0) {
    vehicle.facing = direction;
  } else if (Math.abs(vehicle.vx) > 8) {
    vehicle.facing = vehicle.vx > 0 ? 1 : -1;
  }
}

function syncStickmanWithVehicle(vehicle, definition) {
  const seat = definition.driverSeat ?? { x: 0, y: definition.height };
  const baseHeight = getTotalHeight(POSES.standing);
  const seatWorldX = vehicle.x + seat.x;
  const seatWorldY = vehicle.y + seat.y;
  const envWidth = getEnvironmentWidth();
  const clampedX = clamp(seatWorldX, 40, envWidth - 40);
  stickman.x = clampedX;
  stickman.y = seatWorldY - baseHeight;
  stickman.vx = vehicle.vx;
  stickman.vy = vehicle.vy;
  const movementType = definition.movementType ?? "ground";
  if (movementType === "air") {
    stickman.onGround = false;
  } else if (movementType === "water") {
    stickman.onGround = true;
  } else {
    stickman.onGround = vehicle.onGround;
  }
  stickman.facing = vehicle.facing ?? stickman.facing;
}

function enterVehicle(vehicle) {
  const definition = VEHICLE_DEFINITIONS[vehicle.type];
  if (!definition) {
    return;
  }

  vehicle.driverId = PLAYER_DRIVER_ID;
  vehicle.enterCooldown = 0.45;
  stickman.vehicleId = vehicle.id;
  stickman.controlMode = "vehicle";
  stickman.vehicleCandidateId = null;
  stickman.attacking = false;
  stickman.currentAttack = null;
  stickman.attackIndex = -1;
  stickman.attackElapsed = 0;
  stickman.comboWindowOpen = false;
  stickman.comboWindowTimer = 0;
  stickman.nextAttackQueued = false;
  stickman.hitboxSpawned = false;
  stickman.activeHitboxes.length = 0;
  stickman.crouching = false;
  stickman.rolling = false;
  syncStickmanWithVehicle(vehicle, definition);
}

function exitVehicle(vehicle, options = {}) {
  const definition = VEHICLE_DEFINITIONS[vehicle.type];
  if (!definition) {
    stickman.vehicleId = null;
    stickman.controlMode = "onFoot";
    return;
  }

  vehicle.driverId = null;
  if (!options.skipCooldown) {
    vehicle.enterCooldown = Math.max(vehicle.enterCooldown, options.cooldown ?? 0.35);
  }

  const baseHeight = getTotalHeight(POSES.standing);
  const preferRight = options.preferDirection ?? (vehicle.facing >= 0 ? 1 : -1);
  const exitOffsets = definition.exitOffsets ?? [];
  const fallbackOffset = preferRight >= 0 ? { x: definition.width * 0.6, y: 0 } : { x: -definition.width * 0.6, y: 0 };
  const chosenOffset = preferRight >= 0 ? exitOffsets[0] ?? fallbackOffset : exitOffsets[1] ?? fallbackOffset;

  stickman.vehicleId = null;
  stickman.controlMode = "onFoot";
  stickman.vehicleCandidateId = null;
  const envWidth = getEnvironmentWidth();
  stickman.x = clamp(vehicle.x + chosenOffset.x, 40, envWidth - 40);
  stickman.y = GROUND_Y - baseHeight;
  if (options.inheritVelocity === false) {
    stickman.vx = 0;
    stickman.vy = 0;
  } else {
    stickman.vx = vehicle.vx * 0.5;
    stickman.vy = Math.min(vehicle.vy, 0);
  }
  stickman.onGround = true;
  stickman.facing = preferRight >= 0 ? 1 : -1;
}

function forcePlayerExitVehicle(options = {}) {
  const vehicle = getPlayerVehicle();
  if (!vehicle) {
    stickman.vehicleId = null;
    stickman.controlMode = "onFoot";
    return;
  }
  exitVehicle(vehicle, { skipCooldown: true, inheritVelocity: false, ...options });
}

function handleVehicleInteraction(interactRequested) {
  if (stickman.vehicleId) {
    stickman.vehicleCandidateId = null;
    const vehicle = getPlayerVehicle();
    if (interactRequested && vehicle && vehicle.enterCooldown <= 0.01) {
      exitVehicle(vehicle, { preferDirection: vehicle.facing });
    }
    return;
  }

  if (stickman.health <= 0) {
    stickman.vehicleCandidateId = null;
    return;
  }

  let bestVehicle = null;
  let bestScore = Number.POSITIVE_INFINITY;
  const playerHeight = getTotalHeight(POSES.standing);
  const playerFeetY = stickman.y + playerHeight;

  for (const vehicle of vehicles) {
    const definition = VEHICLE_DEFINITIONS[vehicle.type];
    if (!definition) {
      continue;
    }
    if (vehicle.driverId) {
      continue;
    }
    if (vehicle.enterCooldown > 0) {
      continue;
    }

    const horizontal = Math.abs(stickman.x - vehicle.x);
    const maxHorizontal = definition.enterRadius ?? 64;
    if (horizontal > maxHorizontal) {
      continue;
    }

    const vehicleFeet = vehicle.y + definition.height;
    const vertical = Math.abs(playerFeetY - vehicleFeet);
    const movementType = definition.movementType ?? "ground";
    let verticalAllowance;
    if (movementType === "air") {
      verticalAllowance = Math.max(120, (definition.hoverMinAltitude ?? 0) + 80);
    } else if (movementType === "water") {
      verticalAllowance = Math.max(90, (definition.waterSurfaceOffset ?? 24) + 70);
    } else {
      verticalAllowance = 80;
    }
    if (vertical > verticalAllowance) {
      continue;
    }

    const score = horizontal + vertical * 0.5;
    if (score < bestScore) {
      bestScore = score;
      bestVehicle = vehicle;
    }
  }

  stickman.vehicleCandidateId = bestVehicle?.id ?? null;

  if (interactRequested && bestVehicle) {
    enterVehicle(bestVehicle);
  }
}

function updateGroundVehicle(vehicle, definition, delta, isControlled) {
  if (isControlled) {
    applyGroundDriverInput(vehicle, definition, delta);
  } else {
    applyIdleDrag(vehicle, definition.idleDrag ?? 0, delta);
  }

  const airDrag = definition.airDrag ?? 1;
  if (!vehicle.onGround && airDrag > 0 && airDrag < 1) {
    vehicle.vx *= Math.pow(airDrag, Math.max(0, delta * 60));
  }

  vehicle.vy += GRAVITY * delta;
  vehicle.x += vehicle.vx * delta;
  vehicle.y += vehicle.vy * delta;

  const groundTop = GROUND_Y - definition.height;
  if (vehicle.y >= groundTop) {
    vehicle.y = groundTop;
    vehicle.vy = 0;
    vehicle.onGround = true;
  } else {
    vehicle.onGround = false;
  }

  const halfWidth = definition.width * 0.5;
  const minX = halfWidth + 32;
  const envWidth = getEnvironmentWidth();
  const maxX = envWidth - halfWidth - 32;
  vehicle.x = clamp(vehicle.x, minX, maxX);
  if (vehicle.x === minX || vehicle.x === maxX) {
    vehicle.vx = 0;
  }

  const targetTilt = clamp(vehicle.vx / Math.max(1, definition.maxSpeed ?? 360) * 0.12, -0.25, 0.25);
  vehicle.tilt += (targetTilt - vehicle.tilt) * Math.min(1, delta * 10);
}

function updateWaterVehicle(vehicle, definition, delta, isControlled) {
  const acceleration = definition.waterAcceleration ?? definition.acceleration ?? 220;
  const maxSpeed = definition.waterMaxSpeed ?? definition.maxSpeed ?? 220;
  const reverseSpeed = definition.waterReverseSpeed ?? Math.max(80, maxSpeed * 0.6);
  const idleDrag = definition.waterIdleDrag ?? definition.idleDrag ?? 200;
  const brakeStrength = (definition.turnDrag ?? 220);
  const bobAmplitude = definition.bobAmplitude ?? 4;
  const bobSpeed = definition.bobSpeed ?? 1.4;
  const splashIntensity = definition.splashIntensity ?? 0.3;
  const waterSurface = vehicle.waterLineY ?? (GROUND_Y - (definition.waterSurfaceOffset ?? 24));
  const buoyancyPoint = definition.buoyancyPoint ?? 0.55;
  const submergedOffset = definition.submergedOffset ?? 0;

  const steerRight = isControlled && input.right && !input.left;
  const steerLeft = isControlled && input.left && !input.right;
  const direction = steerRight ? 1 : steerLeft ? -1 : 0;

  if (direction !== 0 && acceleration > 0) {
    vehicle.vx += direction * acceleration * delta;
  } else {
    applyIdleDrag(vehicle, idleDrag, delta);
  }

  if (isControlled && input.down) {
    const brake = brakeStrength * delta;
    if (vehicle.vx > 0) {
      vehicle.vx = Math.max(vehicle.vx - brake, -reverseSpeed);
    } else if (vehicle.vx < 0) {
      vehicle.vx = Math.min(vehicle.vx + brake, reverseSpeed);
    } else if (brake > 0) {
      vehicle.vx = clamp(vehicle.vx - vehicle.facing * brake * 0.15, -reverseSpeed, reverseSpeed);
    }
  }

  vehicle.vx = clamp(vehicle.vx, -reverseSpeed, maxSpeed);

  if (direction !== 0) {
    vehicle.facing = direction;
  } else if (Math.abs(vehicle.vx) > 4) {
    vehicle.facing = vehicle.vx > 0 ? 1 : -1;
  }

  vehicle.x += vehicle.vx * delta;
  const halfWidth = definition.width * 0.5;
  const minX = halfWidth + 32;
  const envWidth = getEnvironmentWidth();
  const maxX = envWidth - halfWidth - 32;
  vehicle.x = clamp(vehicle.x, minX, maxX);
  if (vehicle.x === minX || vehicle.x === maxX) {
    vehicle.vx = 0;
  }

  vehicle.vy = 0;

  vehicle.bobPhase = (vehicle.bobPhase ?? 0) + delta * (bobSpeed * (isControlled ? 1.2 : 0.85));
  const bobOffset = Math.sin(vehicle.bobPhase) * bobAmplitude;
  const sprayOffset = Math.sin(vehicle.bobPhase * 0.5 + vehicle.x * 0.02) * splashIntensity * 6;
  const targetY = waterSurface - definition.height * buoyancyPoint + submergedOffset + bobOffset + sprayOffset;
  vehicle.y += (targetY - vehicle.y) * Math.min(1, delta * 6.5);

  vehicle.onGround = false;

  const tiltTarget = clamp(vehicle.vx / Math.max(1, maxSpeed) * 0.22 + Math.sin(vehicle.bobPhase + vehicle.facing * 0.4) * 0.05, -0.45, 0.45);
  vehicle.tilt += (tiltTarget - vehicle.tilt) * Math.min(1, delta * 5);
}

function updateAirVehicle(vehicle, definition, delta, isControlled) {
  const horizontalAcceleration = definition.horizontalAcceleration ?? definition.acceleration ?? 0;
  const horizontalMaxSpeed = definition.horizontalMaxSpeed ?? definition.maxSpeed ?? 320;
  const horizontalDrag = definition.horizontalDrag ?? definition.idleDrag ?? 200;
  const airDrag = definition.airDrag ?? 0.97;
  const minAltitude = definition.hoverMinAltitude ?? 0;
  const maxAltitude = Math.max(minAltitude, definition.hoverMaxAltitude ?? minAltitude);
  const altitudeRate = definition.altitudeRate ?? 160;
  const autopilotStrength = definition.autopilotStrength ?? 4;
  const verticalDamping = definition.verticalDamping ?? 0.9;
  const maxVerticalSpeed = definition.maxVerticalSpeed ?? 220;
  const liftPower = definition.liftPower ?? 0;
  const descendPower = definition.descendPower ?? liftPower;

  const accelerateRight = isControlled && input.right && !input.left;
  const accelerateLeft = isControlled && input.left && !input.right;
  const direction = accelerateRight ? 1 : accelerateLeft ? -1 : 0;

  if (direction !== 0 && horizontalAcceleration > 0) {
    vehicle.vx += direction * horizontalAcceleration * delta;
  } else {
    applyIdleDrag(vehicle, horizontalDrag, delta);
  }

  if (horizontalMaxSpeed > 0) {
    vehicle.vx = clamp(vehicle.vx, -horizontalMaxSpeed, horizontalMaxSpeed);
  }

  if (direction !== 0) {
    vehicle.facing = direction;
  } else if (Math.abs(vehicle.vx) > 6) {
    vehicle.facing = vehicle.vx > 0 ? 1 : -1;
  }

  vehicle.vx *= Math.pow(airDrag, delta * 60);

  const gravity = GRAVITY * (definition.gravityScale ?? 0.25);
  vehicle.vy += gravity * delta;

  if (!Number.isFinite(vehicle.preferredAltitude)) {
    vehicle.preferredAltitude = definition.spawnHover ?? minAltitude;
  }

  if (isControlled) {
    if (input.jump) {
      vehicle.preferredAltitude += altitudeRate * delta;
    }
    if (input.down) {
      vehicle.preferredAltitude -= altitudeRate * delta;
    }
  } else {
    const altitude = GROUND_Y - (vehicle.y + definition.height);
    vehicle.preferredAltitude += (altitude - vehicle.preferredAltitude) * Math.min(1, delta * 0.5);
  }

  vehicle.preferredAltitude = clamp(vehicle.preferredAltitude, minAltitude, maxAltitude);

  const altitude = clamp(GROUND_Y - (vehicle.y + definition.height), minAltitude, maxAltitude);
  const altitudeError = vehicle.preferredAltitude - altitude;
  vehicle.vy -= altitudeError * autopilotStrength * delta;

  if (isControlled && liftPower > 0) {
    if (input.jump) {
      vehicle.vy -= liftPower * 0.25 * delta;
    }
    if (input.down) {
      vehicle.vy += descendPower * 0.25 * delta;
    }
  }

  vehicle.vy *= Math.pow(verticalDamping, delta * 60);
  if (maxVerticalSpeed > 0) {
    vehicle.vy = clamp(vehicle.vy, -maxVerticalSpeed, maxVerticalSpeed);
  }

  vehicle.x += vehicle.vx * delta;
  vehicle.y += vehicle.vy * delta;

  const halfWidth = definition.width * 0.5;
  const minX = halfWidth + 32;
  const envWidth = getEnvironmentWidth();
  const maxX = envWidth - halfWidth - 32;
  vehicle.x = clamp(vehicle.x, minX, maxX);
  if (vehicle.x === minX || vehicle.x === maxX) {
    vehicle.vx = 0;
  }

  const newAltitude = clamp(GROUND_Y - (vehicle.y + definition.height), minAltitude, maxAltitude);
  vehicle.y = GROUND_Y - definition.height - newAltitude;
  if ((newAltitude === minAltitude && vehicle.vy > 0) || (newAltitude === maxAltitude && vehicle.vy < 0)) {
    vehicle.vy = 0;
  }

  vehicle.onGround = false;

  const targetTilt = clamp(vehicle.vx / Math.max(1, horizontalMaxSpeed) * 0.35 - altitudeError * 0.02, -0.6, 0.6);
  vehicle.tilt += (targetTilt - vehicle.tilt) * Math.min(1, delta * 6);
}

function fireMountedWeaponProjectile(vehicle, mountDef, mountState, facingSign) {
  const followFacing = mountDef.followVehicleFacing !== false;
  const vehicleFacing = vehicle.facing ?? 1;
  const appliedFacing = facingSign !== undefined ? facingSign : (mountDef.facing ?? 1) * (followFacing ? vehicleFacing : 1);
  const offsetX = mountDef.offset?.x ?? 0;
  const offsetY = mountDef.offset?.y ?? 0;
  const facingMultiplier = followFacing ? vehicleFacing : 1;
  const baseX = vehicle.x + offsetX * facingMultiplier;
  const baseY = vehicle.y + offsetY;
  const muzzles = mountDef.muzzles && mountDef.muzzles.length > 0 ? mountDef.muzzles : [{ x: mountDef.muzzle?.x ?? 0, y: mountDef.muzzle?.y ?? 0 }];
  const muzzleIndex = mountState.muzzleIndex ?? 0;
  const muzzle = muzzles[muzzleIndex % muzzles.length];
  mountState.muzzleIndex = (muzzleIndex + 1) % muzzles.length;
  const muzzleX = baseX + (muzzle?.x ?? 0) * facingMultiplier;
  const muzzleY = baseY + (muzzle?.y ?? 0);

  const projectileDef = mountDef.projectile ?? {};
  const speed = projectileDef.speed ?? 600;
  const scatterRadians = (mountDef.scatter ?? 0) * (Math.PI / 180);
  const spreadAngle = scatterRadians > 0 ? (Math.random() - 0.5) * scatterRadians : 0;
  const facingSignValue = appliedFacing >= 0 ? 1 : -1;
  const vx = Math.cos(spreadAngle) * speed * facingSignValue;
  const vy = Math.sin(spreadAngle) * speed + (projectileDef.verticalSpeed ?? 0);

  spawnProjectile({
    x: muzzleX,
    y: muzzleY,
    vx,
    vy,
    radius: projectileDef.radius ?? 5,
    lifetime: projectileDef.lifetime ?? 1.3,
    color: projectileDef.color ?? "#ffd27a",
    damage: projectileDef.damage ?? 12,
    knockback: projectileDef.knockback ?? 80,
    facing: facingSignValue,
    gravityFactor: projectileDef.gravityFactor ?? 0.12
  });

  mountState.flashTimer = mountDef.flashDuration ?? 0.1;
  mountState.lastMuzzleX = muzzleX;
  mountState.lastMuzzleY = muzzleY;
}

function updateMountedWeaponsForVehicle(vehicle, definition, delta, isControlled) {
  const mountDefs = definition.mountedWeapons ?? [];
  const mounts = vehicle.mounts ?? [];
  if (mountDefs.length === 0 || mounts.length === 0) {
    return;
  }

  const vehicleFacing = vehicle.facing ?? 1;
  const wantsPrimary = isControlled && input.attackDown;
  const wantsSecondary = isControlled && input.throwDown;

  for (let index = 0; index < mountDefs.length; index += 1) {
    const mountDef = mountDefs[index];
    const mountState = mounts[index];
    if (!mountDef || !mountState) {
      continue;
    }

    mountState.cooldown = Math.max(0, (mountState.cooldown ?? 0) - delta);
    mountState.flashTimer = Math.max(0, (mountState.flashTimer ?? 0) - delta);

    let shouldFire = false;
    const binding = mountDef.binding ?? "primary";
    if (isControlled) {
      if (binding === "primary") {
        shouldFire = wantsPrimary;
      } else if (binding === "secondary") {
        shouldFire = wantsSecondary;
      }
    } else if (mountDef.autoFire) {
      shouldFire = true;
    }

    if (!shouldFire || mountState.cooldown > 0) {
      continue;
    }

    const followFacing = mountDef.followVehicleFacing !== false;
    const facingSign = (mountDef.facing ?? 1) * (followFacing ? vehicleFacing : 1);
    fireMountedWeaponProjectile(vehicle, mountDef, mountState, facingSign);
    mountState.cooldown = mountDef.fireInterval ?? 0.2;
  }
}

function updateVehicles(delta) {
  for (const vehicle of vehicles) {
    const definition = VEHICLE_DEFINITIONS[vehicle.type];
    if (!definition) {
      continue;
    }

    vehicle.enterCooldown = Math.max(0, vehicle.enterCooldown - delta);
    vehicle.damageFlash = Math.max(0, vehicle.damageFlash - delta);

    const isControlled = vehicle.driverId === PLAYER_DRIVER_ID;
    const movementType = definition.movementType ?? "ground";

    if (movementType === "air") {
      updateAirVehicle(vehicle, definition, delta, isControlled);
    } else if (movementType === "water") {
      updateWaterVehicle(vehicle, definition, delta, isControlled);
    } else {
      updateGroundVehicle(vehicle, definition, delta, isControlled);
    }

    updateMountedWeaponsForVehicle(vehicle, definition, delta, isControlled);

    if (isControlled) {
      syncStickmanWithVehicle(vehicle, definition);
    } else if (movementType === "ground") {
      vehicle.tilt += (0 - vehicle.tilt) * Math.min(1, delta * 10);
    }
  }
}

export { updateVehicles, handleVehicleInteraction, getPlayerVehicle, forcePlayerExitVehicle };


