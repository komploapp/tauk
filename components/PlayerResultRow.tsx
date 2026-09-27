import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { palette } from '@/constants/palette';

type SvgComponent = React.ComponentType<{ width?: number; height?: number }>;
type Trend = 'up' | 'down' | 'neutral';
type ChallengeStatus = 'done' | 'missed' | 'grille';

export type ChallengeResult = {
  id: string;
  text: string;
  status: ChallengeStatus;
  grilledBy?: string;
};

export type PlayerResult = {
  id: string;
  name: string;
  scoreDelta: number;
  trend: Trend;
  avatarBg: string;
  Character: SvgComponent;
  rankBadge: number;
  bonus?: { text: string; value: number }[];
  challenges?: ChallengeResult[];
};

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up')   return <Text style={styles.trendUp}>↑</Text>;
  if (trend === 'down') return <Text style={styles.trendDown}>↓</Text>;
  return <Text style={styles.trendNeutral}>—</Text>;
}

function BonusRow({ text, value }: { text: string; value: number }) {
  const label = value > 0 ? `+${value}` : String(value);
  return (
    <View style={styles.detailRow}>
      <View style={styles.bonusPill}>
        <Text style={styles.bonusPillText}>{text}</Text>
      </View>
      <Text style={styles.bonusScore}>{label}</Text>
    </View>
  );
}

function ChallengeRow({ challenge }: { challenge: ChallengeResult }) {
  const { status, text, grilledBy } = challenge;
  const isDone   = status === 'done';
  const isMissed = status === 'missed';
  const isGrille = status === 'grille';

  const textStyle = [
    styles.challengeText,
    isDone   && styles.challengeTextDone,
    isMissed && styles.challengeTextMissed,
    isGrille && styles.challengeTextGrille,
  ];

  return (
    <View style={styles.detailRow}>
      <View style={styles.challengeLeft}>
        <Text style={textStyle}>{text}</Text>
        {isGrille && grilledBy && (
          <View style={styles.grilleTag}>
            <Text style={styles.grilleTagText}>Grillé par {grilledBy}</Text>
          </View>
        )}
      </View>
      <View style={styles.detailIcon}>
        {isDone   && <Text style={styles.iconDone}>✓</Text>}
        {isMissed && <Text style={styles.iconMissed}>✕</Text>}
        {isGrille && <Text style={styles.iconGrille}>✕</Text>}
      </View>
    </View>
  );
}

export function PlayerResultRow({ player }: { player: PlayerResult }) {
  const [expanded, setExpanded] = useState(false);
  const { Character } = player;
  const hasDetails = !!(player.bonus?.length || player.challenges?.length);
  const scoreDeltaLabel = player.scoreDelta > 0 ? `+${player.scoreDelta}` : String(player.scoreDelta);

  return (
    <View style={styles.root}>
      {/* ── Header row ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TrendIcon trend={player.trend} />

          <View style={styles.avatarOuter}>
            <View style={[styles.avatar, { backgroundColor: player.avatarBg }]}>
              <Character width={48} height={48} />
            </View>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>{player.rankBadge}</Text>
            </View>
          </View>

          {hasDetails ? (
            <Pressable
              style={styles.nameBtn}
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole="button"
            >
              <Text style={styles.nameExpandable}>{player.name}</Text>
              <Text style={styles.caret}>{expanded ? '▲' : '▾'}</Text>
            </Pressable>
          ) : (
            <Text style={styles.name}>{player.name}</Text>
          )}
        </View>

        <Text style={styles.delta}>{scoreDeltaLabel}</Text>
      </View>

      {/* ── Expanded detail rows ── */}
      {expanded && (
        <View>
          {player.bonus?.map((b) => (
            <BonusRow key={b.text} text={b.text} value={b.value} />
          ))}
          {player.challenges?.map((c) => (
            <ChallengeRow key={c.id} challenge={c} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },

  // ─── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,251,250,0.9)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ffdac7',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  // ─── Trend icons ──────────────────────────────────────────────────────────
  trendUp: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 14,
    color: palette.brandGreen,
    width: 14,
    textAlign: 'center',
  },
  trendDown: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 14,
    color: '#ff3624',
    width: 14,
    textAlign: 'center',
  },
  trendNeutral: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 16,
    color: '#ff7214',
    width: 14,
    textAlign: 'center',
  },

  // ─── Avatar ───────────────────────────────────────────────────────────────
  avatarOuter: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
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
    lineHeight: 14,
    textAlign: 'center',
  },

  // ─── Name ─────────────────────────────────────────────────────────────────
  nameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  nameExpandable: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    color: palette.brandPink,
  },
  name: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    color: palette.textPrimary,
    flex: 1,
  },
  caret: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    color: palette.brandPink,
  },

  // ─── Score delta ──────────────────────────────────────────────────────────
  delta: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 16,
    color: palette.brandGreen,
    textAlign: 'right',
  },

  // ─── Detail rows (shared layout) ──────────────────────────────────────────
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 24,
    backgroundColor: '#fffbfa',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#ffdac7',
  },

  // ─── Bonus row ────────────────────────────────────────────────────────────
  bonusPill: {
    flexShrink: 1,
    backgroundColor: palette.brandPink,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  bonusPillText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    color: '#ffffff',
  },
  bonusScore: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 16,
    color: palette.brandPink,
    textAlign: 'right',
  },

  // ─── Challenge rows ───────────────────────────────────────────────────────
  challengeLeft: {
    flex: 1,
    gap: 8,
  },
  challengeText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  challengeTextDone:   { color: palette.brandGreen },
  challengeTextMissed: { color: '#858585' },
  challengeTextGrille: { color: '#ce8b08' },
  detailIcon: {
    width: 20,
    alignItems: 'center',
  },
  iconDone: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 16,
    color: palette.brandGreen,
  },
  iconMissed: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 14,
    color: '#858585',
  },
  iconGrille: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 14,
    color: '#ce8b08',
  },
  grilleTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#f6a912',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  grilleTagText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    color: '#ffffff',
  },
});
