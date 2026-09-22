import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ToqueBackground } from '@/components/ToqueBackground';
import { palette, spacing, radius } from '@/constants/palette';
import { supabase } from '@/lib/supabase';
import { startGame, loadPlayers, setPlayerReady } from '@/lib/game';
import { useStore } from '@/store';
import type { Character, Player, Round } from '@/store';

import ChousSvg from '@/assets/images/personnages/character-choux.svg';
import AvocadoSvg from '@/assets/images/personnages/character-avocado.svg';
import Onion1Svg from '@/assets/images/personnages/character-onion-1.svg';
import CarotSvg from '@/assets/images/personnages/character-carot.svg';
import BananaSvg from '@/assets/images/personnages/character-banana.svg';
import PotatoesSvg from '@/assets/images/personnages/character-potatoes.svg';
import PoivronSvg from '@/assets/images/personnages/character-poivron.svg';
import AubergineSvg from '@/assets/images/personnages/character-aubergine.svg';
import MushroomSvg from '@/assets/images/personnages/character-mushroom.svg';
import ReadySvg from '@/assets/images/ready.svg';

const AVATAR_SIZE = 74;
const SLOT_W = 105;
const MAX_PSEUDO = 13;

type CharSvg = React.FC<{ width: number; height: number }>;

const CHARACTER_MAP: Record<Character, CharSvg> = {
  choux: ChousSvg,
  avocado: AvocadoSvg,
  onion: Onion1Svg,
  carot: CarotSvg,
  banana: BananaSvg,
  potatoes: PotatoesSvg,
  poivron: PoivronSvg,
  aubergine: AubergineSvg,
  mushroom: MushroomSvg,
};

function PlayerCard({ player }: { player: Player }) {
  const Char = CHARACTER_MAP[player.character] ?? ChousSvg;
  const showReady = player.is_host || player.is_ready;
  return (
    <View style={styles.slot}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Char width={AVATAR_SIZE} height={AVATAR_SIZE} />
        </View>
        {showReady && (
          <View style={styles.tick}>
            <ReadySvg width={28} height={28} />
          </View>
        )}
      </View>
      <Text style={styles.pseudo} numberOfLines={2}>
        {player.pseudo.slice(0, MAX_PSEUDO)}
      </Text>
    </View>
  );
}

function chunkFixed<T>(arr: T[], size: number): (T | null)[][] {
  const numRows = Math.max(1, Math.ceil(arr.length / size));
  return Array.from({ length: numRows }, (_, ri) =>
    Array.from({ length: size }, (_, ci) => arr[ri * size + ci] ?? null)
  );
}

export default function HostScreen() {
  const { game, myPlayer, players, setPlayers, setCurrentRound, setMyPlayer } = useStore();

  // Redirect if no game in store (e.g. direct navigation)
  useEffect(() => {
    if (!game?.id) router.replace('/');
  }, [game?.id]);

  // Initial player load + Realtime subscription
  useEffect(() => {
    if (!game?.id) return;

    const refreshPlayers = () => loadPlayers(game.id).then(setPlayers);
    refreshPlayers();

    const channel = supabase
      .channel(`lobby-${game.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${game.id}` },
        () => { refreshPlayers(); },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rounds', filter: `game_id=eq.${game.id}` },
        (payload) => {
          setCurrentRound(payload.new as Round);
          router.replace('/prepa');
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [game?.id]);

  async function handleStart() {
    if (!game?.id) return;
    try {
      const round = await startGame(game.id);
      setCurrentRound(round);
      router.replace('/prepa');
    } catch {
      // error handled silently — Realtime will trigger navigation anyway
    }
  }

  async function handleReady() {
    if (!myPlayer?.id) return;
    const next = !myPlayer.is_ready;
    await setPlayerReady(myPlayer.id, next);
    setMyPlayer({ ...myPlayer, is_ready: next });
  }

  if (!game) return null;

  const rows = chunkFixed(players, 3);

  return (
    <View style={styles.root}>
      <ToqueBackground />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Text style={styles.backBtnText}>{'<'}</Text>
          </Pressable>
          <View style={styles.settingsBtn}>
            <Text style={styles.settingsBtnText}>⚙</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.modeTitle}>Tâches</Text>

          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Code partie</Text>
            <View style={styles.codeChip}>
              <Text style={styles.codeText}>{game.code}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Convives</Text>

          <View style={styles.grid}>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.row}>
                {row.map((p, ci) =>
                  p
                    ? <PlayerCard key={p.id} player={p} />
                    : <View key={`empty-${ri}-${ci}`} style={styles.slot} />
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {myPlayer?.is_host ? (
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                players.length < 2 && styles.primaryBtnDisabled,
                pressed && styles.pressed,
              ]}
              onPress={handleStart}
              disabled={players.length < 2}
              accessibilityRole="button"
              accessibilityLabel="Lancer la partie"
            >
              <Text style={styles.primaryBtnText}>
                {players.length < 2 ? 'En attente d\'autres joueurs' : 'Lancer la partie'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                myPlayer?.is_ready ? styles.readyBtnDone : styles.readyBtn,
                pressed && styles.pressed,
              ]}
              onPress={handleReady}
              accessibilityRole="button"
              accessibilityLabel={myPlayer?.is_ready ? 'Annuler prêt' : 'Je suis prêt'}
            >
              <Text style={styles.readyBtnText}>
                {myPlayer?.is_ready ? 'Prêt ✓  (annuler)' : 'Je suis prêt !'}
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgWhite },
  safeArea: { flex: 1, zIndex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 26, paddingTop: 8, paddingBottom: 4,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 60,
    backgroundColor: 'rgba(255, 20, 134, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontFamily: 'Recursive_600SemiBold', fontSize: 16, color: palette.brandPink, lineHeight: 20 },
  settingsBtn: {
    width: 32, height: 32, borderRadius: 60,
    backgroundColor: 'rgba(255, 20, 134, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  settingsBtnText: { fontSize: 16, color: palette.brandPink },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 16 },
  modeTitle: {
    fontFamily: 'Staatliches_400Regular', fontSize: 38, color: palette.brandPink,
    textTransform: 'uppercase', lineHeight: 42, textAlign: 'center',
  },
  codeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.small,
    backgroundColor: palette.bgWhite, paddingHorizontal: spacing.small, paddingVertical: 8,
    borderRadius: 4, shadowColor: palette.shadowYellow,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 44, elevation: 4,
  },
  codeLabel: { fontFamily: 'Recursive_400Regular', fontSize: 20, lineHeight: 26, color: palette.brandGreen },
  codeChip: {
    backgroundColor: 'rgba(255, 20, 134, 0.1)', borderRadius: radius.chip,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  codeText: {
    fontFamily: 'Recursive_400Regular', fontSize: 24,
    color: palette.brandPink, letterSpacing: 4.8,
  },
  sectionTitle: {
    fontFamily: 'Recursive_600SemiBold', fontSize: 22,
    color: palette.brandPink, alignSelf: 'flex-start',
  },
  grid: { width: '100%', gap: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', height: 123, alignItems: 'center' },
  slot: { width: SLOT_W, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 },
  avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, overflow: 'hidden' },
  tick: { position: 'absolute', right: -4, bottom: -4, width: 28, height: 28 },
  pseudo: {
    fontFamily: 'Recursive_400Regular', fontSize: 13, lineHeight: 16.9,
    color: palette.textPrimary, textAlign: 'center', width: '100%',
  },
  footer: { paddingHorizontal: 16, paddingBottom: spacing.small, paddingTop: 8 },
  primaryBtn: {
    backgroundColor: palette.brandGreen, borderRadius: radius.main,
    paddingHorizontal: spacing.medium, paddingVertical: spacing.xsmall,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontFamily: 'Recursive_400Regular', fontSize: 20, lineHeight: 26, color: '#ffffff' },
  readyBtn: {
    backgroundColor: palette.brandPink, borderRadius: radius.main,
    paddingHorizontal: spacing.medium, paddingVertical: spacing.xsmall,
    alignItems: 'center', justifyContent: 'center',
  },
  readyBtnDone: {
    backgroundColor: palette.brandGreen, borderRadius: radius.main,
    paddingHorizontal: spacing.medium, paddingVertical: spacing.xsmall,
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.7,
  },
  readyBtnText: { fontFamily: 'Recursive_400Regular', fontSize: 20, lineHeight: 26, color: '#ffffff' },
  pressed: { opacity: 0.8 },
});
