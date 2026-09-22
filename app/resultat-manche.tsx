import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { palette } from '@/constants/palette';
import { PlayerResultRow, type PlayerResult } from '@/components/PlayerResultRow';
import { ToqueBackground } from '@/components/ToqueBackground';

import ChousSvg from '@/assets/images/personnages/character-choux.svg';
import EggSvg from '@/assets/images/personnages/character-egg.svg';
import AvocadoSvg from '@/assets/images/personnages/character-avocado.svg';
import PoivronSvg from '@/assets/images/personnages/character-poivron.svg';
import BananaSvg from '@/assets/images/personnages/character-banana.svg';
import ReadySvg from '@/assets/images/ready.svg';

type SvgComponent = React.ComponentType<{ width?: number; height?: number }>;

type PodiumPlayer = {
  id: string;
  name: string;
  roundScore: number;
  avatarBg: string;
  rank: 1 | 2 | 3;
  Character: SvgComponent;
  isWinner?: boolean;
};

const WINNER_NAME = 'Chef Saucissier';

const PODIUM: PodiumPlayer[] = [
  { id: '1', name: 'Chef Saucissier', roundScore: 6, avatarBg: '#ffc014', rank: 1, Character: ChousSvg, isWinner: true },
  { id: '2', name: 'Chef Saucissier', roundScore: 6, avatarBg: '#ff7214', rank: 2, Character: PoivronSvg },
  { id: '3', name: 'Chef Saucissier', roundScore: 6, avatarBg: '#ffe014', rank: 3, Character: AvocadoSvg },
];

const LIST_PLAYERS: PlayerResult[] = [
  {
    id: '1', name: 'Chef Saucissier', scoreDelta: 3, trend: 'up',
    avatarBg: '#ffc014', Character: ChousSvg, rankBadge: 1,
    bonus: { text: 'Bonus : à été accusé à tord par Marc', value: 1 },
    challenges: [
      { id: 'c1', text: "Faire rire quelqu'un sans parler", status: 'done' },
      { id: 'c2', text: 'Dire un mot en espagnol', status: 'done' },
      { id: 'c3', text: 'Imiter un animal', status: 'missed' },
      { id: 'c4', text: 'Chanter une note', status: 'grille', grilledBy: 'Marcoche' },
    ],
  },
  { id: '2', name: 'Marcoche',       scoreDelta: 1, trend: 'down',    avatarBg: '#14e8ff', Character: EggSvg,     rankBadge: 2 },
  { id: '3', name: 'Bananette',      scoreDelta: -1, trend: 'neutral', avatarBg: '#ff5b14', Character: BananaSvg,  rankBadge: 3 },
  { id: '4', name: 'Poivrot',        scoreDelta: 2, trend: 'up',      avatarBg: '#14ff3c', Character: PoivronSvg, rankBadge: 4 },
  { id: '5', name: 'Avocat Maître',  scoreDelta: 1, trend: 'up',      avatarBg: '#ffe014', Character: AvocadoSvg, rankBadge: 5 },
];

function ScoreChip({ score }: { score: number }) {
  const label = score > 0 ? `+${score}` : String(score);
  return (
    <View style={styles.scoreChip}>
      <Text style={styles.scoreChipText}>{label}</Text>
    </View>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankBadgeText}>{rank}</Text>
    </View>
  );
}

function PodiumCard({ player, lower = false }: { player: PodiumPlayer; lower?: boolean }) {
  const { Character } = player;
  return (
    <View style={[styles.podiumCard, lower && styles.podiumCardLower]}>
      {/* Avatar + rank badge */}
      <View style={styles.podiumAvatarOuter}>
        <View style={[styles.podiumAvatar, { backgroundColor: player.avatarBg }]}>
          <Character width={74} height={74} />
          {player.isWinner && (
            <View style={styles.tickInAvatar}>
              <ReadySvg width={24} height={24} />
            </View>
          )}
        </View>
        <RankBadge rank={player.rank} />
      </View>
      {/* Name + score */}
      <Text style={styles.podiumName}>{player.name}</Text>
      <ScoreChip score={player.roundScore} />
    </View>
  );
}


export default function ResultatMancheScreen() {
  return (
    <View style={styles.root}>
      <ToqueBackground />
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
            <Pressable style={styles.backBtn} onPress={() => router.replace('/game')} accessibilityRole="button" accessibilityLabel="Retour">
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

          {/* Titre */}
          <Text style={styles.title}>Bravo {WINNER_NAME} !</Text>

          {/* Podium */}
          <View style={styles.podium}>
            {/* 1ère place — centré en haut */}
            <PodiumCard player={PODIUM[0]} />

            {/* 2e et 3e — ligne en dessous */}
            <View style={styles.podiumRow}>
              <PodiumCard player={PODIUM[1]} />
              <PodiumCard player={PODIUM[2]} lower />
            </View>
          </View>
        </SafeAreaView>

        {/* ── Section basse — liste joueurs ── */}
        <View style={styles.listSection}>
          {LIST_PLAYERS.map((player) => (
            <PlayerResultRow key={player.id} player={player} />
          ))}
        </View>
      </ScrollView>

      {/* ── Bouton fixe "Manche suivante" ── */}
      <SafeAreaView style={styles.buttonSafe} edges={['bottom']} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
          onPress={() => router.push('/resultat-partie')}
          accessibilityRole="button"
        >
          <Text style={styles.nextBtnText}>Manche suivante</Text>
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
  podiumAvatarOuter: {
    position: 'relative',
  },
  podiumAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: 'hidden',
  },
  tickInAvatar: {
    position: 'absolute',
    left: 50,
    top: 50,
    width: 24,
    height: 24,
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

  // ─── Rank badge ───────────────────────────────────────────────────────────
  rankBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
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
  nextBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: '#ffffff',
  },
});
