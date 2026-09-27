import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/palette';
import { useStore } from '@/store';
import type { Character, Round } from '@/store';
import { supabase } from '@/lib/supabase';
import { loadPlayers, loadRoundResults, createRound } from '@/lib/game';
import { PlayerResultRow, type PlayerResult } from '@/components/PlayerResultRow';
import { ToqueBackground } from '@/components/ToqueBackground';
import { GameMenu } from '@/components/GameMenu';

import ChousSvg      from '@/assets/images/personnages/character-choux.svg';
import AvocadoSvg    from '@/assets/images/personnages/character-avocado.svg';
import Onion1Svg     from '@/assets/images/personnages/character-onion-1.svg';
import CarotSvg      from '@/assets/images/personnages/character-carot.svg';
import BananaSvg     from '@/assets/images/personnages/character-banana.svg';
import PotatoesSvg   from '@/assets/images/personnages/character-potatoes.svg';
import PoivronSvg    from '@/assets/images/personnages/character-poivron.svg';
import AubergineSvg  from '@/assets/images/personnages/character-aubergine.svg';
import MushroomSvg   from '@/assets/images/personnages/character-mushroom.svg';

import Podium1Svg from '@/assets/images/podium-1.svg';
import Podium2Svg from '@/assets/images/podium-2.svg';
import Podium3Svg from '@/assets/images/podium-3.svg';

type SvgComponent = React.ComponentType<{ width?: number; height?: number }>;

type PodiumPlayer = {
  id: string;
  name: string;
  totalScore: number;
  avatarBg: string;
  Character: SvgComponent;
  chipColor: string;
  chipFullWidth: boolean;
};

const CHARACTER_SVG: Record<Character, SvgComponent> = {
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
  choux:     '#d4f0c8',
  avocado:   '#c8e6a0',
  onion:     '#f5e6ff',
  carot:     '#ffdbb5',
  banana:    '#fff3a3',
  potatoes:  '#e8d5b0',
  poivron:   '#ffb3b3',
  aubergine: '#d4a8e8',
  mushroom:  '#ddd9d9',
};

const PODIUM_CHIP_COLORS = ['#fec20a', '#a297b5', '#884730'] as const;

// ── Positions absolues tirées du Figma (référentiel : section rose, 393 px large) ──
const PLATFORM_FIRST  = { left: 120, top: 235, width: 154, height: 245 } as const;
const PLATFORM_SECOND = { left:   1, top: 322, width: 154, height: 158 } as const;
const PLATFORM_THIRD  = { left: 233, top: 370, width: 156, height: 110 } as const;

const CARD_FIRST  = { left: 135, top: 168 } as const;
const CARD_SECOND = { left:  10, top: 274 } as const;
const CARD_THIRD  = { left: 258, top: 309 } as const;

const BADGE_FIRST  = { left: 216, top: 221 } as const;
const BADGE_SECOND = { left:  89, top: 327 } as const;
const BADGE_THIRD  = { left: 338, top: 362 } as const;

// Hauteur de la zone podium (plateforme la plus basse : top 370 + height 110 = 480)
const PODIUM_HEIGHT = 480;
const CARD_WIDTH    = 126;


function RankBadge({ children }: { children: number }) {
  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankBadgeText}>{children}</Text>
    </View>
  );
}

function PodiumCard({ player, cardPos, inactive = false }: { player: PodiumPlayer; cardPos: typeof CARD_FIRST; inactive?: boolean }) {
  const { Character } = player;
  return (
    <View style={[styles.podiumCard, { left: cardPos.left, top: cardPos.top }, inactive && styles.playerInactive]}>
      {/* Avatar */}
      <View style={[styles.podiumAvatar, { backgroundColor: player.avatarBg }]}>
        <Character width={76} height={76} />
      </View>

      {/* Name chip */}
      <View style={styles.nameChip}>
        <Text style={styles.nameChipText} numberOfLines={1}>{player.name}</Text>
      </View>

      {/* Score chip */}
      <View style={[
        styles.scoreChip,
        { backgroundColor: player.chipColor },
        player.chipFullWidth ? styles.scoreChipFull : styles.scoreChipFixed,
      ]}>
        <Text style={styles.scoreChipText}>{player.totalScore}</Text>
      </View>
    </View>
  );
}

export default function ResultatPartieScreen() {
  const [menuVisible, setMenuVisible] = useState(false);
  const { game, myPlayer, currentRound, setCurrentRound, leftPlayerIds: storeLeftIds, leftPlayers: storeLeftPlayers, addLeftPlayerId } = useStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const leftPlayerIds = new Set(storeLeftIds);
  const [isContinueReady, setIsContinueReady] = useState(false);
  const [podiumPlayers, setPodiumPlayers] = useState<PodiumPlayer[]>([]);
  const [listPlayers, setListPlayers] = useState<PlayerResult[]>([]);

  useEffect(() => {
    if (!game?.id) return;
    const gameId = game.id;

    Promise.all([
      loadPlayers(gameId),
      supabase.from('rounds').select('id, round_number').eq('game_id', gameId).order('round_number'),
    ]).then(async ([activePlayers, { data: rounds }]) => {
      // Fusionner joueurs actifs + joueurs partis (stockés dans Zustand) pour roster complet
      const { leftPlayers: departed } = useStore.getState();
      const freshPlayers = [
        ...activePlayers,
        ...departed.filter((lp) => !activePlayers.some((ap) => ap.id === lp.id)),
      ];
      const roundResults = await Promise.all(
        (rounds ?? []).map((r) => loadRoundResults(r.id)),
      );

      // Score de chaque joueur par manche, source unique de vérité
      const enriched = freshPlayers.map((player) => {
        const perRound = (rounds ?? []).map((r, i) => {
          const res = roundResults[i];
          const tasks = res?.tasksByPlayer[player.id] ?? [];
          const falseAcc = res?.accusations.find(
            (a) => a.accused_id === player.id && a.result === 'denied',
          );
          const confirmedAcc = res?.accusations.find(
            (a) => a.accuser_id === player.id && a.result === 'confirmed',
          );
          return {
            roundNumber: r.round_number,
            score: tasks.filter((t) => t.status === 'done').length
              + (falseAcc ? 1 : 0)
              + (confirmedAcc ? 1 : 0),
          };
        });
        return { player, perRound, totalScore: perRound.reduce((s, r) => s + r.score, 0) };
      });

      const sorted = [...enriched].sort((a, b) => b.totalScore - a.totalScore);

      setPodiumPlayers(sorted.slice(0, 3).map(({ player, totalScore }, i) => ({
        id: player.id,
        name: player.pseudo,
        totalScore,
        avatarBg: CHARACTER_BG[player.character],
        Character: CHARACTER_SVG[player.character] ?? ChousSvg,
        chipColor: PODIUM_CHIP_COLORS[i] ?? '#888888',
        chipFullWidth: i === 0,
      })));

      setListPlayers(sorted.map(({ player, perRound, totalScore }, index) => ({
        id: player.id,
        name: player.pseudo,
        scoreDelta: totalScore,
        trend: (totalScore > 0 ? 'up' : totalScore < 0 ? 'down' : 'neutral') as const,
        avatarBg: CHARACTER_BG[player.character],
        Character: CHARACTER_SVG[player.character] ?? ChousSvg,
        rankBadge: index + 1,
        bonus: perRound.map((r) => ({
          text: `Service ${r.roundNumber}`,
          value: r.score,
        })),
      })));
    }).catch(() => {});
  }, [game?.id]);

  // ── Canal Realtime : round INSERT (canal dédié pour éviter le conflit avec lobby-${gameId}) ──
  useEffect(() => {
    if (!game?.id) return;
    const gameId = game.id;

    const channel = supabase
      .channel(`resultat-${gameId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rounds', filter: `game_id=eq.${gameId}` },
        (payload) => { setCurrentRound(payload.new as Round); router.replace('/prepa'); },
      )
      .subscribe();

    channelRef.current = channel;
    return () => { channelRef.current = null; supabase.removeChannel(channel); };
  }, [game?.id]);

  // ── Canal Realtime : joueurs qui quittent depuis l'écran résultat ──
  useEffect(() => {
    if (!game?.id || !myPlayer?.id) return;
    const gameId = game.id;
    const myId = myPlayer.id;

    const channel = supabase
      .channel(`results-${gameId}`)
      .on('broadcast', { event: 'player_left' }, ({ payload }) => {
        const departedId: string | undefined = (payload as { playerId?: string })?.playerId;
        if (!departedId || departedId === myId) return;
        addLeftPlayerId(departedId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [game?.id, myPlayer?.id]);

  async function handleContinue() {
    if (!game?.id) return;
    if (myPlayer?.is_host) {
      const nextRoundNumber = (currentRound?.round_number ?? 0) + 1;
      try {
        const round = await createRound(game.id, nextRoundNumber);
        setCurrentRound(round);
        router.replace('/prepa');
      } catch { /* navigation par INSERT Realtime en fallback */ }
    } else {
      setIsContinueReady(true);
      channelRef.current?.send({ type: 'broadcast', event: 'player_continue_ready', payload: { playerId: myPlayer?.id } });
    }
  }

  return (
    <View style={styles.root}>
      <ToqueBackground />
      <GameMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Section rose — podium ── */}
        <View style={styles.topSection}>
          {/* Header (SafeAreaView pour encoches) */}
          <SafeAreaView edges={['top']} style={styles.headerSafe}>
            <View style={[styles.header, styles.headerRight]}>
              <Pressable style={styles.iconBtn} onPress={() => setMenuVisible(true)} accessibilityRole="button" accessibilityLabel="Options">
                <Ionicons name="settings-outline" size={20} color={palette.brandPink} />
              </Pressable>
            </View>
          </SafeAreaView>

          {/* Titre */}
          <Text style={styles.title}>L'ADDITION !</Text>

          {/* ── Plateformes podium (absolues) ── */}
          <View style={{ position: 'absolute', ...PLATFORM_SECOND }} pointerEvents="none">
            <Podium2Svg width={PLATFORM_SECOND.width} height={PLATFORM_SECOND.height} />
          </View>
          <View style={{ position: 'absolute', ...PLATFORM_THIRD }} pointerEvents="none">
            <Podium3Svg width={PLATFORM_THIRD.width} height={PLATFORM_THIRD.height} />
          </View>
          <View style={{ position: 'absolute', ...PLATFORM_FIRST }} pointerEvents="none">
            <Podium1Svg width={PLATFORM_FIRST.width} height={PLATFORM_FIRST.height} />
          </View>

          {/* ── Cartes joueurs (absolues) ── */}
          {podiumPlayers[1] && <PodiumCard player={podiumPlayers[1]} cardPos={CARD_SECOND} inactive={leftPlayerIds.has(podiumPlayers[1].id)} />}
          {podiumPlayers[2] && <PodiumCard player={podiumPlayers[2]} cardPos={CARD_THIRD}  inactive={leftPlayerIds.has(podiumPlayers[2].id)} />}
          {podiumPlayers[0] && <PodiumCard player={podiumPlayers[0]} cardPos={CARD_FIRST}  inactive={leftPlayerIds.has(podiumPlayers[0].id)} />}

          {/* ── Badges de rang (absolus) ── */}
          {podiumPlayers[1] && (
            <View style={[styles.rankBadge, BADGE_SECOND]} pointerEvents="none">
              <Text style={styles.rankBadgeText}>2</Text>
            </View>
          )}
          {podiumPlayers[2] && (
            <View style={[styles.rankBadge, BADGE_THIRD]} pointerEvents="none">
              <Text style={styles.rankBadgeText}>3</Text>
            </View>
          )}
          {podiumPlayers[0] && (
            <View style={[styles.rankBadge, BADGE_FIRST]} pointerEvents="none">
              <Text style={styles.rankBadgeText}>1</Text>
            </View>
          )}
        </View>

        {/* ── Section liste joueurs ── */}
        <View style={styles.listSection}>
          {listPlayers.map((player, i) => (
            <View
              key={player.id}
              style={[
                i === 0 ? styles.firstRowWrapper : undefined,
                leftPlayerIds.has(player.id) && styles.playerInactive,
              ]}
            >
              <PlayerResultRow player={player} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Boutons fixes ── */}
      <SafeAreaView style={styles.buttonSafe} edges={['bottom']} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [
            styles.nextBtn,
            isContinueReady && !myPlayer?.is_host && styles.nextBtnReady,
            pressed && styles.nextBtnPressed,
          ]}
          onPress={handleContinue}
          disabled={isContinueReady && !myPlayer?.is_host}
          accessibilityRole="button"
        >
          <Text style={styles.nextBtnText}>
            {isContinueReady && !myPlayer?.is_host ? 'Prêt ✓' : 'Continuer'}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.menuBtn, pressed && styles.menuBtnPressed]}
          onPress={() => {
            if (game?.id && myPlayer?.id) {
              supabase.channel(`results-${game.id}`).send({
                type: 'broadcast',
                event: 'player_left',
                payload: { playerId: myPlayer.id },
              }).catch(() => {});
            }
            router.replace('/host');
          }}
          accessibilityRole="button"
        >
          <Text style={styles.menuBtnText}>Retour au salon</Text>
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
    paddingBottom: 130,
  },

  // ─── Section rose ─────────────────────────────────────────────────────────
  topSection: {
    height: PODIUM_HEIGHT,
    width: '100%',
    backgroundColor: '#fff4f0',
  },
  headerSafe: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  headerRight: {
    justifyContent: 'flex-end',
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
    marginTop: 12,
  },

  // ─── Carte podium ─────────────────────────────────────────────────────────
  podiumCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    alignItems: 'center',
    gap: 6,
  },
  podiumAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameChip: {
    width: '100%',
    backgroundColor: '#fcfdfd',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    shadowColor: 'rgba(71,21,0,0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 66,
    shadowOpacity: 1,
    elevation: 2,
  },
  nameChipText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    color: palette.textPrimary,
    textAlign: 'center',
  },
  scoreChip: {
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(71,21,0,0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 66,
    shadowOpacity: 1,
    elevation: 2,
  },
  scoreChipFull: {
    width: '100%',
  },
  scoreChipFixed: {
    width: 56,
  },
  scoreChipText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
  },

  // ─── Badge de rang ────────────────────────────────────────────────────────
  rankBadge: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 11,
    color: '#fffbfb',
    textAlign: 'center',
    lineHeight: 14,
  },

  // ─── Joueur inactif / parti ───────────────────────────────────────────────
  playerInactive: {
    opacity: 0.4,
  },

  // ─── Liste joueurs ────────────────────────────────────────────────────────
  listSection: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  firstRowWrapper: {},

  // ─── Bouton ───────────────────────────────────────────────────────────────
  buttonSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 26,
    paddingBottom: 16,
    gap: 8,
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
  nextBtnReady: {
    opacity: 0.65,
  },
  nextBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: '#ffffff',
  },
  menuBtn: {
    height: 47,
    backgroundColor: '#FFF8F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnPressed: {
    opacity: 0.6,
  },
  menuBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: palette.brandPink,
  },
});
