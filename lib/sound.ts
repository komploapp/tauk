import { createAudioPlayer } from 'expo-audio';
import { useStore } from '@/store';

const SOUNDS = {
  uiPress:           require('../assets/sounds/check_button.mp3'),
  playerJoin:        require('../assets/sounds/player_join.mp3'),
  playerLeft:        require('../assets/sounds/player_left.mp3'),
  playerReady:       require('../assets/sounds/player_ready.mp3'),
  attributionPoint:  require('../assets/sounds/attribution_point.mp3'),
  bonusPoint:        require('../assets/sounds/bonus_point.mp3'),
  taskCannotComplete: require('../assets/sounds/task_cannot_complete.mp3'),
} as const;

export type SoundName = keyof typeof SOUNDS;

export function playSound(name: SoundName): void {
  if (useStore.getState().muted) return;
  try {
    const player = createAudioPlayer(SOUNDS[name]);
    player.play();
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        player.remove();
      }
    });
  } catch {
    // non-critical
  }
}
