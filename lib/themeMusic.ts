import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useStore } from '@/store';

setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

const SOURCE        = require('../assets/sounds/tauk_thememusic.mp3');
const TARGET_VOLUME = 0.08;
const FADE_IN_MS    = 1200;
const FADE_OUT_MS   = 700;
const CROSSFADE_S   = FADE_OUT_MS / 1000; // début du fade-out avant la fin

let _player:       ReturnType<typeof createAudioPlayer> | null = null;
let _playing       = false;
let _fadeTimer:    ReturnType<typeof setInterval> | null = null;
let _loopMonitor:  ReturnType<typeof setInterval> | null = null;
let _fadingOut     = false;
let _prevTime      = -1;

// ─── Helpers fade ─────────────────────────────────────────────────────────────

function clearFade() {
  if (_fadeTimer) { clearInterval(_fadeTimer); _fadeTimer = null; }
}

function clearLoopMonitor() {
  if (_loopMonitor) { clearInterval(_loopMonitor); _loopMonitor = null; }
}

function fadeIn() {
  clearFade();
  _fadingOut = false;
  const p = _player;
  if (!p) return;
  const steps  = 20;
  const stepMs = FADE_IN_MS / steps;
  let step = 0;
  _fadeTimer = setInterval(() => {
    step++;
    try { p.volume = (step / steps) * TARGET_VOLUME; } catch {}
    if (step >= steps) clearFade();
  }, stepMs);
}

function fadeOut(onDone?: () => void) {
  clearFade();
  _fadingOut = true;
  const p = _player;
  if (!p) { onDone?.(); return; }
  const startVol = p.volume;
  const steps    = 12;
  const stepMs   = FADE_OUT_MS / steps;
  let step = 0;
  _fadeTimer = setInterval(() => {
    step++;
    try { p.volume = Math.max(0, startVol * (1 - step / steps)); } catch {}
    if (step >= steps) {
      clearFade();
      try { p.volume = 0; } catch {}
      onDone?.();
    }
  }, stepMs);
}

// ─── Moniteur de boucle ───────────────────────────────────────────────────────

function startLoopMonitor() {
  clearLoopMonitor();
  _prevTime = -1;
  _loopMonitor = setInterval(() => {
    if (!_player || !_playing) return;
    try {
      const dur = _player.duration;
      const cur = _player.currentTime;
      if (!dur || dur <= 0) return;

      // La piste a bouclé : cur est retombé à ~0 alors qu'on était en fin de piste
      if (_prevTime > dur * 0.75 && cur < 0.4) {
        fadeIn();
      }

      // Approche de la fin → fade-out
      const remaining = dur - cur;
      if (remaining <= CROSSFADE_S && !_fadingOut) {
        fadeOut();
      }

      _prevTime = cur;
    } catch {}
  }, 80);
}

// ─── API publique ─────────────────────────────────────────────────────────────

function getPlayer() {
  if (!_player) {
    _player = createAudioPlayer(SOURCE);
    _player.loop   = true;
    _player.volume = 0;
  }
  return _player;
}

export function startThemeMusic() {
  if (useStore.getState().musicMuted) return;
  if (_playing) return;
  _playing = true;
  clearFade();
  try {
    const p = getPlayer();
    p.volume = 0;
    p.play();
    fadeIn();
    startLoopMonitor();
  } catch {}
}

export function stopThemeMusic() {
  if (!_player || !_playing) return;
  _playing = false;
  clearLoopMonitor();
  fadeOut(() => {
    try { _player?.pause(); _player?.seekTo(0); } catch {}
  });
}

export function syncThemeMute(muted: boolean) {
  if (muted) {
    if (_playing) {
      clearFade();
      clearLoopMonitor();
      try { _player?.pause(); } catch {}
    }
  } else {
    if (_playing) {
      try {
        const p = getPlayer();
        p.volume = 0;
        p.play();
        fadeIn();
        startLoopMonitor();
      } catch {}
    }
  }
}
