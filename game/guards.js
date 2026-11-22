// The museum's wardens: patrol routes, vision cones, and the suspicion
// that turns a stroll into a chase. A guard is fair: it only reacts to what
// it can actually see, and it gives up and goes back to its route when the
// trail goes cold.

import { angleDiff, clamp, distance, hasLineOfSight } from './geometry.js';
import { visibilityOf } from './thief.js';

export const CONE_RANGE = 230;
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const CHASE_SPEED = 205;
export const INVESTIGATE_SPEED = 130;

// suspicion thresholds: stare, walk over to look, run the thief down.
export const STARE_AT = 50;
export const INVESTIGATE_AT = 80;
export const CHASE_AT = 100;

export function makeGuard(def, index) {
  return {
    name: def.name,
    index,
    x: def.x,
    y: def.y,
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    speed: def.speed,
    facing: Math.atan2(def.waypoints[1][1] - def.y, def.waypoints[1][0] - def.x),
    state: 'patrol', // patrol | stare | investigate | chase | return
    suspicion: 0,
    pauseTimer: 0,
    stareTimer: 0,
    target: null, // {x, y} the guard is walking toward
    lastSeen: null,
    giveUpTimer: 0,
    bob: Math.random() * Math.PI * 2,
  };
}

function moveToward(guard, tx, ty, speed, dt, solids) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return true;
  const step = Math.min(d, speed * dt);
  const nx = guard.x + (dx / d) * step;
  const ny = guard.y + (dy / d) * step;
  // Guards walk the open floor; a wall in the way means they wait at the
  // waypoint edge rather than clipping through it.
  let blocked = false;
  for (const s of solids) {
    if (nx > s.x - 10 && nx < s.x + s.w + 10 && ny > s.y - 10 && ny < s.y + s.h + 10) {
      blocked = true;
      break;
    }
  }
  if (!blocked) {
    guard.x = nx;
    guard.y = ny;
  }
  guard.facing = Math.atan2(dy, dx);
  return d - step < 4;
}

// Can this guard see the thief right now? Inside the cone, in range, with
// a clear line, and not fooled by the disguise at distance.
export function guardSeesThief(guard, thief, solids) {
  const d = distance(guard.x, guard.y, thief.x, thief.y);
  if (d > CONE_RANGE) return 0;
  const toThief = Math.atan2(thief.y - guard.y, thief.x - guard.x);
  if (Math.abs(angleDiff(guard.facing, toThief)) > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(guard.x, guard.y, thief.x, thief.y, solids)) return 0;
  // The disguise only holds past arm's length.
  if (thief.disguiseTimer > 0 && d > 46) return 0;
  // Closer and louder means faster suspicion: 100 at point blank in ~1.2s.
  const closeness = 1 - d / CONE_RANGE;
  return (26 + 58 * closeness) * visibilityOf(thief);
}

export function updateGuard(guard, thief, solids, dt, alarm) {
  guard.bob += dt * 6;
  const seen = guardSeesThief(guard, thief, solids);

  if (seen > 0) {
    guard.suspicion = clamp(guard.suspicion + seen * dt, 0, 100);
    guard.lastSeen = { x: thief.x, y: thief.y };
  } else {
    // Suspicion drains when the thief is out of sight; faster when the
    // guard is calm, slower once it is already alarmed.
    const drain = guard.suspicion < STARE_AT ? 26 : 12;
    guard.suspicion = clamp(guard.suspicion - drain * dt, 0, 100);
  }

  // A full alarm sends every guard hunting the last place Rook was seen.
  if (alarm >= 100 && guard.state !== 'chase' && guard.lastSeen) {
    guard.state = 'chase';
    guard.target = { ...guard.lastSeen };
  }

  switch (guard.state) {
    case 'patrol': {
      if (guard.suspicion >= CHASE_AT) {
        guard.state = 'chase';
        guard.target = { ...guard.lastSeen };
        break;
      }
      if (guard.suspicion >= INVESTIGATE_AT) {
        guard.state = 'investigate';
        guard.target = { ...guard.lastSeen };
        break;
      }
      if (guard.suspicion >= STARE_AT) {
        guard.state = 'stare';
        guard.stareTimer = 0.9;
        break;
      }
      const wp = guard.waypoints[guard.waypointIndex];
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        break;
      }
      if (moveToward(guard, wp[0], wp[1], guard.speed, dt, solids)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = 0.7;
      }
      break;
    }
    case 'stare': {
      // Freeze and look hard at the thief's last position.
      if (guard.lastSeen) {
        guard.facing = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
      }
      guard.stareTimer -= dt;
      if (guard.suspicion >= CHASE_AT) {
        guard.state = 'chase';
        guard.target = { ...guard.lastSeen };
      } else if (guard.suspicion >= INVESTIGATE_AT) {
        guard.state = 'investigate';
        guard.target = { ...guard.lastSeen };
      } else if (guard.stareTimer <= 0) {
        guard.state = guard.suspicion >= STARE_AT ? 'stare' : 'patrol';
        if (guard.state === 'patrol') guard.stareTimer = 0;
        else guard.stareTimer = 0.9;
      }
      break;
    }
    case 'investigate': {
      if (guard.suspicion >= CHASE_AT) {
        guard.state = 'chase';
        guard.target = { ...guard.lastSeen };
        break;
      }
      if (!guard.target) {
        guard.state = 'return';
        break;
      }
      if (moveToward(guard, guard.target.x, guard.target.y, INVESTIGATE_SPEED, dt, solids)) {
        // Look around the spot, then give up and head home.
        guard.pauseTimer += dt;
        guard.facing += dt * 2.4;
        if (guard.pauseTimer > 1.6) {
          guard.pauseTimer = 0;
          guard.target = null;
          guard.state = 'return';
        }
      }
      if (guard.suspicion < 25) {
        guard.state = 'return';
        guard.target = null;
      }
      break;
    }
    case 'chase': {
      const target = guard.lastSeen || guard.target;
      if (!target) {
        guard.state = 'return';
        break;
      }
      moveToward(guard, target.x, target.y, CHASE_SPEED, dt, solids);
      guard.giveUpTimer += dt;
      // The chase only lasts while the thief keeps being seen; five seconds
      // of nothing and the guard falls back to a search.
      if (seen <= 0 && guard.giveUpTimer > 5) {
        guard.giveUpTimer = 0;
        guard.state = 'investigate';
        guard.target = { ...target };
      } else if (seen > 0) {
        guard.giveUpTimer = 0;
      }
      break;
    }
    case 'return': {
      // Walk back to the nearest waypoint, then resume the patrol.
      let nearest = 0;
      let nearestD = Infinity;
      guard.waypoints.forEach((wp, i) => {
        const d = distance(guard.x, guard.y, wp[0], wp[1]);
        if (d < nearestD) {
          nearestD = d;
          nearest = i;
        }
      });
      const wp = guard.waypoints[nearest];
      if (moveToward(guard, wp[0], wp[1], guard.speed, dt, solids)) {
        guard.waypointIndex = (nearest + 1) % guard.waypoints.length;
        guard.state = 'patrol';
      }
      if (guard.suspicion >= INVESTIGATE_AT) {
        guard.state = 'investigate';
        guard.target = { ...guard.lastSeen };
      }
      break;
    }
  }
}

// A noise-maker within earshot pulls a patrolling guard off its route.
export function guardHearsNoise(guard, noise) {
  if (guard.state === 'chase') return;
  if (distance(guard.x, guard.y, noise.x, noise.y) > noise.radius) return;
  guard.state = 'investigate';
  guard.target = { x: noise.x, y: noise.y };
  guard.pauseTimer = 0;
}

// Close enough to grab Rook: the caught moment.
export function guardCatchesThief(guard, thief) {
  return distance(guard.x, guard.y, thief.x, thief.y) < guardRadius() + thief.r - 2;
}

function guardRadius() {
  return 14;
}
