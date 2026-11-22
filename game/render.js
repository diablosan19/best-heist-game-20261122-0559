// Every pixel of Amber Vault: the night museum, the marble floor, the
// guards' red cones, the cameras' sweep, the amber prize glowing on its
// plinth, and the full-screen moments (title, caught, getaway). All art is
// drawn with canvas paths — no image files anywhere.

import { BORDER, WORLD_H, WORLD_W } from './levels.js';
import { CONE_HALF_ANGLE, CONE_RANGE } from './guards.js';
import { CAMERA_HALF_ANGLE } from './cameras.js';
import { angleDiff, raycast } from './geometry.js';

const NAVY_FLOOR_A = '#0d1530';
const NAVY_FLOOR_B = '#0a1024';
const MARBLE_LINE = 'rgba(148, 178, 220, 0.07)';
const WALL_FILL = '#1c2947';
const WALL_TRIM = '#c9a227';
const AMBER = '#ffb020';
const AMBER_GLOW = '#ffd93b';
const EXIT_GREEN = '#2fd47a';
const CONE_RED = 'rgba(255, 75, 62, 0.20)';
const CONE_RED_HOT = 'rgba(255, 75, 62, 0.38)';
const CONE_EDGE = 'rgba(255, 110, 90, 0.55)';

// A cone as a raycast fan: sample the arc, stop each ray at the first wall
// or piece of cover, and fill the fan that is left.
function conePath(ctx, ox, oy, angle, halfAngle, range, solids) {
  const steps = 26;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  for (let i = 0; i <= steps; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / steps;
    const d = raycast(ox, oy, a, solids, range);
    ctx.lineTo(ox + Math.cos(a) * d, oy + Math.sin(a) * d);
  }
  ctx.closePath();
}

function drawFloor(ctx, time) {
  ctx.fillStyle = NAVY_FLOOR_A;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // Checkerboard marble, faint enough to read as floor, not as noise.
  const tile = 72;
  for (let y = 0; y < WORLD_H; y += tile) {
    for (let x = 0; x < WORLD_W; x += tile) {
      if (((x + y) / tile) % 2 === 0) {
        ctx.fillStyle = NAVY_FLOOR_B;
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }
  ctx.strokeStyle = MARBLE_LINE;
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD_W; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_H; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
    ctx.stroke();
  }
  // A soft pool of moonlight across the middle of the hall.
  const moon = ctx.createRadialGradient(576, 300, 40, 576, 300, 520);
  moon.addColorStop(0, 'rgba(140, 170, 230, 0.10)');
  moon.addColorStop(1, 'rgba(140, 170, 230, 0)');
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  void time;
}

function drawWalls(ctx, level) {
  // The marble border.
  ctx.fillStyle = WALL_FILL;
  ctx.fillRect(0, 0, WORLD_W, BORDER);
  ctx.fillRect(0, WORLD_H - BORDER, WORLD_W, BORDER);
  ctx.fillRect(0, 0, BORDER, WORLD_H);
  ctx.fillRect(WORLD_W - BORDER, 0, BORDER, WORLD_H);
  ctx.strokeStyle = WALL_TRIM;
  ctx.lineWidth = 2;
  ctx.strokeRect(BORDER - 1, BORDER - 1, WORLD_W - 2 * BORDER + 2, WORLD_H - 2 * BORDER + 2);
  for (const w of level.walls) {
    ctx.fillStyle = WALL_FILL;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = WALL_TRIM;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }
}

function drawCasesAndPillars(ctx, level, time) {
  for (const c of level.cover) {
    if (c.kind === 'case') {
      // A glass display case: dark plinth, pale glass, an amber glint.
      ctx.fillStyle = '#131c33';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = 'rgba(150, 200, 255, 0.16)';
      ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
      ctx.strokeStyle = '#7d9cc9';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      const glint = 0.5 + 0.5 * Math.sin(time * 1.4 + c.x);
      ctx.fillStyle = `rgba(255, 208, 90, ${0.25 + 0.35 * glint})`;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.kind === 'pillar') {
      ctx.fillStyle = '#26355c';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = WALL_TRIM;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.w / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#31447a';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.w / 2 - 12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // A statue: a robed figure on a plinth, silhouetted against the dark.
      ctx.fillStyle = '#1a2440';
      ctx.fillRect(c.x, c.y + c.h - 12, c.w, 12);
      ctx.fillStyle = '#2b3c66';
      ctx.beginPath();
      ctx.moveTo(c.x + c.w / 2, c.y + 6);
      ctx.lineTo(c.x + c.w - 8, c.y + c.h - 12);
      ctx.lineTo(c.x + 8, c.y + c.h - 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a4f82';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + 8, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawExit(ctx, level, lootTaken, time) {
  const e = level.exit;
  const open = lootTaken;
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.fillStyle = open ? `rgba(47, 212, 122, ${0.25 + 0.2 * pulse})` : 'rgba(47, 212, 122, 0.10)';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = EXIT_GREEN;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = EXIT_GREEN;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2);
  if (open) {
    ctx.fillStyle = `rgba(47, 212, 122, ${0.5 * pulse})`;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('GO!', e.x + e.w / 2, e.y + e.h + 14);
  }
}

function drawLoot(ctx, level, lootTaken, time) {
  if (lootTaken) return;
  const l = level.loot;
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.6);
  // Plinth.
  ctx.fillStyle = '#1a2440';
  ctx.fillRect(l.x - 26, l.y - 18, 52, 36);
  ctx.strokeStyle = WALL_TRIM;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(l.x - 26, l.y - 18, 52, 36);
  // The amber prize: a faceted diamond, glowing.
  const glow = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 46);
  glow.addColorStop(0, `rgba(255, 176, 32, ${0.55 * pulse})`);
  glow.addColorStop(1, 'rgba(255, 176, 32, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(l.x, l.y, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = AMBER_GLOW;
  ctx.beginPath();
  ctx.moveTo(l.x, l.y - 16);
  ctx.lineTo(l.x + 12, l.y);
  ctx.lineTo(l.x, l.y + 16);
  ctx.lineTo(l.x - 12, l.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.moveTo(l.x, l.y - 16);
  ctx.lineTo(l.x + 6, l.y - 2);
  ctx.lineTo(l.x - 6, l.y - 2);
  ctx.closePath();
  ctx.fill();
  // The label, so the prize reads at a glance.
  ctx.fillStyle = AMBER;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(level.loot.name.toUpperCase(), l.x, l.y - 30);
}

function drawCoins(ctx, coins, time) {
  for (const coin of coins) {
    if (coin.taken) continue;
    const bob = Math.sin(time * 3 + coin.x) * 2;
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(coin.x - 2, coin.y + bob - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuardCone(ctx, guard, solids) {
  const hot = guard.suspicion >= 50;
  conePath(ctx, guard.x, guard.y, guard.facing, CONE_HALF_ANGLE, CONE_RANGE, solids);
  ctx.fillStyle = hot ? CONE_RED_HOT : CONE_RED;
  ctx.fill();
  ctx.strokeStyle = CONE_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGuard(ctx, guard, time) {
  // Suspicion ring under the guard: green calm, amber wary, red hunting.
  const s = guard.suspicion;
  const ring = s >= 80 ? '#ff4b3e' : s >= 50 ? AMBER : '#2fd47a';
  ctx.strokeStyle = ring;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 20 + Math.sin(time * 4 + guard.index) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  if (s >= 50) {
    // The suspicion arc: how full the meter is, at a glance.
    ctx.strokeStyle = ring;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 24, -Math.PI / 2, -Math.PI / 2 + (s / 100) * Math.PI * 2);
    ctx.stroke();
  }
  // Body: a navy warden with a peaked cap, facing where he looks.
  const bob = Math.sin(guard.bob) * 1.5;
  ctx.save();
  ctx.translate(guard.x, guard.y + bob);
  ctx.rotate(guard.facing);
  ctx.fillStyle = '#2c3e6e';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a4f82';
  ctx.beginPath();
  ctx.arc(6, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  // Cap brim and torch beam.
  ctx.fillStyle = '#1a2440';
  ctx.fillRect(10, -7, 8, 14);
  ctx.fillStyle = 'rgba(255, 240, 180, 0.9)';
  ctx.beginPath();
  ctx.arc(16, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Name tag and state word, small and quiet.
  ctx.fillStyle = 'rgba(200, 212, 232, 0.85)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(guard.name, guard.x, guard.y - 30);
  if (guard.state === 'chase') {
    ctx.fillStyle = '#ff4b3e';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('! CAUGHT YOU !', guard.x, guard.y - 44);
  } else if (guard.state === 'investigate') {
    ctx.fillStyle = AMBER;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('? heard something', guard.x, guard.y - 44);
  } else if (guard.state === 'stare') {
    ctx.fillStyle = AMBER;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('...what was that?', guard.x, guard.y - 44);
  }
}

function drawCamera(ctx, camera, solids, time) {
  const dark = camera.darkTimer > 0;
  // Its cone, orange-red and narrower than a guard's.
  if (!dark) {
    conePath(ctx, camera.x, camera.y, camera.angle, CAMERA_HALF_ANGLE, camera.range, solids);
    ctx.fillStyle = camera.spotting ? 'rgba(255, 90, 40, 0.34)' : 'rgba(255, 140, 60, 0.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 150, 80, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // The mount: a small dome on the wall, with a blinking eye.
  ctx.fillStyle = dark ? '#2a2f3a' : '#3a4358';
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = dark ? '#555' : '#8a94a8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 10, 0, Math.PI * 2);
  ctx.stroke();
  const blink = dark ? 0 : 0.5 + 0.5 * Math.sin(time * 5);
  ctx.fillStyle = camera.spotting ? '#ff4b3e' : `rgba(255, 80, 60, ${0.4 + 0.6 * blink})`;
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 4, 0, Math.PI * 2);
  ctx.fill();
  if (dark) {
    ctx.fillStyle = 'rgba(200, 212, 232, 0.8)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EMP', camera.x, camera.y - 16);
  }
}

function drawThief(ctx, thief, time) {
  const disguised = thief.disguiseTimer > 0;
  // A soft amber halo so Rook — the player — reads against the dark floor
  // at a glance, even when the room is full of red cones.
  const halo = ctx.createRadialGradient(thief.x, thief.y, 4, thief.x, thief.y, 34);
  halo.addColorStop(0, 'rgba(255, 176, 32, 0.30)');
  halo.addColorStop(1, 'rgba(255, 176, 32, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 217, 59, 0.9)';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ROOK', thief.x, thief.y - 30);
  // A soft shadow pool under Rook so he reads against the floor.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + 10, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(thief.x, thief.y);
  ctx.rotate(thief.facing);
  // Hooded figure: dark cloak, amber scarf, pale face in the hood.
  ctx.fillStyle = disguised ? '#4a3a1a' : '#141a2e';
  ctx.beginPath();
  ctx.arc(0, 0, thief.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = disguised ? AMBER : '#3a4f82';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, thief.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = AMBER;
  ctx.fillRect(2, -4, 9, 8);
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.arc(6, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (thief.sneaking) {
    ctx.fillStyle = 'rgba(125, 243, 255, 0.9)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', thief.x, thief.y - 22);
  }
  if (disguised) {
    ctx.fillStyle = AMBER;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`disguised ${Math.ceil(thief.disguiseTimer)}s`, thief.x, thief.y - 22);
  }
}

function drawNoise(ctx, noise, time) {
  if (!noise) return;
  const rings = 3;
  for (let i = 0; i < rings; i++) {
    const phase = ((time * 1.6 + i / rings) % 1);
    ctx.strokeStyle = `rgba(255, 217, 59, ${0.8 * (1 - phase)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(noise.x, noise.y, 8 + phase * 46, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = AMBER_GLOW;
  ctx.beginPath();
  ctx.arc(noise.x, noise.y, 5, 0, Math.PI * 2);
  ctx.fill();
}

// The alarm's red pulse at the screen edge: the room itself feels the heat.
function drawAlarmVignette(ctx, alarm, time) {
  if (alarm < 55) return;
  const strength = ((alarm - 55) / 45) * (0.22 + 0.08 * Math.sin(time * 6));
  const grad = ctx.createRadialGradient(576, 324, 220, 576, 324, 720);
  grad.addColorStop(0, 'rgba(255, 40, 30, 0)');
  grad.addColorStop(1, `rgba(255, 40, 30, ${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 7, 15, 0.72)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText(title, WORLD_W / 2, 250);
  ctx.fillStyle = '#f4f8ff';
  ctx.font = '20px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, WORLD_W / 2, 310 + i * 32);
  });
}

export function drawScene(ctx, game) {
  const { level, thief, guards, cameras, coins, solids, time } = game;
  drawFloor(ctx, time);
  drawCasesAndPillars(ctx, level, time);
  drawExit(ctx, level, game.lootTaken, time);
  drawLoot(ctx, level, game.lootTaken, time);
  drawCoins(ctx, coins, time);
  for (const camera of cameras) drawCamera(ctx, camera, solids, time);
  for (const guard of guards) drawGuardCone(ctx, guard, solids);
  drawWalls(ctx, level);
  for (const guard of guards) drawGuard(ctx, guard, time);
  drawNoise(ctx, game.noise, time);
  drawThief(ctx, thief, time);
  drawAlarmVignette(ctx, game.alarm, time);

  if (game.screen === 'title') {
    overlay(ctx, 'AMBER VAULT', [
      'The Meridian Museum. Three floors. One amber prize each.',
      'WASD move · Shift sneak · Click toss a noise-maker · Q EMP · E disguise',
      'Lift the prize, then reach the green EXIT — unseen.',
      '',
      'Click or press Enter to begin the heist',
    ], AMBER);
  } else if (game.screen === 'paused') {
    overlay(ctx, 'PAUSED', ['The museum holds its breath.', 'P to resume · R to restart the floor'], '#7df3ff');
  } else if (game.screen === 'caught') {
    overlay(ctx, 'CAUGHT!', [
      `${game.caughtBy || 'A warden'} grabbed Rook under the lights.`,
      `Lives left: ${game.lives} · Score: ${game.score}`,
      '',
      'Press Enter to try the floor again',
    ], '#ff4b3e');
  } else if (game.screen === 'floor') {
    overlay(ctx, 'FLOOR CLEAR', [
      `${level.prize} lifted. ${game.floorBonusText || ''}`,
      `Score: ${game.score}`,
      '',
      'Press Enter for the next floor',
    ], EXIT_GREEN);
  } else if (game.screen === 'win') {
    overlay(ctx, 'THE GETAWAY', [
      'Three prizes. No alarms that mattered. Rook melts into the night,',
      'the Crown of Tides heavy in his coat.',
      `Final score: ${game.score} · Time: ${game.timeText}`,
      '',
      'Press Enter to run it again',
    ], AMBER_GLOW);
  } else if (game.screen === 'over') {
    overlay(ctx, 'THE JOB IS BLOWN', [
      'Three lives, three floors — and the museum keeps its amber.',
      `Score: ${game.score}`,
      '',
      'Press Enter to start over',
    ], '#ff4b3e');
  }
}
