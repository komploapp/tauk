import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ToqueBackground } from '@/components/ToqueBackground';
import { palette, spacing } from '@/constants/palette';
import { loadMyTasks } from '@/lib/game';
import { useStore } from '@/store';

function Bullet() {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletRow}>
        <View style={styles.bulletDot} />
        <View style={styles.bulletDot} />
        <View style={styles.bulletDot} />
      </View>
      <View style={styles.bulletRow}>
        <View style={styles.bulletDot} />
        <View style={styles.bulletDot} />
        <View style={styles.bulletDot} />
      </View>
    </View>
  );
}

function ChallengeItem({ text }: { text: string }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.challengeItem, pressed && styles.pressed]}
      onPress={() => router.replace('/game')}
      accessibilityRole="button"
    >
      <Bullet />
      <Text style={styles.challengeText}>{text}</Text>
    </Pressable>
  );
}

export default function PrepaScreen() {
  const { currentRound, myPlayer, myTasks, setMyTasks } = useStore();

  useEffect(() => {
    if (!currentRound?.id || !myPlayer?.id) return;
    loadMyTasks(currentRound.id, myPlayer.id).then(setMyTasks);
  }, [currentRound?.id, myPlayer?.id]);

  const roundNumber = currentRound?.round_number ?? 1;

  return (
    <View style={styles.root}>
      <ToqueBackground />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <View style={styles.header}>
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
                onPress={() => router.replace('/')}
                accessibilityRole="button"
                accessibilityLabel="Quitter"
              >
                <Text style={styles.settingsBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.heading}>Découvre la recette...</Text>
            <Text style={styles.roundNumber}>{roundNumber}</Text>

            {myTasks.length > 0 && (
              <View style={styles.firstChallengeCard}>
                <View style={styles.firstChallengeHighlight} />
                <Text style={styles.firstChallengeText}>{myTasks[0].task_text}</Text>
              </View>
            )}
          </View>

          <View style={styles.challengeList}>
            {myTasks.length === 0 ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={palette.brandPink} />
                <Text style={styles.loadingText}>Chargement des défis...</Text>
              </View>
            ) : (
              myTasks.map((task) => (
                <ChallengeItem key={task.id} text={task.task_text} />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgWhite },
  safeArea: { flex: 1, zIndex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  topSection: {
    backgroundColor: '#fff5f1',
    paddingHorizontal: spacing.small,
    paddingTop: 8, paddingBottom: 48, gap: 36,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  heading: {
    fontFamily: 'Staatliches_400Regular', fontSize: 38,
    color: palette.brandGreen, textTransform: 'uppercase', lineHeight: 40,
  },
  roundNumber: {
    fontFamily: 'Recursive_600SemiBold', fontSize: 54,
    lineHeight: 54, color: palette.brandPink, textAlign: 'center',
  },
  firstChallengeCard: {
    backgroundColor: palette.bgWhite, borderRadius: 4,
    paddingHorizontal: spacing.small, paddingVertical: 8,
    shadowColor: 'rgba(71, 21, 0, 0.06)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 44, elevation: 3, overflow: 'hidden',
  },
  firstChallengeHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderTopWidth: 3, borderLeftWidth: 3, borderColor: 'rgba(89, 8, 50, 0.04)', borderRadius: 4,
  },
  firstChallengeText: {
    fontFamily: 'Recursive_600SemiBold', fontSize: 22, color: palette.brandPink, textAlign: 'center',
  },

  challengeList: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: palette.borderPeach },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 32, justifyContent: 'center' },
  loadingText: { fontFamily: 'Recursive_400Regular', fontSize: 16, color: palette.brandPink, opacity: 0.6 },
  challengeItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.medium,
    paddingHorizontal: spacing.small, paddingVertical: 28,
    backgroundColor: 'rgba(255, 251, 250, 0.9)',
    borderBottomWidth: 1, borderColor: palette.borderPeach,
  },
  challengeText: { flex: 1, fontFamily: 'Recursive_400Regular', fontSize: 16, color: palette.textPrimary },
  bullet: { gap: 2, flexShrink: 0 },
  bulletRow: { flexDirection: 'row', gap: 2 },
  bulletDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: palette.brandPink, opacity: 0.35 },
  pressed: { opacity: 0.75 },
});
