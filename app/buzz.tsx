import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ToqueBackground } from '@/components/ToqueBackground';
import { AccusationBlobs } from '@/components/AccusationBlobs';
import { PointAttributionModal, type PointAttributionData } from '@/components/PointAttributionModal';
import { palette } from '@/constants/palette';
import { kickPlayer, broadcastPlayerLeft } from '@/lib/game';
import { usePlayerLeft } from '@/hooks/usePlayerLeft';
import { PlayerLeftModal } from '@/components/PlayerLeftModal';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase';
import type { Character, Accusation, Round } from '@/store';

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

export default function BuzzScreen() {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const bcChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [pointModalData, setPointModalData] = useState<PointAttributionData | null>(null);
  const postModalRef = useRef<() => void>(() => {});
  const { game, buzzer, myPlayer, currentRound, setActiveAccusation, setCurrentRound, players, reset } = useStore();
  const { leftPlayer, isGameOver, dismissPlayerLeft } = usePlayerLeft();

  function handlePointModalClose() {
    setPointModalData(null);
    postModalRef.current();
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

  // Si ce joueur est l'accusé, le Realtime le redirige vers /accuse dès que
  // l'accusateur confirme sa cible (INSERT sur accusations).
  useEffect(() => {
    if (!myPlayer?.id || !currentRound?.id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`buzz-${myPlayer.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'accusations', filter: `accused_id=eq.${myPlayer.id}` },
        (payload) => {
          setActiveAccusation(payload.new as Accusation);
          router.replace('/accuse');
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'accusations', filter: `round_id=eq.${currentRound.id}` },
        (payload) => {
          const newRow = payload.new as { result: string; accuser_id: string; accused_id: string };
          const result = newRow.result;
          if (result !== 'denied' && result !== 'confirmed') return;

          const { players: ps } = useStore.getState();
          const accuserPlayer = ps.find((p) => p.id === newRow.accuser_id);
          const accusedPlayer = ps.find((p) => p.id === newRow.accused_id);

          let data: PointAttributionData;
          if (result === 'confirmed') {
            data = {
              winnerName: accuserPlayer?.pseudo ?? '?',
              winnerCharacter: accuserPlayer?.character ?? 'choux',
              winnerBg: CHARACTER_BG[accuserPlayer?.character ?? 'choux'],
              title: 'POINT ATTRIBUÉ !',
              body: `${accuserPlayer?.pseudo ?? '?'} a remporté 1 point pour avoir démasqué ${accusedPlayer?.pseudo ?? '?'}`,
            };
          } else {
            data = {
              winnerName: accusedPlayer?.pseudo ?? '?',
              winnerCharacter: accusedPlayer?.character ?? 'choux',
              winnerBg: CHARACTER_BG[accusedPlayer?.character ?? 'choux'],
              title: 'POINT ATTRIBUÉ !',
              body: `${accusedPlayer?.pseudo ?? '?'} a remporté 1 point pour avoir été accusé à tort`,
            };
          }

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

    if (bcChannelRef.current) {
      supabase.removeChannel(bcChannelRef.current);
      bcChannelRef.current = null;
    }

    const bcChannel = supabase
      .channel(`round-bc-${currentRound.id}`)
      .on('broadcast', { event: 'tauk_cancelled' }, () => {
        router.replace('/game');
      })
      .subscribe();

    bcChannelRef.current = bcChannel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
      bcChannelRef.current = null;
      supabase.removeChannel(bcChannel);
    };
  }, [myPlayer?.id, currentRound?.id]);

  const roundNumber = currentRound?.round_number ?? '–';
  const pseudo      = buzzer?.pseudo ?? '…';
  const AvatarSvg: CharSvg = buzzer ? (CHARACTER_MAP[buzzer.character] ?? ChousSvg) : ChousSvg;

  return (
    <View style={styles.root}>
      <ToqueBackground />
      <AccusationBlobs />
      <PointAttributionModal
        visible={pointModalData !== null}
        onClose={handlePointModalClose}
        data={pointModalData}
      />
      <PlayerLeftModal player={leftPlayer} isGameOver={isGameOver} onDismiss={dismissPlayerLeft} />

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.content}>
          {/* ── Number + title ── */}
          <View style={styles.numberSection}>
            <View style={styles.frozenNumber}>
              <View style={StyleSheet.absoluteFillObject}>
                <IceSvg width={112} height={112} />
              </View>
              <Text style={styles.roundNumber}>{roundNumber}</Text>
            </View>
            <Text style={styles.accusedTitle}>{pseudo} a Tauké !</Text>
          </View>

          {/* ── Avatar du buzzer ── */}
          <View style={styles.avatar}>
            <AvatarSvg width={LARGE_AVATAR} height={LARGE_AVATAR} />
          </View>
        </View>
      </View>

      {/* Waiting text */}
      <View style={styles.waitingArea} pointerEvents="box-none">
        <View style={styles.waitingBox}>
          <Text style={styles.waitingText}>
            {'Il aiguise son couteau...'}
          </Text>
        </View>
      </View>

      {/* Header */}
      <SafeAreaView style={styles.headerSafe} edges={['top']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Text style={styles.backBtnText}>{'<'}</Text>
          </Pressable>
          <Pressable
            style={styles.settingsBtn}
            onPress={handleQuit}
            accessibilityRole="button"
            accessibilityLabel="Quitter"
          >
            <Text style={styles.settingsBtnText}>✕</Text>
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

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 65,
    paddingTop: 108,
  },

  numberSection: {
    alignItems: 'center',
    gap: 48,
  },
  frozenNumber: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundNumber: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 54,
    lineHeight: 54,
    color: palette.brandGreen,
    opacity: 0.5,
    textAlign: 'center',
  },
  accusedTitle: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    lineHeight: 36,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  avatar: {
    width: LARGE_AVATAR,
    height: LARGE_AVATAR,
    borderRadius: LARGE_AVATAR / 2,
    overflow: 'hidden',
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
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 60,
    backgroundColor: palette.bgPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 16,
    color: palette.brandPink,
    lineHeight: 20,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 60,
    backgroundColor: palette.bgPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: {
    fontSize: 16,
    color: palette.brandPink,
  },

  waitingArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 48,
  },
  waitingBox: {
    backgroundColor: 'rgba(255, 20, 134, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingBottom: 6,
    paddingTop: 6,
  },
  waitingText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: palette.brandPink,
    opacity: 0.5,
    width: 230,
    lineHeight: 26,
  },
});
