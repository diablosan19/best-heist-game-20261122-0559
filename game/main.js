// Amber Vault: the game itself. This file owns the state machine (title,
// playing, paused, caught, floor clear, getaway, game over), the frame
// loop, keyboard and mouse input, the alarm meter, scoring, and the staged
// scenes the screenshots are taken from (?shot=cover|patrol|alarm|win).

import { LEVELS, WORLD_H, WORLD_W } from './levels.js';
import { makeThief, moveThief, throwNoiseMaker, fireEmp, wearDisguise, tickThiefTimers } from './thief.js';
import { makeGuard, updateGuard, guardHearsNoise, guardCatchesThief } from './guards.js';
import { makeCamera, updateCamera, cameraSeesThief, blackoutCameras } from './cameras.js';
import { drawScene } from './render.js';
import {
  makeAudio, startAmbient, setAlarmLevel, playStep, playCoin, playPrize,
  playNoiseMaker, playEmp, playDisguise, playSpotted, playCaught, playWin,
  playExit, setMuted,
} from './audio.js';
import { distance } from './geometry.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hudLevel = document.getElementById('hud-level');
const hudObjective = document.getElementById('hud-objective');
const hudAlarmFill = document.getElementById('hud-alarm-fill');
const hudAlarmText = document.getElementById('hud-alarm-text');
const hudScore = document.getElementById('hud-score');
const hudTools = document.getElementById('hud-tools');
const hudLives = document.getElementById('hud-lives');
const hudTimer = document.getElementById('hud-timer');
const hudMessage = document.getElementById('hud-message');
const btnMute = document.getElementById('btn-mute');
const statusLine = document.getElementById('status');

const audio = makeAudio();

const game = {
  screen: 'title',
  levelIndex: 0,
  level: LEVELS[0],
  solids: [],
  thief: null,
  guards: [],
  cameras: [],
  coins: [],
  lootTaken: false,
  alarm: 0,
  score: 0,
  lives: 3,
  time: 0, // seconds on this floor
  totalTime: 0,
  timeText: '0:00',
  spottedThisFloor: false,
  noise: null,
  message: '',
  messageTimer: 0,
  caughtBy: '',
  floorBonusText: '',
  frame: 0,
  shot: null,
  shotStaged: false,
};

const keys = { up: false, down: false, left: false, right: false, sneak: false };

function solidsOf(level) {
  return [...level.walls, ...level.cover];
}

function loadFloor(index) {
  game.levelIndex = index;
  game.level = LEVELS[index];
  game.solids = solidsOf(game.level);
  game.thief = makeThief(game.level.start);
  game.guards = game.level.guards.map((def, i) => makeGuard(def, i));
  game.cameras = game.level.cameras.map(makeCamera);
  game.coins = game.level.coins.map((c) => ({ ...c, taken: false }));
  game.lootTaken = false;
  game.alarm = 0;
  game.time = 0;
  game.spottedThisFloor = false;
  game.noise = null;
  setAlarmLevel(audio, 0);
  showMessage(`${game.level.name} — lift the ${game.level.prize}`);
}

function startGame() {
  game.score = 0;
  game.lives = 3;
  game.totalTime = 0;
  loadFloor(0);
  game.screen = 'playing';
}

function restartFloor() {
  loadFloor(game.levelIndex);
  game.screen = 'playing';
}

function showMessage(text) {
  game.message = text;
  game.messageTimer = 3;
  hudMessage.textContent = text;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateHud() {
  hudLevel.textContent = `Floor ${game.levelIndex + 1} of ${LEVELS.length} · ${game.level.name}`;
  hudObjective.textContent = game.lootTaken
    ? 'Prize lifted — reach the EXIT'
    : `Lift the ${game.level.prize}, then reach the EXIT`;
  const alarm = Math.round(game.alarm);
  hudAlarmFill.style.width = `${alarm}%`;
  hudAlarmFill.className = alarm >= 70 ? 'hot' : alarm >= 35 ? 'warm' : '';
  hudAlarmText.textContent = alarm >= 100 ? 'LOCKDOWN' : alarm >= 70 ? 'ALARM' : alarm >= 35 ? 'SUSPICIOUS' : 'HIDDEN';
  hudScore.textContent = `SCORE ${game.score}`;
  const t = game.thief;
  hudTools.textContent = t
    ? `NOISE ×${t.noise} · EMP ×${t.emp} · DISGUISE ×${t.disguise}`
    : 'NOISE ×3 · EMP ×2 · DISGUISE ×1';
  hudLives.textContent = '♥'.repeat(Math.max(0, game.lives)) + '♡'.repeat(Math.max(0, 3 - game.lives));
  hudTimer.textContent = formatTime(game.totalTime + game.time);
  if (game.messageTimer > 0) {
    hudMessage.textContent = game.message;
  } else {
    hudMessage.textContent = '';
  }
  statusLine.textContent =
    game.screen === 'playing'
      ? `${game.level.name}. Alarm ${alarm}. Score ${game.score}.`
      : game.screen;
}

function floorComplete() {
  let bonus = 0;
  const parts = [];
  if (!game.spottedThisFloor) {
    bonus += 300;
    parts.push('ghost bonus +300');
  }
  const parBonus = Math.max(0, Math.round((game.level.parSeconds - game.time) * 5));
  if (parBonus > 0) {
    bonus += parBonus;
    parts.push(`speed bonus +${parBonus}`);
  }
  game.score += bonus;
  game.floorBonusText = parts.length > 0 ? parts.join(' · ') : 'No bonuses this floor.';
  game.totalTime += game.time;
  game.timeText = formatTime(game.totalTime);
  playExit(audio);
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.screen = 'win';
    playWin(audio);
  } else {
    game.screen = 'floor';
  }
}

function caught(guard) {
  game.lives -= 1;
  game.caughtBy = guard.name;
  playCaught(audio);
  setAlarmLevel(audio, 0);
  if (game.lives <= 0) {
    game.screen = 'over';
  } else {
    game.screen = 'caught';
  }
}

function update(dt) {
  if (game.screen !== 'playing') return;
  game.time += dt;
  const thief = game.thief;

  if (moveThief(thief, keys, dt, game.solids)) playStep(audio, thief.sneaking);
  tickThiefTimers(thief, dt);

  // Coins and the prize.
  for (const coin of game.coins) {
    if (!coin.taken && distance(thief.x, thief.y, coin.x, coin.y) < thief.r + 9) {
      coin.taken = true;
      game.score += 50;
      playCoin(audio);
    }
  }
  if (!game.lootTaken && distance(thief.x, thief.y, game.level.loot.x, game.level.loot.y) < 34) {
    game.lootTaken = true;
    game.score += 500;
    playPrize(audio);
    showMessage(`${game.level.prize} lifted — now reach the EXIT`);
  }
  const exit = game.level.exit;
  if (
    game.lootTaken &&
    thief.x > exit.x && thief.x < exit.x + exit.w &&
    thief.y > exit.y && thief.y < exit.y + exit.h
  ) {
    floorComplete();
    return;
  }

  // The noise-maker rings for a couple of seconds, then goes quiet.
  if (game.noise) {
    game.noise.timer -= dt;
    if (game.noise.timer <= 0) game.noise = null;
  }

  // Guards: patrol, stare, investigate, chase. Their suspicion and the
  // cameras' feed the one alarm meter.
  let hottest = 0;
  let anySees = false;
  for (const guard of game.guards) {
    const before = guard.suspicion;
    updateGuard(guard, thief, game.solids, dt, game.alarm);
    if (guard.suspicion >= 50) {
      game.spottedThisFloor = true;
      anySees = true;
      if (before < 50) playSpotted(audio);
    }
    if (guard.suspicion > hottest) hottest = guard.suspicion;
    if (guardCatchesThief(guard, thief)) {
      caught(guard);
      return;
    }
  }
  for (const camera of game.cameras) {
    updateCamera(camera, dt);
    const feed = cameraSeesThief(camera, thief, game.solids);
    if (feed > 0) {
      game.spottedThisFloor = true;
      anySees = true;
      game.alarm = Math.min(100, game.alarm + feed * dt);
    }
  }

  // The alarm climbs while a guard is wary and falls when the room is calm.
  if (hottest >= 50) {
    game.alarm = Math.min(100, game.alarm + (hottest / 100) * 14 * dt);
  } else if (!anySees) {
    game.alarm = Math.max(0, game.alarm - 9 * dt);
  }
  setAlarmLevel(audio, game.alarm);

  if (game.messageTimer > 0) game.messageTimer -= dt;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.frame += 1;
  const time = now / 1000;
  update(dt);
  drawScene(ctx, { ...game, time });
  updateHud();
  if (game.shot && !game.shotStaged && game.frame >= 3) {
    game.shotStaged = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

// --- Input ---------------------------------------------------------------

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

window.addEventListener('keydown', (event) => {
  const mapped = KEYMAP[event.code];
  if (mapped) {
    keys[mapped] = true;
    event.preventDefault();
    startAmbient(audio);
    return;
  }
  if (event.code === 'KeyM') {
    const muted = !audio.muted;
    setMuted(audio, muted);
    btnMute.textContent = muted ? 'Sound off' : 'Sound on';
    return;
  }
  if (event.code === 'KeyP' && game.screen === 'playing') {
    game.screen = 'paused';
    return;
  }
  if (event.code === 'KeyP' && game.screen === 'paused') {
    game.screen = 'playing';
    return;
  }
  if (event.code === 'KeyR' && (game.screen === 'playing' || game.screen === 'paused')) {
    restartFloor();
    return;
  }
  if (event.code === 'KeyQ' && game.screen === 'playing') {
    if (fireEmp(game.thief)) {
      blackoutCameras(game.cameras);
      playEmp(audio);
      showMessage('EMP fired — cameras dark for 6 seconds');
    } else {
      showMessage('No EMP charges left');
    }
    return;
  }
  if (event.code === 'KeyE' && game.screen === 'playing') {
    if (wearDisguise(game.thief)) {
      playDisguise(audio);
      showMessage("Curator's disguise on — 8 seconds of looking innocent");
    } else {
      showMessage('No disguise left');
    }
    return;
  }
  if (event.code === 'Enter') {
    startAmbient(audio);
    if (game.screen === 'title') startGame();
    else if (game.screen === 'caught') restartFloor();
    else if (game.screen === 'floor') {
      loadFloor(game.levelIndex + 1);
      game.screen = 'playing';
    }
    else if (game.screen === 'win' || game.screen === 'over') startGame();
  }
});

window.addEventListener('keyup', (event) => {
  const mapped = KEYMAP[event.code];
  if (mapped) keys[mapped] = false;
});

canvas.addEventListener('pointerdown', (event) => {
  startAmbient(audio);
  if (game.screen === 'title') {
    startGame();
    return;
  }
  if (game.screen !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const tx = ((event.clientX - rect.left) / rect.width) * WORLD_W;
  const ty = ((event.clientY - rect.top) / rect.height) * WORLD_H;
  const noise = throwNoiseMaker(game.thief, tx, ty);
  if (noise) {
    game.noise = noise;
    for (const guard of game.guards) guardHearsNoise(guard, noise);
    playNoiseMaker(audio);
    showMessage('Noise-maker tossed — a guard goes to look');
  } else {
    showMessage('No noise-makers left');
  }
});

btnMute.addEventListener('click', () => {
  startAmbient(audio);
  const muted = !audio.muted;
  setMuted(audio, muted);
  btnMute.textContent = muted ? 'Sound off' : 'Sound on';
});

// --- Screenshot staging --------------------------------------------------
// ?shot=cover stages the first floor mid-heist: Rook sneaking past a case
// while two cones sweep toward him, a camera watches the door, the Sun of
// Meridian glows on its plinth and the alarm meter is already warm. The
// other shots stage the same live game on later floors and at higher alarm.

function stageShot(shot) {
  game.shot = shot;
  if (shot === 'cover') {
    startGame();
    const t = game.thief;
    t.x = 500;
    t.y = 450;
    t.sneaking = true;
    t.facing = Math.PI / 2;
    game.guards[0].x = 560;
    game.guards[0].y = 300;
    game.guards[0].facing = Math.atan2(t.y - 300, t.x - 560);
    game.guards[0].lastSeen = { x: t.x, y: t.y };
    game.guards[0].suspicion = 58;
    game.guards[0].state = 'stare';
    game.guards[1].x = 950;
    game.guards[1].y = 330;
    game.guards[1].facing = Math.PI;
    game.alarm = 38;
    game.coins[0].taken = true;
    game.score = 50;
  } else if (shot === 'patrol') {
    startGame();
    loadFloor(1);
    game.screen = 'playing';
    const t = game.thief;
    t.x = 250;
    t.y = 300;
    t.sneaking = true;
    t.facing = 0;
    game.guards[0].x = 300;
    game.guards[0].y = 260;
    game.guards[0].facing = 0;
    game.guards[1].x = 720;
    game.guards[1].y = 200;
    game.guards[1].facing = -Math.PI / 2;
    game.guards[2].x = 700;
    game.guards[2].y = 324;
    game.guards[2].facing = Math.PI;
    game.alarm = 12;
    game.score = 150;
  } else if (shot === 'alarm') {
    startGame();
    loadFloor(2);
    game.screen = 'playing';
    const t = game.thief;
    t.x = 576;
    t.y = 470;
    t.facing = -Math.PI / 2;
    game.lootTaken = true;
    game.guards[2].x = 576;
    game.guards[2].y = 380;
    game.guards[2].facing = Math.PI / 2;
    game.guards[2].state = 'chase';
    game.guards[2].suspicion = 100;
    game.guards[2].lastSeen = { x: 576, y: 470 };
    game.guards[2].target = { x: 576, y: 470 };
    game.alarm = 82;
    game.score = 650;
    showMessage('LOCKDOWN — run for the EXIT!');
  } else if (shot === 'win') {
    startGame();
    loadFloor(2);
    game.screen = 'win';
    game.lootTaken = true;
    game.score = 2450;
    game.totalTime = 296;
    game.timeText = '4:56';
  }
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
loadFloor(0);
if (shot) {
  stageShot(shot);
} else {
  game.screen = 'title';
}
window.__shotReady = false;
requestAnimationFrame(frame);
