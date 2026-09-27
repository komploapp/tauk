import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/palette';
import { PlayerResultRow, type PlayerResult } from '@/components/PlayerResultRow';
import { ToqueBackground } from '@/components/ToqueBackground';
import { GameMenu } from '@/components/GameMenu';
import { loadRoundResults, kickPlayer, broadcastPlayerLeft, createRound } from '@/lib/game';
import { usePlayerLeft } from '@/hooks/usePlayerLeft';
import { PlayerLeftModal } from '@/components/PlayerLeftModal';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import type { Character, TaskStatus, Round } from '@/store';
import { playSound } from '@/lib/sound';

import ChousSvg     from '@/assets/images/personnages/character-choux.svg';
import AvocadoSvg   from '@/assets/images/personnages/character-avocado.svg';
import Onion1Svg    from '@/assets/images/personnages/character-onion-1.svg';
import CarotSvg     from '@/assets/images/personnages/character-carot.svg';
import BananaSvg    from '@/assets/images/personnages/character-banana.svg';
import PotatoesSvg  from '@/assets/images/personnages/character-potatoes.svg';
import PoivronSvg   from '@/assets/images/personnages/character-poivron.svg';
import AubergineSvg from '@/assets/images/personnages/character-aubergine.svg';
import MushroomSvg  from '@/assets/images/personnages/character-mushroom.svg';
type SvgComponent = React.ComponentType<{ width?: number; height?: number }>;

const CHARACTER_MAP: Record<Character, SvgComponent> = {
  choux: ChousSvg, avocado: AvocadoSvg, onion: Onion1Svg,
  carot: CarotSvg, banana: BananaSvg, potatoes: PotatoesSvg,
  poivron: PoivronSvg, aubergine: AubergineSvg, mushroom: MushroomSvg,
};

const CHARACTER_COLORS: Record<Character, string> = {
  choux: '#ffc014', avocado: '#7ac514', onion: '#c514b4',
  carot: '#ff7214', banana: '#ffe014', potatoes: '#c8a864',
  poivron: '#ff3214', aubergine: '#7814c8', mushroom: '#c87850',
};

function taskDisplayStatus(s: TaskStatus): 'done' | 'missed' | 'grille' {
  if (s === 'done') return 'done';
  if (s === 'grilled') return 'grille';
  return 'missed';
}

type Trend = 'up' | 'down' | 'neutral';

type PodiumPlayer = {
  id: string;
  name: string;
  roundScore: number;
  trend: Trend;
  avatarBg: string;
  rank: 1 | 2 | 3;
  Character: SvgComponent;
};

function ScoreChip({ score }: { score: number }) {
  const label = score > 0 ? `+${score}` : String(score);
  return (
    <View style={styles.scoreChip}>
      <Text style={styles.scoreChipText}>{label}</Text>
    </View>
  );
}

function PodiumTrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up')   return <Text style={styles.podiumTrendUp}>↑</Text>;
  if (trend === 'down') return <Text style={styles.podiumTrendDown}>↓</Text>;
  return <Text style={styles.podiumTrendNeutral}>—</Text>;
}

function PodiumCard({ player, lower = false }: { player: PodiumPlayer; lower?: boolean }) {
  const { Character } = player;
  return (
    <View style={[styles.podiumCard, lower && styles.podiumCardLower]}>
      <View style={styles.podiumAvatarRow}>
        <PodiumTrendIcon trend={player.trend} />
        <View style={[styles.podiumAvatar, { backgroundColor: player.avatarBg }]}>
          <Character width={74} height={74} />
        </View>
      </View>
      <Text style={styles.podiumName}>{player.name}</Text>
      <ScoreChip score={player.roundScore} />
    </View>
  );
}

export default function ResultatMancheScreen() {
  const { players, currentRound, game, myPlayer, reset, setCurrentRound } = useStore();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { leftPlayer, isGameOver, dismissPlayerLeft } = usePlayerLeft();

  const isLastRound = (currentRound?.round_number ?? 0) >= (game?.round_count ?? 0);

  useEffect(() => {
    if (!game?.id) return;
    const gameId = game.id;
    const ch = supabase
      .channel(`manche-next-${gameId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rounds', filter: `game_id=eq.${gameId}` },
        (payload) => { setCurrentRound(payload.new as Round); router.replace('/prepa'); },
      )
      .subscribe();
    channelRef.current = ch;
    return () => { channelRef.current = null; supabase.removeChannel(ch); };
  }, [game?.id]);

  async function handleNext() {
    if (isLastRound) {
      router.replace('/resultat-partie');
      return;
    }
    if (myPlayer?.is_host && game?.id && currentRound) {
      try {
        const round = await createRound(game.id, currentRound.round_number + 1);
        setCurrentRound(round);
        router.replace('/prepa');
      } catch { /* fallback via INSERT Realtime */ }
    } else {
      setIsWaiting(true);
    }
  }

  function handleQuit() {
    Alert.alert(
      'Quitter la partie ?',
      'Tu vas quitter la partie en cours.',
      [
        { text: 'Rester', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => { if (game?.id && myPlayer) broadcastPlayerLeft(game.id, myPlayer.id); if (myPlayer?.id) kickPlayer(myPlayer.id).catch(() => {}); reset(); router.replace('/'); } },
      ],
    );
  }
  const [winnerName, setWinnerName] = useState('…');
  const [podium, setPodium] = useState<PodiumPlayer[]>([]);
  const [listPlayers, setListPlayers] = useState<PlayerResult[]>([]);

  useEffect(() => {
    if (!currentRound?.id || players.length === 0) return;

    loadRoundResults(currentRound.id).then(({ tasksByPlayer, accusations }) => {
      const sorted = [...players].sort((a, b) => b.score - a.score);

      // Source unique : calcul depuis tasks + accusations (les deux types de bonus)
      const computed = sorted.map((player) => {
        const tasks = tasksByPlayer[player.id] ?? [];
        const falseAcc = accusations.find(
          (a) => a.accused_id === player.id && a.result === 'denied',
        );
        const confirmedAcc = accusations.find(
          (a) => a.accuser_id === player.id && a.result === 'confirmed',
        );
        const accuserPseudo = falseAcc
          ? (players.find((p) => p.id === falseAcc.accuser_id)?.pseudo ?? '?')
          : undefined;
        const accusedPseudo = confirmedAcc
          ? (players.find((p) => p.id === confirmedAcc.accused_id)?.pseudo ?? '?')
          : undefined;
        const doneTasks = tasks.filter((t) => t.status === 'done').length;
        const scoreDelta = doneTasks + (falseAcc ? 1 : 0) + (confirmedAcc ? 1 : 0);
        const bonuses: { text: string; value: number }[] = [];
        if (accuserPseudo) bonuses.push({ text: `Accusé à tort par ${accuserPseudo}`, value: 1 });
        if (accusedPseudo) bonuses.push({ text: `Accusation confirmée sur ${accusedPseudo}`, value: 1 });
        return { player, tasks, scoreDelta, bonuses };
      });

      computed.sort((a, b) => b.scoreDelta - a.scoreDelta || b.player.score - a.player.score);

      if (computed[0]) setWinnerName(computed[0].player.pseudo);

      setPodium(computed.slice(0, 3).map(({ player, scoreDelta }, index) => ({
        id: player.id,
        name: player.pseudo,
        roundScore: scoreDelta,
        trend: (scoreDelta > 0 ? 'up' : scoreDelta < 0 ? 'down' : 'neutral') as Trend,
        avatarBg: CHARACTER_COLORS[player.character],
        rank: (index + 1) as 1 | 2 | 3,
        Character: CHARACTER_MAP[player.character] ?? ChousSvg,
      })));

      setListPlayers(computed.map(({ player, tasks, scoreDelta, bonuses }, index) => ({
        id: player.id,
        name: player.pseudo,
        scoreDelta,
        trend: scoreDelta > 0 ? 'up' : scoreDelta < 0 ? 'down' : 'neutral',
        avatarBg: CHARACTER_COLORS[player.character],
        Character: CHARACTER_MAP[player.character] ?? ChousSvg,
        rankBadge: index + 1,
        bonus: bonuses.length > 0 ? bonuses : undefined,
        challenges: tasks.map((t) => ({
          id: t.id,
          text: t.task_text,
          status: taskDisplayStatus(t.status),
          grilledBy: t.grilled_by
            ? (players.find((p) => p.id === t.grilled_by)?.pseudo)
            : undefined,
        })),
      })));
    }).catch(() => {});
  }, [currentRound?.id, players]);

  return (
    <View style={styles.root}>
      <ToqueBackground />
      <GameMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <PlayerLeftModal player={leftPlayer} isGameOver={isGameOver} onDismiss={dismissPlayerLeft} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Section haute — podium ── */}
        <SafeAreaView style={styles.topSection} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.iconBtn} onPress={handleQuit} accessibilityRole="button" accessibilityLabel="Quitter">
              <Ionicons name="close" size={20} color={palette.brandPink} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => setMenuVisible(true)} accessibilityRole="button" accessibilityLabel="Options">
              <Ionicons name="settings-outline" size={20} color={palette.brandPink} />
            </Pressable>
          </View>

          <Text style={styles.title}>Bravo {winnerName} !</Text>
          {currentRound?.round_number != null && game?.round_count != null && (
            <Text style={styles.roundIndicator}>
              Service {currentRound.round_number} sur {game.round_count}
            </Text>
          )}

          {podium.length > 0 && (
            <View style={styles.podium}>
              <PodiumCard player={podium[0]} />
              {podium.length > 1 && (
                <View style={styles.podiumRow}>
                  <PodiumCard player={podium[1]} />
                  {podium.length > 2 && <PodiumCard player={podium[2]} lower />}
                </View>
              )}
            </View>
          )}
        </SafeAreaView>

        {/* ── Section basse — liste joueurs ── */}
        <View style={styles.listSection}>
          {listPlayers.map((player) => (
            <PlayerResultRow key={player.id} player={player} />
          ))}
        </View>
      </ScrollView>

      {/* ── Bouton fixe ── */}
      <SafeAreaView style={styles.buttonSafe} edges={['bottom']} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.nextBtn, isWaiting && styles.nextBtnWaiting, pressed && styles.nextBtnPressed]}
          onPress={handleNext}
          disabled={isWaiting}
          accessibilityRole="button"
        >
          <Text style={styles.nextBtnText}>
            {isLastRound ? 'Voir les résultats' : isWaiting ? 'En attente de l\'hôte…' : 'Service suivant'}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgWhite,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // ─── Section haute ────────────────────────────────────────────────────────
  topSection: {
    backgroundColor: '#fff4f0',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 20, 134, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  roundIndicator: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    color: palette.brandPink,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: -20,
  },

  // ─── Podium ───────────────────────────────────────────────────────────────
  podium: {
    alignItems: 'center',
    gap: 24,
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 48,
    width: '100%',
  },
  podiumCard: {
    alignItems: 'center',
    gap: 8,
  },
  podiumCardLower: {
    paddingTop: 24,
  },
  podiumAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  podiumTrendUp: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 14,
    color: palette.brandGreen,
    width: 14,
    textAlign: 'center',
  },
  podiumTrendDown: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 14,
    color: '#ff3624',
    width: 14,
    textAlign: 'center',
  },
  podiumTrendNeutral: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 16,
    color: '#ff7214',
    width: 14,
    textAlign: 'center',
  },
  podiumAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: 'hidden',
  },
  podiumName: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    color: palette.textPrimary,
    textAlign: 'center',
  },

  // ─── Score chip ───────────────────────────────────────────────────────────
  scoreChip: {
    backgroundColor: '#fcfdfd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: 'rgba(71,21,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 44,
    shadowOpacity: 1,
    elevation: 2,
  },
  scoreChipText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 16,
    color: palette.brandGreen,
    textAlign: 'center',
  },

  // ─── Liste joueurs ────────────────────────────────────────────────────────
  listSection: {
    backgroundColor: '#ffffff',
  },

  // ─── Bouton "Manche suivante" ─────────────────────────────────────────────
  buttonSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 26,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  nextBtn: {
    height: 47,
    backgroundColor: palette.brandGreen,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnPressed: {
    opacity: 0.85,
  },
  nextBtnWaiting: {
    opacity: 0.6,
  },
  nextBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: '#ffffff',
  },
});
