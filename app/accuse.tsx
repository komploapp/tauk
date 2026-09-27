import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ToqueBackground } from '@/components/ToqueBackground';
import { AccusationBlobs } from '@/components/AccusationBlobs';
import { GameMenu } from '@/components/GameMenu';
import { ChallengeOverlay } from '@/components/ChallengeOverlay';
import { PointAttributionModal, type PointAttributionData } from '@/components/PointAttributionModal';
import { palette } from '@/constants/palette';
import { resolveAccusation, kickPlayer, broadcastPlayerLeft } from '@/lib/game';
import { usePlayerLeft } from '@/hooks/usePlayerLeft';
import { PlayerLeftModal } from '@/components/PlayerLeftModal';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import { useRoundTimer } from '@/hooks/useRoundTimer';
import { playSound } from '@/lib/sound';
import type { Character, Round } from '@/store';

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

const LARGE_AVATAR = 166.5;

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

const CHARACTER_BG: Record<Character, string> = {
  choux: '#ffc014', avocado: '#7ac514', onion: '#c514b4',
  carot: '#ff7214', banana: '#ffe014', potatoes: '#c8a864',
  poivron: '#ff3214', aubergine: '#7814c8', mushroom: '#c87850',
};

export default function AccuseScreen() {
  const [challengeVisible, setChallengeVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => { playSound('accusation'); }, []);
  const [pointModalData, setPointModalData] = useState<PointAttributionData | null>(null);
  const postModalRef = useRef<() => void>(() => {});
  const roundStatusRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const accusationRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { game, activeAccusation, players, myPlayer, currentRound, setCurrentRound, removeValidatingTask, clearValidatingTasks, updateTaskStatus, taukFiredAt, reset } = useStore();
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
    if (roundStatusRef.current) {
      supabase.removeChannel(roundStatusRef.current);
      roundStatusRef.current = null;
    }
    const ch = supabase
      .channel(`round-status-accuse-${currentRound.id}-${Math.random().toString(36).slice(2)}`)
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
    roundStatusRef.current = ch;
    return () => {
      roundStatusRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [currentRound?.id]);

  useEffect(() => {
    if (!activeAccusation?.id) return;
    if (accusationRef.current) {
      supabase.removeChannel(accusationRef.current);
      accusationRef.current = null;
    }
    const ch = supabase
      .channel(`accuse-cancel-${activeAccusation.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'accusations', filter: `id=eq.${activeAccusation.id}` },
        (payload) => {
          if ((payload.new as { result: string }).result === 'cancelled') {
            router.replace('/game');
          }
        },
      )
      .subscribe();
    accusationRef.current = ch;
    return () => {
      accusationRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [activeAccusation?.id]);

  const accuser     = players.find((p) => p.id === activeAccusation?.accuser_id);
  const pseudo      = accuser?.pseudo ?? '…';
  const frozenAtMs = currentRound?.paused_since
    ? new Date(currentRound.paused_since).getTime()
    : taukFiredAt;
  const { display: timerDisplay, isUrgent } = useRoundTimer(
    currentRound?.started_at,
    frozenAtMs,
    currentRound?.total_paused_ms ?? 0,
    game?.round_duration_s ?? null,
  );
  const AvatarSvg: CharSvg = accuser ? (CHARACTER_MAP[accuser.character] ?? ChousSvg) : ChousSvg;

  function showPointModal(data: PointAttributionData) {
    playSound('bonusPoint');
    postModalRef.current = () => router.replace('/game');
    setPointModalData(data);
  }

  function handlePointModalClose() {
    setPointModalData(null);
    postModalRef.current();
  }

  function handleOui() {
    setChallengeVisible(true);
  }

  function handleNon() {
    if (activeAccusation?.id) {
      resolveAccusation(activeAccusation.id, 'denied').catch(() => {});
    }
    const myChar = myPlayer?.character ?? 'choux';
    showPointModal({
      winnerName: myPlayer?.pseudo ?? '',
      winnerCharacter: myChar,
      winnerBg: CHARACTER_BG[myChar],
      title: 'BIEN JOUÉ !',
      body: 'Tu remportes ton point pour avoir été accusé à tort',
    });
  }

  function handleChallengeConfirm(challengeId: string) {
    setChallengeVisible(false);
    removeValidatingTask(challengeId);
    clearValidatingTasks();
    updateTaskStatus(challengeId, 'grilled');
    if (activeAccusation?.id) {
      resolveAccusation(activeAccusation.id, 'confirmed', challengeId).catch(() => {});
    }
    const accuserChar = accuser?.character ?? 'choux';
    showPointModal({
      winnerName: accuser?.pseudo ?? '?',
      winnerCharacter: accuserChar,
      winnerBg: CHARACTER_BG[accuserChar],
      title: 'GRILLÉ !',
      body: `${accuser?.pseudo ?? '?'} a remporté 1 point pour t'avoir démasqué`,
    });
  }

  return (
    <View style={styles.root}>
      <ToqueBackground />
      <AccusationBlobs />
      <GameMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <PlayerLeftModal player={leftPlayer} isGameOver={isGameOver} onDismiss={dismissPlayerLeft} />

      <View style={styles.layout} pointerEvents="box-none">

        {/* ── Bloc 1 : frozen number + titre ── */}
        <View style={styles.numberSection}>
          {game?.round_duration_s != null && (
            <View style={styles.iceBlock}>
              <IceSvg width={112} height={112} />
              <View style={styles.timerOverlay}>
                <Text style={[styles.timerFrozen, isUrgent && styles.timerFrozenUrgent]}>
                  {timerDisplay}
                </Text>
              </View>
            </View>
          )}
          <Text style={styles.topTitle}>Tu es accusé par</Text>
        </View>

        {/* ── Bloc 2 : avatar accusateur + pseudo ── */}
        <View style={styles.accuserBlock}>
          <View style={styles.avatar}>
            <AvatarSvg width={LARGE_AVATAR} height={LARGE_AVATAR} />
          </View>
          <View style={styles.accuserNameRow}>
            <Text style={styles.accuserName}>{pseudo}</Text>
          </View>
        </View>

        {/* ── Bloc 3 : question + boutons ── */}
        <View style={styles.bottomBlock}>
          <Text style={styles.questionText}>T'es cramé ?</Text>
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [styles.ouiBtn, pressed && styles.btnPressed]}
              onPress={handleOui}
              accessibilityRole="button"
              accessibilityLabel="Oui, je suis cramé"
            >
              <Text style={styles.btnText}>OUI</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.nonBtn, pressed && styles.btnPressed]}
              onPress={handleNon}
              accessibilityRole="button"
              accessibilityLabel="Non, je ne suis pas cramé"
            >
              <Text style={styles.btnText}>NON</Text>
            </Pressable>
          </View>
        </View>

      </View>

      <ChallengeOverlay
        visible={challengeVisible}
        onClose={() => setChallengeVisible(false)}
        onConfirm={handleChallengeConfirm}
      />

      <PointAttributionModal
        visible={pointModalData !== null}
        onClose={handlePointModalClose}
        data={pointModalData}
      />

      {/* ── Header flottant ── */}
      <SafeAreaView style={styles.headerSafe} edges={['top']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Pressable style={styles.iconBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
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
    paddingBottom: 40,
  },

  numberSection: {
    alignItems: 'center',
    gap: 32,
  },
  iceBlock: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  topTitle: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    lineHeight: 36,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  accuserBlock: {
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: LARGE_AVATAR,
    height: LARGE_AVATAR,
    borderRadius: LARGE_AVATAR / 2,
    overflow: 'hidden',
  },
  accuserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  accuserName: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 22,
    lineHeight: 45,
    color: palette.textPrimary,
    textAlign: 'center',
  },

  bottomBlock: {
    alignItems: 'center',
    gap: 24,
    width: 340,
  },
  questionText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 22,
    color: palette.brandPink,
    alignSelf: 'flex-start',
  },
  buttons: {
    width: '100%',
    gap: 16,
  },
  ouiBtn: {
    height: 47,
    backgroundColor: palette.brandGreen,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nonBtn: {
    height: 47,
    backgroundColor: palette.brandPink,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: '#ffffff',
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
