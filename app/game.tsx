import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ToqueBackground } from '@/components/ToqueBackground';
import { AccuseOverlay } from '@/components/AccuseOverlay';
import { palette, spacing } from '@/constants/palette';
import { markTaskDone, createAccusation } from '@/lib/game';
import { useStore } from '@/store';
import type { PlayerTask } from '@/store';

const PINK_HINT = 19;

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

function SwipeChallenge({
  task,
  active,
  isFirst,
  onDone,
}: {
  task: PlayerTask;
  active?: boolean;
  isFirst?: boolean;
  onDone?: () => void;
}) {
  const containerW = useSharedValue(0);
  const dx = useSharedValue(0);
  const hint = active ? PINK_HINT : 0;
  const isDone = task.status !== 'pending';

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-8, 8])
    .enabled(!isDone)
    .onUpdate((e) => {
      dx.value = Math.min(0, e.translationX);
    })
    .onEnd(() => {
      const contentW = containerW.value - hint;
      if (dx.value < -(contentW * 0.35)) {
        dx.value = withTiming(-contentW, { duration: 220 }, (done) => {
          if (done && onDone) runOnJS(onDone)();
        });
      } else {
        dx.value = withSpring(0, { damping: 18, stiffness: 320 });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    width: containerW.value > 0 ? containerW.value * 2 : 800,
    transform: [{ translateX: isDone ? -(containerW.value - hint) : dx.value }],
  }));

  const contentBoxStyle = useAnimatedStyle(() => ({
    width: Math.max(0, containerW.value - hint),
  }));

  const pinkAreaStyle = useAnimatedStyle(() => ({
    width: Math.max(0, containerW.value + hint),
  }));

  return (
    <View
      style={[styles.swipeOuter, isFirst ? styles.swipeOuterFirst : styles.swipeOuterRest]}
      onLayout={(e) => { containerW.value = e.nativeEvent.layout.width; }}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.swipeRow, rowStyle]}>
          <Animated.View style={[styles.swipeContentBox, contentBoxStyle]}>
            <Bullet />
            <Text style={[styles.challengeText, isDone && styles.challengeTextDone]}>
              {task.task_text}
            </Text>
          </Animated.View>
          <Animated.View style={[styles.swipePinkArea, pinkAreaStyle]} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function GameScreen() {
  const [accuseVisible, setAccuseVisible] = useState(false);
  const { myTasks, currentRound, myPlayer, players, updateTaskStatus } = useStore();

  // Redirect if store is empty
  useEffect(() => {
    if (!currentRound?.id) router.replace('/');
  }, [currentRound?.id]);

  async function handleTaskDone(task: PlayerTask) {
    if (!currentRound?.id || !myPlayer?.id) return;
    updateTaskStatus(task.id, 'done');
    await markTaskDone(task.id, currentRound.id, myPlayer.id);
  }

  async function handleAccuse(accusedPlayerId: string) {
    if (!currentRound?.id || !myPlayer?.id) return;
    setAccuseVisible(false);
    try {
      await createAccusation(currentRound.id, myPlayer.id, accusedPlayerId);
      router.push('/buzz');
    } catch {
      router.push('/buzz');
    }
  }

  const otherPlayers = players.filter((p) => p.id !== myPlayer?.id);
  const activeTasks = myTasks.filter((t) => t.status === 'pending');
  const activeTask = activeTasks[0] ?? myTasks[0];
  const roundNumber = currentRound?.round_number ?? 1;

  return (
    <View style={styles.root}>
      <ToqueBackground />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
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

            <Text style={styles.roundNumber}>{roundNumber}</Text>

            {activeTask && (
              <View style={styles.firstChallengeCard}>
                <Text style={styles.firstChallengeText}>{activeTask.task_text}</Text>
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [styles.taukBtn, pressed && styles.taukBtnPressed]}
            onPress={() => setAccuseVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="TAUK ! Accuser un joueur"
          >
            {({ pressed }) => (
              <>
                <View style={[styles.taukHighlight, pressed && { opacity: 0 }]} />
                <Text style={styles.taukTitle}>TAUK !</Text>
                <Text style={styles.taukSubtitle}>Maintenir pour accuser</Text>
              </>
            )}
          </Pressable>

          <View style={styles.challengeList}>
            {myTasks.map((task, i) => (
              <SwipeChallenge
                key={task.id}
                task={task}
                active={i === 0 && task.status === 'pending'}
                isFirst={i === 0}
                onDone={() => handleTaskDone(task)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      <AccuseOverlay
        visible={accuseVisible}
        onClose={() => setAccuseVisible(false)}
        onConfirm={handleAccuse}
        players={otherPlayers}
      />
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
    paddingHorizontal: spacing.small, paddingTop: 24, paddingBottom: 48, gap: 36,
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
  roundNumber: {
    fontFamily: 'Recursive_600SemiBold', fontSize: 54,
    lineHeight: 54, color: palette.brandGreen, textAlign: 'center',
  },
  firstChallengeCard: {
    backgroundColor: palette.bgWhite, borderRadius: 4,
    paddingHorizontal: spacing.small, paddingVertical: 8,
    shadowColor: 'rgba(71, 21, 0, 0.06)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 44, elevation: 3,
  },
  firstChallengeText: {
    fontFamily: 'Recursive_600SemiBold', fontSize: 22, color: palette.brandPink, textAlign: 'center',
  },

  taukBtn: {
    width: '100%', paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 3,
    backgroundColor: palette.brandPink, borderTopWidth: 3, borderBottomWidth: 3,
    borderTopColor: '#e0006c', borderBottomColor: '#e0006c', overflow: 'hidden',
  },
  taukBtnPressed: { backgroundColor: '#e0006c' },
  taukHighlight: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  taukTitle: {
    fontFamily: 'Staatliches_400Regular', fontSize: 64, lineHeight: 64,
    color: '#ffffff', textTransform: 'uppercase', textAlign: 'center',
  },
  taukSubtitle: { fontFamily: 'Recursive_400Regular', fontSize: 13, color: '#ffffff', textAlign: 'center' },

  challengeList: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: palette.borderPeach },
  swipeOuter: { overflow: 'hidden', backgroundColor: 'rgba(255, 251, 250, 0.9)' },
  swipeOuterFirst: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.borderPeach },
  swipeOuterRest: { borderBottomWidth: 1, borderColor: palette.borderPeach },
  swipeRow: { flexDirection: 'row' },
  swipeContentBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.medium,
    paddingHorizontal: spacing.small, paddingVertical: 28,
    backgroundColor: 'rgba(255, 251, 250, 0.9)',
  },
  swipePinkArea: { backgroundColor: palette.brandPink },
  challengeText: { flex: 1, fontFamily: 'Recursive_400Regular', fontSize: 16, color: palette.textPrimary },
  challengeTextDone: { textDecorationLine: 'line-through', opacity: 0.4 },
  bullet: { gap: 2, flexShrink: 0 },
  bulletRow: { flexDirection: 'row', gap: 2 },
  bulletDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: palette.brandPink, opacity: 0.35 },
});
