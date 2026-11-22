// All sound is synthesized live with WebAudio: no audio files, no network.
// A low night-drone hums under everything, footsteps tick, pickups chime,
// the alarm is a two-tone siren that follows the meter, and the getaway
// gets a small arpeggio. Mute lives on the M key and the HUD button.

export function makeAudio() {
  return {
    ctx: null,
    master: null,
    drone: null,
    siren: null,
    sirenGain: null,
    muted: false,
    started: false,
  };
}

function ensureContext(audio) {
  if (audio.ctx) return true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
    return true;
  } catch {
    return false;
  }
}

// Start the ambient bed: a low drone plus a slow, quiet pulse. Called once
// on the first user gesture, so the browser's autoplay rules are satisfied.
export function startAmbient(audio) {
  if (audio.started || !ensureContext(audio)) return;
  audio.started = true;
  const ctx = audio.ctx;
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.045;
  droneGain.connect(audio.master);
  const oscA = ctx.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.value = 55;
  oscA.connect(droneGain);
  const oscB = ctx.createOscillator();
  oscB.type = 'triangle';
  oscB.frequency.value = 55 * 1.5;
  const gainB = ctx.createGain();
  gainB.gain.value = 0.25;
  oscB.connect(gainB);
  gainB.connect(droneGain);
  oscA.start();
  oscB.start();
  // The siren oscillator runs silently until the alarm climbs.
  audio.sirenGain = ctx.createGain();
  audio.sirenGain.gain.value = 0;
  audio.sirenGain.connect(audio.master);
  audio.siren = ctx.createOscillator();
  audio.siren.type = 'sawtooth';
  audio.siren.frequency.value = 620;
  audio.siren.connect(audio.sirenGain);
  audio.siren.start();
  audio.drone = { oscA, oscB, droneGain };
}

// The alarm siren follows the meter: silent while hidden, a quiet two-tone
// wail as it warms, loud when the building is hunting.
export function setAlarmLevel(audio, alarm) {
  if (!audio.ctx || !audio.sirenGain) return;
  const t = audio.ctx.currentTime;
  const level = alarm < 35 ? 0 : alarm < 70 ? 0.05 : 0.11;
  audio.sirenGain.gain.setTargetAtTime(audio.muted ? 0 : level, t, 0.2);
  if (audio.siren) {
    const wail = alarm >= 70 ? 1 : 0.5;
    audio.siren.frequency.setTargetAtTime(620 + Math.sin(t * 4 * wail) * 140, t, 0.05);
  }
}

function blip(audio, freq, dur, type, vol, when = 0) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playStep(audio, sneaking) {
  blip(audio, sneaking ? 140 : 190, 0.06, 'sine', sneaking ? 0.05 : 0.09);
}

export function playCoin(audio) {
  blip(audio, 880, 0.12, 'sine', 0.16);
  blip(audio, 1318, 0.16, 'sine', 0.12, 0.07);
}

export function playPrize(audio) {
  [523, 659, 784, 1046].forEach((f, i) => blip(audio, f, 0.22, 'triangle', 0.16, i * 0.09));
}

export function playNoiseMaker(audio) {
  // A thrown coin skittering across marble: three quick metallic ticks.
  [2400, 1900, 1500].forEach((f, i) => blip(audio, f, 0.05, 'square', 0.07, i * 0.08));
}

export function playEmp(audio) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.5);
  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t);
  osc.stop(t + 0.6);
}

export function playDisguise(audio) {
  [392, 523, 659].forEach((f, i) => blip(audio, f, 0.18, 'sine', 0.1, i * 0.06));
}

export function playSpotted(audio) {
  blip(audio, 740, 0.14, 'square', 0.12);
  blip(audio, 988, 0.2, 'square', 0.12, 0.12);
}

export function playCaught(audio) {
  [330, 262, 196, 131].forEach((f, i) => blip(audio, f, 0.3, 'sawtooth', 0.14, i * 0.16));
}

export function playWin(audio) {
  [523, 659, 784, 1046, 1318].forEach((f, i) => blip(audio, f, 0.3, 'triangle', 0.15, i * 0.11));
}

export function playExit(audio) {
  [784, 1046].forEach((f, i) => blip(audio, f, 0.2, 'triangle', 0.14, i * 0.1));
}

export function setMuted(audio, muted) {
  audio.muted = muted;
  if (audio.master) {
    audio.master.gain.setTargetAtTime(muted ? 0 : 0.5, audio.ctx.currentTime, 0.05);
  }
}
