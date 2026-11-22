// Small geometry helpers every system shares: line of sight, circle
// against rectangles, and raycasts for drawing vision cones. All distances
// are in canvas pixels, all angles in radians.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Shortest signed turn from angle `from` to angle `to`, in (-PI, PI].
export function angleDiff(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Does the segment (x1,y1)-(x2,y2) cross the rectangle? Used for sight.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// True when nothing solid stands between the two points.
export function hasLineOfSight(x1, y1, x2, y2, solids) {
  for (const s of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return false;
  }
  return true;
}

// Distance from (x,y) along `angle` to the nearest solid, capped at maxDist.
export function raycast(x, y, angle, solids, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const s of solids) {
    const t = rayRectDistance(x, y, dx, dy, s);
    if (t !== null && t < best) best = t;
  }
  return best;
}

function rayRectDistance(x, y, dx, dy, r) {
  let tmin = 0;
  let tmax = Infinity;
  if (dx === 0) {
    if (x < r.x || x > r.x + r.w) return null;
  } else {
    let t1 = (r.x - x) / dx;
    let t2 = (r.x + r.w - x) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (dy === 0) {
    if (y < r.y || y > r.y + r.h) return null;
  } else {
    let t1 = (r.y - y) / dy;
    let t2 = (r.y + r.h - y) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

// Push a circle out of every rectangle it overlaps. Returns the circle's
// corrected centre; call once per axis pair for sliding movement.
export function pushCircleOutOfSolids(x, y, r, solids) {
  for (const s of solids) {
    const nx = clamp(x, s.x, s.x + s.w);
    const ny = clamp(y, s.y, s.y + s.h);
    const ddx = x - nx;
    const ddy = y - ny;
    const d2 = ddx * ddx + ddy * ddy;
    if (d2 >= r * r) continue;
    if (d2 === 0) {
      // Centre inside the rectangle: shove out along the shallowest side.
      const left = x - s.x;
      const right = s.x + s.w - x;
      const top = y - s.y;
      const bottom = s.y + s.h - y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = s.x - r;
      else if (m === right) x = s.x + s.w + r;
      else if (m === top) y = s.y - r;
      else y = s.y + s.h + r;
    } else {
      const d = Math.sqrt(d2);
      x = nx + (ddx / d) * r;
      y = ny + (ddy / d) * r;
    }
  }
  return { x, y };
}
