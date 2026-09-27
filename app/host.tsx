import { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Alert, TextInput, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PenSvg from '@/assets/images/pen.svg';
import { ToqueBackground } from '@/components/ToqueBackground';
import { GameMenu } from '@/components/GameMenu';
import { palette, spacing, radius } from '@/constants/palette';
import { supabase } from '@/lib/supabase';
import { startGame, loadPlayers, setPlayerReady, updatePlayerPseudo, kickPlayer, transferHost, updateRoundCount, updateRoundDurationS } from '@/lib/game';
import type { TimerDuration } from '@/components/GameMenu';
import { useStore } from '@/store';
import type { Character, Game, GameMode, Player, Round } from '@/store';

const MODE_LABELS: Record<GameMode, string> = {
  taches: 'Fourneaux',
};

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
import HostSvg from '@/assets/images/host.svg';

const AVATAR_SIZE = 74;
const RING_SIZE = AVATAR_SIZE + 4; // ring is border-width × 2 larger so avatar fills perfectly
const SLOT_W = 105;
const MAX_PSEUDO = 13;
const COL_GAP = 24;

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

// ─── My featured card (horizontal, editable pseudo) ───────────────────────────

interface MyCardProps {
  player: Player;
  onSave: (pseudo: string) => void;
}

function MyCard({ player, onSave }: MyCardProps) {
  const Char = CHARACTER_MAP[player.character] ?? ChousSvg;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.pseudo);

  useEffect(() => {
    if (!editing) setDraft(player.pseudo);
  }, [player.pseudo, editing]);

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed.length >= 2) onSave(trimmed);
    else setDraft(player.pseudo);
    setEditing(false);
  }

  return (
    <View style={styles.meCard}>
      {/* Avatar with pink ring border */}
      <View style={styles.meAvatarRing}>
        <View style={styles.meAvatar}>
          <Char width={AVATAR_SIZE} height={AVATAR_SIZE} />
        </View>
        {player.is_ready && (
          <View style={styles.tick}><ReadySvg width={28} height={28} /></View>
        )}
      </View>

      {/* Name chip – tappable to edit */}
      {editing ? (
        <TextInput
          style={styles.meInput}
          value={draft}
          onChangeText={(v) => setDraft(v.slice(0, MAX_PSEUDO))}
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onBlur={handleSave}
          onSubmitEditing={handleSave}
          selectTextOnFocus
        />
      ) : (
        <Pressable
          style={({ pressed }) => [styles.meNameChip, pressed && styles.pressed]}
          onPress={() => { setDraft(player.pseudo); setEditing(true); }}
          accessibilityRole="button"
          accessibilityLabel={`Modifier le pseudo : ${player.pseudo}`}
        >
          <Text style={styles.meName} numberOfLines={1}>{player.pseudo.slice(0, MAX_PSEUDO)}</Text>
          <PenSvg width={13} height={13} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Small grid card ──────────────────────────────────────────────────────────

interface PlayerCardProps {
  player: Player;
  isMe: boolean;
  onAdminPress?: () => void;
}

function PlayerCard({ player, isMe, onAdminPress }: PlayerCardProps) {
  const Char = CHARACTER_MAP[player.character] ?? ChousSvg;
  const avatarAndName = (
    <>
      <View style={[styles.avatarRing, isMe && styles.avatarRingMe]}>
        <View style={styles.avatarInner}>
          <Char width={AVATAR_SIZE} height={AVATAR_SIZE} />
        </View>
        {player.is_ready && (
          <View style={styles.tick}><ReadySvg width={28} height={28} /></View>
        )}
      </View>
      <View style={styles.pseudoRow}>
      <Text style={styles.pseudo} numberOfLines={2}>{player.pseudo.slice(0, MAX_PSEUDO)}</Text>
      {player.is_host && <HostSvg width={14} height={14} />}
    </View>
    </>
  );
  if (onAdminPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
        onPress={onAdminPress}
        accessibilityRole="button"
      >
        {avatarAndName}
      </Pressable>
    );
  }
  return <View style={styles.slot}>{avatarAndName}</View>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunkFixed<T>(arr: T[], size: number): (T | null)[][] {
  const numRows = Math.max(1, Math.ceil(arr.length / size));
  return Array.from({ length: numRows }, (_, ri) =>
    Array.from({ length: size }, (_, ci) => arr[ri * size + ci] ?? null)
  );
}

// ─── Host screen ──────────────────────────────────────────────────────────────

interface TimerSuggestion {
  targetDuration: TimerDuration;
  line1: string;
  line2: string;
}

export default function HostScreen() {
  const { game, myPlayer, players, setGame, setPlayers, setCurrentRound, setMyPlayer, upsertPlayer } = useStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const shownSuggestionThresholdsRef = useRef(new Set<number>());
  const [timerSuggestion, setTimerSuggestion] = useState<TimerSuggestion | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [adminTarget, setAdminTarget] = useState<Player | null>(null);
  const [roundNotif, setRoundNotif] = useState<number | null>(null);
  const [timerNotif, setTimerNotif] = useState<TimerDuration | 'idle'>('idle');
  const [kickedNotif, setKickedNotif] = useState(false);
  const [newHostNotif, setNewHostNotif] = useState(false);

  useEffect(() => {
    if (!game?.id) router.replace('/');
  }, [game?.id]);

  useEffect(() => {
    if (roundNotif === null) return;
    const t = setTimeout(() => setRoundNotif(null), 3000);
    return () => clearTimeout(t);
  }, [roundNotif]);

  useEffect(() => {
    if (timerNotif === 'idle') return;
    const t = setTimeout(() => setTimerNotif('idle'), 3000);
    return () => clearTimeout(t);
  }, [timerNotif]);

  useEffect(() => {
    if (!kickedNotif) return;
    const t = setTimeout(() => { setKickedNotif(false); useStore.getState().reset(); router.replace('/'); }, 5000);
    return () => clearTimeout(t);
  }, [kickedNotif]);

  useEffect(() => {
    if (!newHostNotif) return;
    const t = setTimeout(() => setNewHostNotif(false), 5000);
    return () => clearTimeout(t);
  }, [newHostNotif]);

  useEffect(() => {
    if (!game?.id) return;

    const refreshPlayers = () => loadPlayers(game.id).then(setPlayers);
    refreshPlayers();

    const myId = myPlayer?.id;

    const channel = supabase
      .channel(`lobby-${game.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${game.id}` }, () => refreshPlayers())
      .on('broadcast', { event: 'player_ready' }, ({ payload }: { payload: Player }) => upsertPlayer(payload))
      .on('broadcast', { event: 'pseudo_update' }, ({ payload }: { payload: Player }) => upsertPlayer(payload))
      .on('broadcast', { event: 'round_count_changed' }, ({ payload }: { payload: { round_count: number } }) => {
        setRoundNotif(payload.round_count);
      })
      .on('broadcast', { event: 'timer_duration_changed' }, ({ payload }: { payload: { duration_s: TimerDuration } }) => {
        setTimerNotif(payload.duration_s);
      })
      .on('broadcast', { event: 'player_kicked' }, ({ payload }: { payload: { playerId: string } }) => {
        if (payload.playerId === myId) {
          setKickedNotif(true);
        } else {
          setPlayers(useStore.getState().players.filter(p => p.id !== payload.playerId));
        }
      })
      .on('broadcast', { event: 'host_transferred' }, ({ payload }: { payload: { newHostId: string } }) => {
        if (payload.newHostId === myId) {
          setNewHostNotif(true);
          const cur = useStore.getState().myPlayer;
          if (cur) setMyPlayer({ ...cur, is_host: true });
        }
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rounds', filter: `game_id=eq.${game.id}` },
        (payload) => { setCurrentRound(payload.new as Round); router.replace('/prepa'); },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
        (payload) => { setGame(payload.new as Game); },
      )
      .subscribe();

    channelRef.current = channel;
    return () => { channelRef.current = null; supabase.removeChannel(channel); };
  }, [game?.id]);

  useEffect(() => {
    const myP = useStore.getState().myPlayer;
    if (!myP?.is_host) return;
    const currentGame = useStore.getState().game;
    if (!currentGame?.id) return;

    const count = players.length;
    const currentDuration = currentGame.round_duration_s as TimerDuration;

    let targetDuration: TimerDuration = null;
    let line1 = '';
    let line2 = '';

    if (count >= 7 && !shownSuggestionThresholdsRef.current.has(7)) {
      shownSuggestionThresholdsRef.current.add(7);
      targetDuration = 300;
      line1 = 'Vous êtes 7+ joueurs !';
      line2 = 'On vous conseille de passer le timer à 5 min pour plus de fun.';
    } else if (count >= 4 && !shownSuggestionThresholdsRef.current.has(4)) {
      shownSuggestionThresholdsRef.current.add(4);
      targetDuration = 180;
      line1 = 'Vous êtes 4 joueurs !';
      line2 = '3 minutes pour un équilibre parfait.';
    }

    if (!targetDuration || targetDuration === currentDuration) return;
    setTimerSuggestion({ targetDuration, line1, line2 });
  }, [players.length]);

  async function handleStart() {
    if (!game?.id) return;
    try {
      const round = await startGame(game.id);
      setCurrentRound(round);
      router.replace('/prepa');
    } catch { /* Realtime fallback */ }
  }

  function handleQuit() {
    Alert.alert(
      'Quitter la partie ?',
      'La partie sera annulée pour tous les joueurs.',
      [
        { text: 'Rester', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => { useStore.getState().reset(); router.replace('/'); } },
      ],
    );
  }

  async function handleShare() {
    if (!game?.code) return;
    await Share.share({
      message: `Rejoins ma partie Tauk ! 🎮\nCode : ${game.code}\n\nTélécharge l'app : https://tauk.app`,
    });
  }

  async function handleReady() {
    if (!myPlayer?.id) return;
    const next = !myPlayer.is_ready;
    await setPlayerReady(myPlayer.id, next);
    const updated = { ...myPlayer, is_ready: next };
    setMyPlayer(updated);
    upsertPlayer(updated);
    channelRef.current?.send({ type: 'broadcast', event: 'player_ready', payload: updated });
  }

  async function handleRoundCountChange(n: 3 | 6 | 10) {
    if (!game?.id) return;
    try {
      await updateRoundCount(game.id, n);
      setGame({ ...game, round_count: n });
      channelRef.current?.send({ type: 'broadcast', event: 'round_count_changed', payload: { round_count: n } });
    } catch { /* Realtime fallback */ }
  }

  async function handleSuggestionAccept() {
    const s = timerSuggestion;
    setTimerSuggestion(null);
    if (s?.targetDuration !== undefined && game?.id) {
      await handleTimerDurationChange(s.targetDuration);
    }
  }

  function handleSuggestionDecline() {
    setTimerSuggestion(null);
  }

  async function handleTimerDurationChange(d: TimerDuration) {
    if (!game?.id) return;
    try {
      await updateRoundDurationS(game.id, d);
      setGame({ ...game, round_duration_s: d });
      channelRef.current?.send({ type: 'broadcast', event: 'timer_duration_changed', payload: { duration_s: d } });
    } catch { /* Realtime fallback */ }
  }

  async function handleKickPlayer(player: Player) {
    try {
      await kickPlayer(player.id);
      setPlayers(players.filter(p => p.id !== player.id));
      channelRef.current?.send({ type: 'broadcast', event: 'player_kicked', payload: { playerId: player.id } });
      setAdminTarget(null);
    } catch (e) {
      Alert.alert('Erreur', `Impossible d'exclure ${player.pseudo}.`);
    }
  }

  async function handleTransferHost(player: Player) {
    if (!game?.id || !myPlayer?.id) return;
    try {
      await transferHost(game.id, player.id, myPlayer.id);
      channelRef.current?.send({ type: 'broadcast', event: 'host_transferred', payload: { newHostId: player.id } });
      setMyPlayer({ ...myPlayer, is_host: false });
      setAdminTarget(null);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de transférer le rôle d\'hôte.');
    }
  }

  async function handlePseudoSave(newPseudo: string) {
    if (!myPlayer?.id) return;
    try {
      await updatePlayerPseudo(myPlayer.id, newPseudo);
      const updated = { ...myPlayer, pseudo: newPseudo };
      setMyPlayer(updated);
      upsertPlayer(updated);
      channelRef.current?.send({ type: 'broadcast', event: 'pseudo_update', payload: updated });
    } catch { /* revert handled by MyCard's useEffect */ }
  }

  // Grid shows only other players (me is featured above)
  const sortedPlayers = useMemo(() => {
    if (!myPlayer) return players;
    return players.filter((p) => p.id !== myPlayer.id);
  }, [players, myPlayer?.id]);

  if (!game) return null;

  const notReady = players.filter(p => !p.is_host && !p.is_ready);
  const canStart = players.length >= 2 && notReady.length === 0;
  const startLabel =
    players.length < 2 ? "En attente d'autres joueurs" :
    notReady.length > 0 ? `${notReady.length} joueur${notReady.length > 1 ? 's' : ''} pas prêt${notReady.length > 1 ? 's' : ''}` :
    'Lancer la partie';

  const rows = chunkFixed(sortedPlayers, 3);

  return (
    <View style={styles.root}>
      <ToqueBackground />
      <GameMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isHost={!!myPlayer?.is_host}
        roundCount={(game.round_count as 3 | 6 | 10) ?? 3}
        onRoundCountChange={myPlayer?.is_host ? handleRoundCountChange : undefined}
        timerDuration={(game.round_duration_s as TimerDuration) ?? null}
        onTimerDurationChange={myPlayer?.is_host ? handleTimerDurationChange : undefined}
      />

      {/* ── Round count notification ── */}
      <Modal
        visible={roundNotif !== null}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setRoundNotif(null)}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView style={StyleSheet.absoluteFill} intensity={20} tint="dark" />
        </View>
        <Pressable style={styles.roundNotifOverlay} onPress={() => setRoundNotif(null)}>
          <Pressable style={styles.roundNotifCard} onPress={() => {}}>
            <Ionicons name="layers-outline" size={28} color={palette.brandGreen} />
            <Text style={styles.roundNotifLabel}>Nombre de services</Text>
            <Text style={styles.roundNotifCount}>{roundNotif}</Text>
            <Text style={styles.roundNotifSub}>mis à jour par l'hôte</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Timer notification ── */}
      <Modal
        visible={timerNotif !== 'idle'}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setTimerNotif('idle')}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView style={StyleSheet.absoluteFill} intensity={20} tint="dark" />
        </View>
        <Pressable style={styles.roundNotifOverlay} onPress={() => setTimerNotif('idle')}>
          <Pressable style={styles.roundNotifCard} onPress={() => {}}>
            <Ionicons name="timer-outline" size={28} color={palette.brandGreen} />
            <Text style={styles.roundNotifLabel}>Durée du timer</Text>
            <Text style={styles.roundNotifCount}>
              {timerNotif === null ? '∞' : timerNotif === 60 ? "1'" : timerNotif === 180 ? "3'" : "5'"}
            </Text>
            <Text style={styles.roundNotifSub}>mis à jour par l'hôte</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Kicked notification ── */}
      <Modal
        visible={kickedNotif}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView style={StyleSheet.absoluteFill} intensity={20} tint="dark" />
        </View>
        <View style={styles.notifOverlay}>
          <View style={styles.notifCard}>
            <Ionicons name="exit-outline" size={32} color={palette.brandPink} />
            <Text style={styles.notifTitle}>Tu as été exclu</Text>
            <Text style={styles.notifBody}>L'hôte t'a retiré de la partie.</Text>
            <Pressable
              style={({ pressed }) => [styles.notifBtn, pressed && styles.pressed]}
              onPress={() => { setKickedNotif(false); useStore.getState().reset(); router.replace('/'); }}
              accessibilityRole="button"
            >
              <Text style={styles.notifBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── New host notification ── */}
      <Modal
        visible={newHostNotif}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setNewHostNotif(false)}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView style={StyleSheet.absoluteFill} intensity={20} tint="dark" />
        </View>
        <View style={styles.notifOverlay}>
          <View style={styles.notifCard}>
            <Ionicons name="key-outline" size={32} color={palette.brandGreen} />
            <Text style={[styles.notifTitle, { color: palette.brandGreen }]}>Tu es le chef !</Text>
            <Text style={styles.notifBody}>Tu peux désormais gérer la partie.</Text>
            <Pressable
              style={({ pressed }) => [styles.notifBtn, styles.notifBtnGreen, pressed && styles.pressed]}
              onPress={() => setNewHostNotif(false)}
              accessibilityRole="button"
            >
              <Text style={styles.notifBtnText}>Super !</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Timer suggestion modal ── */}
      <Modal
        visible={timerSuggestion !== null}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={handleSuggestionDecline}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView style={StyleSheet.absoluteFill} intensity={20} tint="dark" />
        </View>
        <View style={styles.notifOverlay}>
          <View style={styles.notifCard}>
            <Ionicons name="timer-outline" size={32} color={palette.brandGreen} />
            <Text style={[styles.notifTitle, { color: palette.brandGreen }]}>
              {timerSuggestion?.line1}
            </Text>
            <Text style={styles.notifBody}>{timerSuggestion?.line2}</Text>
            <Pressable
              style={({ pressed }) => [styles.notifBtn, styles.notifBtnGreen, pressed && styles.pressed]}
              onPress={handleSuggestionAccept}
              accessibilityRole="button"
            >
              <Text style={styles.notifBtnText}>Ok, c'est parti !</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.notifBtn, styles.suggBtnOutline, pressed && styles.pressed]}
              onPress={handleSuggestionDecline}
              accessibilityRole="button"
            >
              <Text style={styles.suggBtnOutlineText}>Je conserve mon réglage</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Admin popup ── */}
      <Modal
        visible={!!adminTarget}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setAdminTarget(null)}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView style={StyleSheet.absoluteFill} intensity={20} tint="dark" />
        </View>
        <View style={styles.adminOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAdminTarget(null)} />
          <View style={styles.adminSheet} onStartShouldSetResponder={() => true}>
            {adminTarget && (() => {
              const Char = CHARACTER_MAP[adminTarget.character] ?? ChousSvg;
              return (
                <>
                  <View style={styles.adminPlayer}>
                    <View style={styles.adminAvatarWrap}>
                      <Char width={48} height={48} />
                    </View>
                    <Text style={styles.adminPseudo}>{adminTarget.pseudo}</Text>
                  </View>

                  <View style={styles.adminDivider} />

                  <Pressable
                    style={({ pressed }) => [styles.adminAction, pressed && styles.pressed]}
                    onPress={() => handleTransferHost(adminTarget)}
                  >
                    <Ionicons name="swap-horizontal-outline" size={18} color={palette.brandGreen} />
                    <Text style={[styles.adminActionText, { color: palette.brandGreen }]}>
                      Mettre chef du groupe
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.adminAction, pressed && styles.pressed]}
                    onPress={() => handleKickPlayer(adminTarget)}
                  >
                    <Ionicons name="exit-outline" size={18} color={palette.brandPink} />
                    <Text style={[styles.adminActionText, { color: palette.brandPink }]}>
                      Exclure du groupe
                    </Text>
                  </Pressable>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.closeChip, pressed && styles.pressed]}
            onPress={handleQuit}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Quitter"
          >
            <Ionicons name="close" size={18} color={palette.brandPink} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Paramètres"
          >
            <Ionicons name="settings-outline" size={28} color={palette.brandPink} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Title ── */}
          <Text style={styles.title}>{MODE_LABELS[game.mode]}</Text>

          {/* ── Code card ── */}
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Code de table</Text>
            <View style={styles.codeChip}>
              <Text style={styles.codeText}>{game.code}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Partager"
            >
              <Ionicons name="share-social-outline" size={20} color={palette.brandPink} />
            </Pressable>
          </View>

          {/* ── My featured card (editable pseudo) ── */}
          {myPlayer && <MyCard player={myPlayer} onSave={handlePseudoSave} />}

          {/* ── Convives grid ── */}
          <View style={styles.convivesSection}>
            <Text style={styles.convivesTitle}>Les convives</Text>
            <View style={styles.grid}>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.gridRow}>
                  {row.map((p, ci) =>
                    p ? (
                      <PlayerCard
                        key={p.id}
                        player={p}
                        isMe={false}
                        onAdminPress={myPlayer?.is_host ? () => setAdminTarget(p) : undefined}
                      />
                    ) : (
                      <View key={`e-${ri}-${ci}`} style={styles.slot} />
                    )
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* ── Footer button ── */}
        <View style={styles.footer}>
          {myPlayer?.is_host ? (
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                !canStart && styles.primaryBtnDisabled,
                pressed && styles.pressed,
              ]}
              onPress={handleStart}
              disabled={!canStart}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{startLabel}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                myPlayer?.is_ready ? styles.readyBtnDone : styles.readyBtn,
                pressed && styles.pressed,
              ]}
              onPress={handleReady}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>
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

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 8,
    paddingBottom: 4,
  },
  closeChip: {
    backgroundColor: 'rgba(255,20,134,0.1)',
    borderRadius: 60,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: { padding: 4 },

  // ── Scroll
  scroll: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 24,
  },

  // ── Title
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 38,
    color: palette.brandPink,
    textTransform: 'uppercase',
    lineHeight: 42,
    textAlign: 'center',
  },

  // ── Code card
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: palette.bgWhite,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    shadowColor: palette.shadowYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 44,
    elevation: 4,
  },
  codeLabel: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    lineHeight: 26,
    color: palette.brandGreen,
  },
  codeChip: {
    backgroundColor: 'rgba(255,20,134,0.1)',
    borderRadius: radius.chip,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  codeText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 24,
    color: palette.brandPink,
    letterSpacing: 4.8,
    opacity: 0.5,
  },

  // ── My featured card
  meCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    alignSelf: 'center',
  },
  meAvatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: palette.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
  },
  meNameChip: {
    backgroundColor: '#fff0f3',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meName: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    lineHeight: 20,
    color: palette.textPrimary,
  },
  meInput: {
    backgroundColor: '#fff0f3',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    color: palette.brandPink,
    minWidth: 120,
    borderBottomWidth: 1,
    borderBottomColor: palette.brandPink,
  },

  // ── Convives section
  convivesSection: {
    width: '100%',
    gap: 16,
    paddingTop: 12,
  },
  convivesTitle: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 22,
    color: palette.brandPink,
  },
  grid: { gap: 16 },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: COL_GAP,
    height: 123,
    alignItems: 'center',
  },

  // ── Grid player card
  slot: {
    width: SLOT_W,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  avatarRingMe: {
    borderColor: palette.brandPink,
  },
  avatarInner: {
    ...StyleSheet.absoluteFill,
    borderRadius: AVATAR_SIZE / 2 - 2,
    overflow: 'hidden',
  },
  tick: { position: 'absolute', right: -4, bottom: -4, width: 28, height: 28 },
  hostBadge: {
    position: 'absolute',
    right: 6,
    bottom: 4,
  },
  pseudoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 6,
  },
  pseudo: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 13,
    lineHeight: 16.9,
    color: palette.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },

  // ── Footer
  footer: { paddingHorizontal: 16, paddingBottom: spacing.small, paddingTop: 8 },
  primaryBtn: {
    backgroundColor: palette.brandGreen,
    borderRadius: radius.main,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.xsmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    lineHeight: 26,
    color: '#fff',
  },
  readyBtn: {
    backgroundColor: palette.brandPink,
    borderRadius: radius.main,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.xsmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyBtnDone: {
    backgroundColor: palette.brandGreen,
    borderRadius: radius.main,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.xsmall,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  pressed: { opacity: 0.8 },

  // ── Admin popup
  adminOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  adminSheet: {
    backgroundColor: palette.bgWhite,
    borderRadius: radius.main,
    width: '100%',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  adminPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  adminAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  adminPseudo: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 17,
    color: palette.textPrimary,
    flex: 1,
  },
  adminDivider: {
    height: 1,
    backgroundColor: palette.borderPeach,
    marginHorizontal: 20,
  },
  adminAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  adminActionText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
  },

  // ── Kicked / new-host notifications (shared layout)
  notifOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  notifCard: {
    backgroundColor: palette.bgWhite,
    borderRadius: radius.main,
    width: '100%',
    paddingHorizontal: 28,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  notifTitle: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    lineHeight: 38,
    color: palette.brandPink,
    textAlign: 'center',
    marginTop: 4,
  },
  notifBody: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 15,
    color: palette.textPrimary + '99',
    textAlign: 'center',
    marginBottom: 8,
  },
  notifBtn: {
    backgroundColor: palette.brandPink,
    borderRadius: radius.main,
    paddingHorizontal: 32,
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  notifBtnGreen: {
    backgroundColor: palette.brandGreen,
  },
  notifBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 17,
    color: '#fff',
  },
  suggBtnOutline: {
    backgroundColor: palette.bgWhite,
    borderWidth: 1.5,
    borderColor: palette.brandGreen,
  },
  suggBtnOutlineText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 17,
    color: palette.brandGreen,
  },

  // ── Round count notification
  roundNotifOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  roundNotifCard: {
    backgroundColor: palette.bgWhite,
    borderRadius: radius.main,
    width: '100%',
    paddingHorizontal: 32,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  roundNotifLabel: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 13,
    color: palette.textPrimary + '80',
    textAlign: 'center',
    marginTop: 6,
  },
  roundNotifCount: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 80,
    lineHeight: 84,
    color: palette.brandPink,
  },
  roundNotifSub: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 15,
    color: palette.textPrimary,
    textAlign: 'center',
  },
});
