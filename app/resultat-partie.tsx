import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { palette } from '@/constants/palette';
import { PlayerResultRow, type PlayerResult } from '@/components/PlayerResultRow';
import { ToqueBackground } from '@/components/ToqueBackground';

import AvocadoSvg  from '@/assets/images/personnages/character-avocado.svg';
import OnionSvg    from '@/assets/images/personnages/character-onion.svg';
import ChousSvg    from '@/assets/images/personnages/character-choux.svg';
import EggSvg      from '@/assets/images/personnages/character-egg.svg';
import BananaSvg   from '@/assets/images/personnages/character-banana.svg';
import PoivronSvg  from '@/assets/images/personnages/character-poivron.svg';

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

// ── Positions absolues tirées du Figma (référentiel : section rose, 393 px large) ──
const PLATFORM_FIRST  = { left: 120, top: 235, width: 154, height: 245 } as const;
const PLATFORM_SECOND = { left:   1, top: 322, width: 154, height: 158 } as const;
const PLATFORM_THIRD  = { left: 233, top: 370, width: 156, height: 110 } as const;

const CARD_FIRST  = { left: 135, top: 168 } as const;
const CARD_SECOND = { left:  10, top: 274 } as const;
const CARD_THIRD  = { left: 258, top: 309 } as const;

const BADGE_FIRST  = { left: 216, top: 238 } as const;
const BADGE_SECOND = { left:  89, top: 327 } as const;
const BADGE_THIRD  = { left: 338, top: 362 } as const;

// Hauteur de la zone podium (plateforme la plus basse : top 370 + height 110 = 480)
const PODIUM_HEIGHT = 480;
const CARD_WIDTH    = 126;

const PODIUM: PodiumPlayer[] = [
  { id: '1', name: 'Master Zgeg',    totalScore: 26, avatarBg: '#ffe014', Character: AvocadoSvg, chipColor: '#fec20a', chipFullWidth: true  },
  { id: '2', name: 'Chef Saucisee',  totalScore: 26, avatarBg: '#fbff14', Character: OnionSvg,   chipColor: '#a297b5', chipFullWidth: false },
  { id: '3', name: 'Chef Saucisse',  totalScore: 26, avatarBg: '#ffc014', Character: ChousSvg,   chipColor: '#884730', chipFullWidth: false },
];

const LIST_PLAYERS: PlayerResult[] = [
  {
    id: '1', name: 'Chef Saucissier', scoreDelta: 1, trend: 'up',
    avatarBg: '#fbff14', Character: OnionSvg, rankBadge: 1,
    bonus: { text: 'Bonus : à été accusé à tord par Marc', value: 1 },
    challenges: [
      { id: 'c1', text: "Faire rire quelqu'un sans parler", status: 'done' },
      { id: 'c2', text: 'Dire un mot en espagnol', status: 'done' },
      { id: 'c3', text: 'Imiter un animal', status: 'missed' },
      { id: 'c4', text: 'Chanter une note', status: 'grille', grilledBy: 'Marcoche' },
    ],
  },
  { id: '2', name: 'Chef Saucissier', scoreDelta: 1, trend: 'down',    avatarBg: '#14e8ff', Character: EggSvg,     rankBadge: 2 },
  { id: '3', name: 'Chef Saucissier', scoreDelta: 1, trend: 'neutral', avatarBg: '#ff5b14', Character: BananaSvg,  rankBadge: 3 },
  { id: '4', name: 'Chef Saucissier', scoreDelta: 1, trend: 'up',      avatarBg: '#14ff3c', Character: PoivronSvg, rankBadge: 4 },
  { id: '5', name: 'Chef Saucissier', scoreDelta: 1, trend: 'up',      avatarBg: '#ffc014', Character: ChousSvg,   rankBadge: 5 },
];

function RankBadge({ children }: { children: number }) {
  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankBadgeText}>{children}</Text>
    </View>
  );
}

function PodiumCard({ player, cardPos }: { player: PodiumPlayer; cardPos: typeof CARD_FIRST }) {
  const { Character } = player;
  return (
    <View style={[styles.podiumCard, { left: cardPos.left, top: cardPos.top }]}>
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
  return (
    <View style={styles.root}>
      <ToqueBackground />
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
            <View style={styles.header}>
              <Pressable style={styles.backBtn} onPress={() => router.replace('/')} accessibilityRole="button" accessibilityLabel="Retour">
                <Text style={styles.backBtnText}>{'<'}</Text>
              </Pressable>
              <Pressable
                style={styles.settingsBtn}
                onPress={() => router.replace('/')}
                accessibilityRole="button"
                accessibilityLabel="Quitter"
              >
                <Text style={styles.settingsBtnText}>✕</Text>
              </Pressable>
            </View>
          </SafeAreaView>

          {/* Titre */}
          <Text style={styles.title}>Leaderbord !</Text>

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
          <PodiumCard player={PODIUM[1]} cardPos={CARD_SECOND} />
          <PodiumCard player={PODIUM[2]} cardPos={CARD_THIRD} />
          <PodiumCard player={PODIUM[0]} cardPos={CARD_FIRST} />

          {/* ── Badges de rang (absolus) ── */}
          <View style={[styles.rankBadge, BADGE_SECOND]} pointerEvents="none">
            <Text style={styles.rankBadgeText}>2</Text>
          </View>
          <View style={[styles.rankBadge, BADGE_THIRD]} pointerEvents="none">
            <Text style={styles.rankBadgeText}>3</Text>
          </View>
          <View style={[styles.rankBadge, BADGE_FIRST]} pointerEvents="none">
            <Text style={styles.rankBadgeText}>1</Text>
          </View>
        </View>

        {/* ── Section liste joueurs ── */}
        <View style={styles.listSection}>
          {/* Premier rang avec padding top supplémentaire */}
          <View style={styles.firstRowWrapper}>
            <PlayerResultRow player={LIST_PLAYERS[0]} />
          </View>
          {LIST_PLAYERS.slice(1).map((player) => (
            <PlayerResultRow key={player.id} player={player} />
          ))}
        </View>
      </ScrollView>

      {/* ── Boutons fixes ── */}
      <SafeAreaView style={styles.buttonSafe} edges={['bottom']} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
        >
          <Text style={styles.nextBtnText}>Nouvelle partie</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.menuBtn, pressed && styles.menuBtnPressed]}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
        >
          <Text style={styles.menuBtnText}>Retour menu principal</Text>
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
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 60,
    backgroundColor: '#ffe1ea',
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
    backgroundColor: 'rgba(255,20,134,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: {
    fontSize: 16,
    color: palette.brandPink,
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
  nextBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: '#ffffff',
  },
  menuBtn: {
    height: 47,
    backgroundColor: 'transparent',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnPressed: {
    opacity: 0.6,
  },
  menuBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    color: palette.brandPink,
  },
});
