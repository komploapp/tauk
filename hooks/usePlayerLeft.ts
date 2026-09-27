import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import type { Player } from '@/store';

export function usePlayerLeft() {
  const [leftPlayer, setLeftPlayer] = useState<Player | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const { game, myPlayer, setPlayers, addLeftPlayer } = useStore();

  useEffect(() => {
    if (!game?.id || !myPlayer?.id) return;
    const gameId = game.id;
    const myId = myPlayer.id;

    const ch = supabase
      .channel(`lobby-${gameId}`)
      .on('broadcast', { event: 'player_left' }, ({ payload }) => {
        const departedId: string | undefined = (payload as { playerId?: string })?.playerId;
        if (!departedId || departedId === myId) return;

        const { players: current, addLeftPlayer: markLeft } = useStore.getState();
        const left = current.find((p) => p.id === departedId);
        if (left) markLeft(left);
        const remaining = current.filter((p) => p.id !== departedId);
        setPlayers(remaining);

        if (remaining.length <= 1) {
          if (left) {
            setIsGameOver(true);
            setLeftPlayer(left);
          } else {
            router.replace('/resultat-partie');
          }
        } else if (left) {
          setLeftPlayer(left);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [game?.id, myPlayer?.id]);

  // Auto-redirect 2s après l'affichage de la modale quand la partie est terminée
  useEffect(() => {
    if (!leftPlayer || !isGameOver) return;
    const timer = setTimeout(() => {
      setLeftPlayer(null);
      setIsGameOver(false);
      router.replace('/resultat-partie');
    }, 2000);
    return () => clearTimeout(timer);
  }, [leftPlayer, isGameOver]);

  return {
    leftPlayer,
    isGameOver,
    dismissPlayerLeft: () => {
      const wasGameOver = isGameOver;
      setLeftPlayer(null);
      setIsGameOver(false);
      if (wasGameOver) router.replace('/resultat-partie');
    },
  };
}
