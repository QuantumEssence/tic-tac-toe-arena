const MUTE_KEY = 'ttt_arena_muted_v1';

let audioCtx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (isSoundMuted()) return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  } catch {
    // ignore storage failures
  }
}

function playTone({ freq, endFreq = null, duration = 0.08, type = 'sine', gain = 0.08, delay = 0 }) {
  const ctx = getCtx();
  if (!ctx) return;

  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + duration);
  }

  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(vol);
  vol.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.01);
}

export function playMoveSound(symbol) {
  if (symbol === 'X') {
    playTone({ freq: 520, endFreq: 680, duration: 0.065, type: 'triangle', gain: 0.06 });
  } else {
    playTone({ freq: 420, endFreq: 340, duration: 0.065, type: 'triangle', gain: 0.06 });
  }
}

export function playMiniCaptureSound() {
  playTone({ freq: 523.25, duration: 0.09, type: 'sine', gain: 0.07, delay: 0 });
  playTone({ freq: 659.25, duration: 0.11, type: 'sine', gain: 0.07, delay: 0.06 });
  playTone({ freq: 783.99, duration: 0.14, type: 'sine', gain: 0.07, delay: 0.12 });
}

export function playMiniResetSound() {
  playTone({ freq: 440, endFreq: 210, duration: 0.22, type: 'sawtooth', gain: 0.045, delay: 0 });
  playTone({ freq: 310, endFreq: 560, duration: 0.16, type: 'triangle', gain: 0.05, delay: 0.18 });
}

export function playVictorySound() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((n, idx) => {
    playTone({ freq: n, duration: 0.16, type: 'triangle', gain: 0.08, delay: idx * 0.085 });
  });
}

export function playDrawSound() {
  playTone({ freq: 392, duration: 0.12, type: 'sine', gain: 0.06, delay: 0 });
  playTone({ freq: 349.23, duration: 0.18, type: 'sine', gain: 0.06, delay: 0.1 });
}

export function playChallengePing() {
  playTone({ freq: 660, duration: 0.09, type: 'sine', gain: 0.07, delay: 0 });
  playTone({ freq: 880, duration: 0.13, type: 'sine', gain: 0.07, delay: 0.09 });
}
