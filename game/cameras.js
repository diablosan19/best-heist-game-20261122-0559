// The wall cameras: they pan back and forth on a fixed sweep, and their
// cones feed the alarm meter directly. An EMP blacks them out for six
// seconds — the glass goes dark and the room is yours until they reboot.

import { angleDiff, distance, hasLineOfSight } from './geometry.js';
import { visibilityOf } from './thief.js';

export const CAMERA_RANGE = 280;
export const CAMERA_HALF_ANGLE = 0.5; // ~29 degrees each side
export const EMP_DURATION = 6;

export function makeCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: (def.baseAngle * Math.PI) / 180,
    sweep: (def.sweep * Math.PI) / 180,
    speed: (def.speed * Math.PI) / 180,
    range: def.range,
    phase: Math.random() * Math.PI * 2,
    angle: (def.baseAngle * Math.PI) / 180,
    darkTimer: 0,
    spotting: false,
  };
}

// The camera's pan: a slow sine sweep around its base angle.
export function updateCamera(camera, dt) {
  if (camera.darkTimer > 0) {
    camera.darkTimer -= dt;
    camera.spotting = false;
    return;
  }
  camera.phase += camera.speed * dt * 2;
  camera.angle = camera.baseAngle + Math.sin(camera.phase) * (camera.sweep / 2);
}

// How hard the camera is feeding the alarm this frame: 0 when it cannot
// see Rook, up to ~55 per second when he stands close in its cone.
export function cameraSeesThief(camera, thief, solids) {
  camera.spotting = false;
  if (camera.darkTimer > 0) return 0;
  const d = distance(camera.x, camera.y, thief.x, thief.y);
  if (d > camera.range) return 0;
  const toThief = Math.atan2(thief.y - camera.y, thief.x - camera.x);
  if (Math.abs(angleDiff(camera.angle, toThief)) > CAMERA_HALF_ANGLE) return 0;
  if (!hasLineOfSight(camera.x, camera.y, thief.x, thief.y, solids)) return 0;
  if (thief.disguiseTimer > 0 && d > 60) return 0;
  camera.spotting = true;
  const closeness = 1 - d / camera.range;
  return (30 + 40 * closeness) * visibilityOf(thief);
}

// The EMP blacks out every camera on the floor.
export function blackoutCameras(cameras) {
  for (const camera of cameras) {
    camera.darkTimer = EMP_DURATION;
    camera.spotting = false;
  }
}
