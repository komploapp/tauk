import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ToqueBackground } from '@/components/ToqueBackground';
import { AccusationBlobs } from '@/components/AccusationBlobs';
import { GameMenu } from '@/components/GameMenu';
import { PointAttributionModal, type PointAttributionData } from '@/components/PointAttributionModal';
import { palette } from '@/constants/palette';
import { cancelAccusation, kickPlayer, broadcastPlayerLeft } from '@/lib/game';
import { usePlayerLeft } from '@/hooks/usePlayerLeft';
import { PlayerLeftModal } from '@/components/PlayerLeftModal';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import type { Character, Round } from '@/store';
import { useRoundTimer } from '@/hooks/useRoundTimer';
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
import IceSvg       from '@/assets/images/ice.svg';
import CouteauSvg   from '@/assets/images/couteau.svg';

const SMALL_AVATAR = 111;

const CHARACTER_BG: Record<Character, string> = {
  choux: '#ffc014', avocado: '#7ac514', onion: '#c514b4',
  carot: '#ff7214', banana: '#ffe014', potatoes: '#c8a864',
  poivron: '#ff3214', aubergine: '#7814c8', mushroom: '#c87850',
};

type CharSvg = React.FC<{ width: number; height: number }>;

const CHARACTER_MAP: Record<Character, CharSvg> = {
  choux:     ChousSvg,
  avocado:   AvocadoSvg,
  onion:     Onion1Svg,
  carot:     CarotSvg,
  banana:    BananaSvg,
  potatoes:  PotatoesSvg,
  poivron:   PoivronSvg,
  aubergine: AubergineSvg,
  mushroom:  MushroomSvg,
};

export default function SpectateurScreen() {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pointModalData, setPointModalData] = useState<PointAttributionData | null>(null);
  const postModalRef = useRef<() => void>(() => {});
  const { game, buzzer, activeAccusation, players, currentRound, setCurrentRound, myPlayer, taukFiredAt, reset } = useStore();
  const { leftPlayer, isGameOver, dismissPlayerLeft } = usePlayerLeft();

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

  useEffect(() => {
    if (!currentRound?.id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`spectateur-${currentRound.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'accusations', filter: `round_id=eq.${currentRound.id}` },
        (payload) => {
          const newRow = payload.new as { result: string; accuser_id: string; accused_id: string };
          const result = newRow.result;
          if (result === 'cancelled') {
            router.replace('/game');
            return;
          }
          if (result !== 'denied' && result !== 'confirmed') return;

          // Sync le résultat dans le store pour que useFocusEffect dans game.tsx
          // ne tente pas d'annuler une accusation déjà résolue au retour.
          const { players: ps, myPlayer: me, setActiveAccusation: syncAccusation, activeAccusation: currAccusation } = useStore.getState();
          if (currAccusation) {
            syncAccusation({ ...currAccusation, result: result as 'confirmed' | 'denied' });
          }
          const accuserPlayer = ps.find((p) => p.id === newRow.accuser_id);
          const accusedPlayer = ps.find((p) => p.id === newRow.accused_id);
          const iAmAccuser = me?.id === newRow.accuser_id;

          let data: PointAttributionData;
          if (result === 'confirmed') {
            if (iAmAccuser) {
              data = {
                winnerName: me?.pseudo ?? '',
                winnerCharacter: me?.character ?? 'choux',
                winnerBg: CHARACTER_BG[me?.character ?? 'choux'],
                title: 'BIEN JOUÉ !',
                body: `Tu remportes ton point pour avoir démasqué ${accusedPlayer?.pseudo ?? '?'}`,
              };
            } else {
              data = {
                winnerName: accuserPlayer?.pseudo ?? '?',
                winnerCharacter: accuserPlayer?.character ?? 'choux',
                winnerBg: CHARACTER_BG[accuserPlayer?.character ?? 'choux'],
                title: 'POINT ATTRIBUÉ !',
                body: `${accuserPlayer?.pseudo ?? '?'} a remporté 1 point pour avoir démasqué ${accusedPlayer?.pseudo ?? '?'}`,
              };
            }
          } else {
            data = {
              winnerName: accusedPlayer?.pseudo ?? '?',
              winnerCharacter: accusedPlayer?.character ?? 'choux',
              winnerBg: CHARACTER_BG[accusedPlayer?.character ?? 'choux'],
              title: iAmAccuser ? 'ACCUSATION RATÉE' : 'POINT ATTRIBUÉ !',
              body: `${accusedPlayer?.pseudo ?? '?'} a remporté 1 point pour avoir été accusé à tort`,
            };
          }

          playSound('bonusPoint');
          postModalRef.current = () => router.replace('/game');
          setPointModalData(data);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${currentRound.id}` },
        (payload) => {
          const newRound = payload.new as Round;
          setCurrentRound(newRound);
          if (newRound.status === 'countdown') {
            const { players: p } = useStore.getState();
            router.replace(p.length <= 2 ? '/resultat-manche-1v1' : '/resultat-manche');
          }
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [currentRound?.id]);

  function handlePointModalClose() {
    setPointModalData(null);
    postModalRef.current();
  }

  function handleBack() {
    if (myPlayer?.id === buzzer?.id && activeAccusation?.id && activeAccusation.result === 'pending') {
      cancelAccusation(activeAccusation.id).catch(() => {});
    }
    router.replace('/game');
  }

  const accused       = players.find((p) => p.id === activeAccusation?.accused_id);
  const frozenAtMs = currentRound?.paused_since
    ? new Date(currentRound.paused_since).getTime()
    : taukFiredAt;
  const { display: timerDisplay, isUrgent } = useRoundTimer(
    currentRound?.started_at,
    frozenAtMs,
    currentRound?.total_paused_ms ?? 0,
    game?.round_duration_s ?? null,
  );

  const AccuserSvg: CharSvg = buzzer  ? (CHARACTER_MAP[buzzer.character]  ?? ChousSvg) : ChousSvg;
  const AccusedSvg: CharSvg = accused ? (CHARACTER_MAP[accused.character] ?? ChousSvg) : ChousSvg;

  return (
    <View style={styles.root}>
      <ToqueBackground />
      <AccusationBlobs />
      <GameMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <PointAttributionModal
        visible={pointModalData !== null}
        onClose={handlePointModalClose}
        data={pointModalData}
      />
      <PlayerLeftModal player={leftPlayer} isGameOver={isGameOver} onDismiss={dismissPlayerLeft} />

      <View style={styles.layout} pointerEvents="box-none">

        {/* ── Bloc 1 : frozen number + titre ── */}
        <View style={styles.numberSection}>
          {game?.round_duration_s != null && (
            <View style={styles.frozenNumber}>
              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <IceSvg width={112} height={112} />
              </View>
              <Text style={[styles.timerFrozen, isUrgent && styles.timerFrozenUrgent]}>
                {timerDisplay}
              </Text>
            </View>
          )}
          <Text style={styles.title}>Accusation en cours...</Text>
        </View>

        {/* ── Bloc 2 : accusateur ←🔪→ accusé ── */}
        <View style={styles.avatarsRow}>

          <View style={styles.playerCard}>
            <View style={[styles.avatar, styles.avatarAccuser]}>
              <AccuserSvg width={SMALL_AVATAR} height={SMALL_AVATAR} />
            </View>
            <View style={styles.playerNameRow}>
              <Text style={styles.playerName}>{buzzer?.pseudo ?? '…'}</Text>
            </View>
          </View>

          <View style={styles.knifeWrapper}>
            <CouteauSvg width={42} height={71} />
          </View>

          <View style={styles.playerCard}>
            <View style={[styles.avatar, styles.avatarAccused]}>
              <AccusedSvg width={SMALL_AVATAR} height={SMALL_AVATAR} />
            </View>
            <View style={styles.playerNameRow}>
              <Text style={styles.playerName}>{accused?.pseudo ?? '…'}</Text>
            </View>
          </View>

        </View>

        {/* ── Bloc 3 : texte d'attente ── */}
        <Pressable style={styles.waitingBox} onPress={() => router.push('/resultat-manche')} accessibilityRole="button">
          <Text style={styles.waitingText}>La sauce monte...</Text>
        </Pressable>

      </View>

      {/* ── Header flottant ── */}
      <SafeAreaView style={styles.headerSafe} edges={['top']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Pressable style={styles.iconBtn} onPress={handleBack} accessibilityRole="button" accessibilityLabel="Retour">
            <Ionicons name="close" size={20} color={palette.brandPink} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setMenuVisible(true)} accessibilityRole="button" accessibilityLabel="Options">
            <Ionicons name="settings-outline" size={20} color={palette.brandPink} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgWhite,
  },

  layout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 90,
    paddingBottom: 48,
  },

  numberSection: {
    alignItems: 'center',
    gap: 47,
  },
  frozenNumber: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerFrozen: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 28,
    lineHeight: 28,
    color: palette.brandGreen,
    opacity: 0.8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  timerFrozenUrgent: { color: palette.brandPink, opacity: 1 },
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    lineHeight: 36,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  avatarsRow: {
    width: 360,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerCard: {
    width: 157.5,
    height: 184.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13.5,
  },
  avatar: {
    width: SMALL_AVATAR,
    height: SMALL_AVATAR,
    borderRadius: SMALL_AVATAR / 2,
    overflow: 'hidden',
  },
  avatarAccuser: {
    backgroundColor: '#ffc014',
  },
  avatarAccused: {
    backgroundColor: '#ff3624',
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  playerName: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 18,
    lineHeight: 30,
    color: palette.textPrimary,
    textAlign: 'center',
    flex: 1,
    minHeight: 0,
  },
  knifeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '100deg' }],
    marginBottom: 30,
  },

  waitingBox: {
    backgroundColor: 'rgba(255, 20, 134, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  waitingText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: palette.brandPink,
    opacity: 0.5,
    width: 230,
    lineHeight: 26,
  },

  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 60,
    backgroundColor: palette.bgPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
