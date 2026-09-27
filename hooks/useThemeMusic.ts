import { useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useStore } from '@/store';
import { startThemeMusic, syncThemeMute } from '@/lib/themeMusic';

export function useThemeMusic() {
  const musicMuted = useStore((s) => s.musicMuted);

  useEffect(() => {
    startThemeMusic();
  }, []);

  useFocusEffect(
    useCallback(() => {
      startThemeMusic();
    }, []),
  );

  useEffect(() => {
    syncThemeMute(musicMuted);
  }, [musicMuted]);
}
