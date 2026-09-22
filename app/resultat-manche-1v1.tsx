import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { palette } from '@/constants/palette';
import { PlayerResultRow, type PlayerResult } from '@/components/PlayerResultRow';
import { ToqueBackground } from '@/components/ToqueBackground';

import ChousSvg from '@/assets/images/personnages/character-choux.svg';
import EggSvg from '@/assets/images/personnages/character-egg.svg';

type SvgComponent = React.ComponentType<{ width?: number; height?: number }>;

type WinnerPlayer = {
  id: string;
  name: string;
  totalScore: number;
  avatarBg: string;
  Character: SvgComponent;
};

const WINNER: WinnerPlayer = {
  id: '1',
  name: 'Chef Saucissier',
  totalScore: 6,
  avatarBg: '#ffc014',
  Character: ChousSvg,
};

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
  {
    id: '2', name: 'Marcoche', scoreDelta: 1, trend: 'down',
    avatarBg: '#14e8ff', Character: EggSvg, rankBadge: 2,
  },
];

function ScoreChip({ score }: { score: number }) {
  const label = score > 0 ? `+${score}` : String(score);
  return (
    <View style={styles.scoreChip}>
      <Text style={styles.scoreChipText}>{label}</Text>
    </View>
  );
}

function WinnerBlock({ player }: { player: WinnerPlayer }) {
  const { Character } = player;
  return (
    <View style={styles.winnerBlock}>
      {/* Avatar 111×111 */}
      <View style={styles.winnerAvatarOuter}>
        <View style={[styles.winnerAvatar, { backgroundColor: player.avatarBg }]}>
          <Character width={111} height={111} />
        </View>
      </View>

      {/* Name + score */}
      <View style={styles.winnerInfo}>
        <Text style={styles.winnerName}>{player.name}</Text>
        <ScoreChip score={player.totalScore} />
      </View>
    </View>
  );
}

export default function ResultatManche1v1Screen() {
  return (
    <View style={styles.root}>
      <ToqueBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Section haute — gagnant ── */}
        <SafeAreaView style={styles.topSection} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={styles.backBtn}
              onPress={() => router.replace('/game')}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
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
          <Text style={styles.title}>Bravo {WINNER.name} !</Text>

          {/* Bloc gagnant */}
          <WinnerBlock player={WINNER} />
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
    paddingBottom: 48,
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

  // ─── Bloc gagnant ─────────────────────────────────────────────────────────
  winnerBlock: {
    alignItems: 'center',
    gap: 12,
  },
  winnerAvatarOuter: {
    // Extra wrapper allows future external badges without clipping
  },
  winnerAvatar: {
    width: 111,
    height: 111,
    borderRadius: 55.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerInfo: {
    alignItems: 'center',
    gap: 4,
  },
  winnerName: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 18,
    color: palette.textPrimary,
    textAlign: 'center',
  },

  // ─── Score chip ───────────────────────────────────────────────────────────
  scoreChip: {
    backgroundColor: '#fcfdfd',
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    shadowColor: 'rgba(71,21,0,0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 66,
    shadowOpacity: 1,
    elevation: 2,
  },
  scoreChipText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 18,
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
  nextBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: '#ffffff',
  },
});
