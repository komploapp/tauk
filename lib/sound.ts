import { createAudioPlayer } from 'expo-audio';
import { useStore } from '@/store';

const SOUNDS = {
  uiPress:            require('../assets/sounds/check_button.mp3'),
  playerJoin:         require('../assets/sounds/player_join.mp3'),
  playerLeft:         require('../assets/sounds/player_left.mp3'),
  playerReady:        require('../assets/sounds/player_ready.mp3'),
  attributionPoint:   require('../assets/sounds/attribution_point.mp3'),
  bonusPoint:         require('../assets/sounds/bonus_point.mp3'),
  taskCannotComplete: require('../assets/sounds/task_cannot_complete.mp3'),
  taukBell:           require('../assets/sounds/servicebell.mp3'),
  accusation:         require('../assets/sounds/accusation.mp3'),
  decompteCountdown:  require('../assets/sounds/decompte_10.mp3'),
} as const;

export type SoundName = keyof typeof SOUNDS;

// Pool de 3 players par son, créés à la demande (lazy).
// Chaque appel rapide utilise le prochain player dans la rotation —
// pas de seekTo bloquant sur un player déjà en cours.
const MAX_POOL = 3;
type Pool = { players: ReturnType<typeof createAudioPlayer>[]; idx: number };
const _pools: Partial<Record<SoundName, Pool>> = {};

function getPlayer(name: SoundName): ReturnType<typeof createAudioPlayer> {
  let pool = _pools[name];
  if (!pool) {
    pool = { players: [], idx: 0 };
    _pools[name] = pool;
  }
  if (pool.players.length < MAX_POOL) {
    const p = createAudioPlayer(SOUNDS[name]);
    pool.players.push(p);
    return p;
  }
  const p = pool.players[pool.idx];
  pool.idx = (pool.idx + 1) % MAX_POOL;
  return p;
}

export function playSound(name: SoundName): void {
  if (useStore.getState().muted) return;
  try {
    const player = getPlayer(name);
    player.seekTo(0);
    player.play();
  } catch {}
}
