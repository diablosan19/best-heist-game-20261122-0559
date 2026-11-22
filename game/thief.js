// Rook, the thief: movement, sneaking, and the three tools. The thief is a
// circle that slides along walls and cover; every tool costs a limited use,
// so each one is a decision, not a habit.

import { BORDER, WORLD_H, WORLD_W } from './levels.js';
import { clamp, pushCircleOutOfSolids } from './geometry.js';

export const THIEF_RADIUS = 13;
export const WALK_SPEED = 175;
export const SNEAK_SPEED = 105;

export function makeThief(start) {
  return {
    x: start.x,
    y: start.y,
    r: THIEF_RADIUS,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    // Tools, restocked at the start of every floor.
    noise: 3,
    emp: 2,
    disguise: 1,
    disguiseTimer: 0,
    stepTimer: 0,
  };
}

// Move the thief one frame from the held keys. Returns true when a footstep
// sound should play. `solids` are the walls and cover of the floor.
export function moveThief(thief, keys, dt, solids) {
  let dx = 0;
  let dy = 0;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;
  thief.sneaking = !!keys.sneak;
  thief.moving = dx !== 0 || dy !== 0;
  if (!thief.moving) return false;

  const len = Math.hypot(dx, dy);
  const speed = thief.sneaking ? SNEAK_SPEED : WALK_SPEED;
  const nx = thief.x + (dx / len) * speed * dt;
  const ny = thief.y + (dy / len) * speed * dt;
  thief.facing = Math.atan2(dy, dx);

  // Move one axis at a time so the thief slides along walls instead of
  // sticking to them.
  let pos = pushCircleOutOfSolids(nx, thief.y, thief.r, solids);
  pos = pushCircleOutOfSolids(pos.x, ny, thief.r, solids);
  thief.x = clamp(pos.x, BORDER + thief.r, WORLD_W - BORDER - thief.r);
  thief.y = clamp(pos.y, BORDER + thief.r, WORLD_H - BORDER - thief.r);

  thief.stepTimer -= dt;
  if (thief.stepTimer <= 0) {
    thief.stepTimer = thief.sneaking ? 0.55 : 0.34;
    return true;
  }
  return false;
}

// A noise-maker flies to the clicked point and rings: every guard in earshot
// walks over to look. Returns the landing point, or null when none are left.
export function throwNoiseMaker(thief, tx, ty) {
  if (thief.noise <= 0) return null;
  thief.noise -= 1;
  return {
    x: clamp(tx, BORDER, WORLD_W - BORDER),
    y: clamp(ty, BORDER, WORLD_H - BORDER),
    timer: 2.2,
    radius: 260,
  };
}

// The EMP blacks out every camera for six seconds. Returns true when fired.
export function fireEmp(thief) {
  if (thief.emp <= 0) return false;
  thief.emp -= 1;
  return true;
}

// The curator's disguise: guards look straight through Rook for eight
// seconds, unless he walks right up to one. Returns true when worn.
export function wearDisguise(thief) {
  if (thief.disguise <= 0 || thief.disguiseTimer > 0) return false;
  thief.disguise -= 1;
  thief.disguiseTimer = 8;
  return true;
}

export function tickThiefTimers(thief, dt) {
  if (thief.disguiseTimer > 0) thief.disguiseTimer -= dt;
}

// How easy Rook is to spot right now: 1 while running in the open, less
// while sneaking, near nothing while disguised.
export function visibilityOf(thief) {
  if (thief.disguiseTimer > 0) return 0.12;
  if (thief.sneaking) return 0.55;
  return 1;
}
