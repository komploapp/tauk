import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useStore } from '@/store';

setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

const SOURCE = require('../assets/sounds/tauk_thememusic.mp3');
const TARGET_VOLUME = 0.28;
const FADE_IN_MS    = 1200;
const FADE_OUT_MS   = 600;

let _player: ReturnType<typeof createAudioPlayer> | null = null;
let _playing = false;
let _fadeTimer: ReturnType<typeof setInterval> | null = null;

function clearFade() {
  if (_fadeTimer) { clearInterval(_fadeTimer); _fadeTimer = null; }
}

function getPlayer() {
  if (!_player) {
    _player = createAudioPlayer(SOURCE);
    _player.loop = true;
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
    const steps = 20;
    const stepMs = FADE_IN_MS / steps;
    let step = 0;
    _fadeTimer = setInterval(() => {
      step++;
      try { p.volume = (step / steps) * TARGET_VOLUME; } catch {}
      if (step >= steps) clearFade();
    }, stepMs);
  } catch {}
}

export function stopThemeMusic() {
  if (!_player || !_playing) return;
  _playing = false;
  clearFade();
  const p = _player;
  const startVol = p.volume;
  const steps = 12;
  const stepMs = FADE_OUT_MS / steps;
  let step = 0;
  _fadeTimer = setInterval(() => {
    step++;
    try { p.volume = startVol * (1 - step / steps); } catch {}
    if (step >= steps) {
      clearFade();
      try { p.pause(); p.seekTo(0); p.volume = 0; } catch {}
    }
  }, stepMs);
}

export function syncThemeMute(muted: boolean) {
  if (muted) {
    if (_playing) {
      clearFade();
      try { _player?.pause(); } catch {}
    }
  } else {
    if (_playing) {
      clearFade();
      try {
        const p = getPlayer();
        p.volume = 0;
        p.play();
        const steps = 12;
        const stepMs = 600 / steps;
        let step = 0;
        _fadeTimer = setInterval(() => {
          step++;
          try { p.volume = (step / steps) * TARGET_VOLUME; } catch {}
          if (step >= steps) clearFade();
        }, stepMs);
      } catch {}
    }
  }
}
