import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, ScrollView, Easing, Pressable, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ToqueBackground } from '@/components/ToqueBackground';
import { GameMenu } from '@/components/GameMenu';
import { palette, spacing, radius } from '@/constants/palette';
import { loadMyTasks, kickPlayer, broadcastPlayerLeft } from '@/lib/game';
import { usePlayerLeft } from '@/hooks/usePlayerLeft';
import { PlayerLeftModal } from '@/components/PlayerLeftModal';
import { TutorialModal } from '@/components/TutorialModal';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import { stopThemeMusic } from '@/lib/themeMusic';
import { playSound } from '@/lib/sound';
import type { PlayerTask } from '@/store';

const COUNTDOWN_START = 10;
const ITEM_HEIGHT = 68;
const LONG_PRESS_MS = 300;

// ─── Drag handle ──────────────────────────────────────────────────────────────

function DragHandle() {
  return (
    <View style={styles.dragDots}>
      <View style={styles.dotsCol}>
        <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} />
      </View>
      <View style={styles.dotsCol}>
        <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} />
      </View>
    </View>
  );
}

// ─── Draggable task item ───────────────────────────────────────────────────────

interface TaskItemProps {
  task: PlayerTask;
  index: number;
  total: number;
  dragFrom: number;
  dragInsertIdx: number;
  onDragStart: (fromIdx: number) => void;
  onDragMove: (insertIdx: number) => void;
  onDragDrop: (from: number, to: number) => void;
  onDragStateChange: (active: boolean) => void;
  onTap: (y: number) => void;
}

const SWIPE_TRIGGER = 14; // px left before swipe is confirmed
const SWIPE_MAX_DY  = 12; // max vertical drift to count as horizontal

function TaskItem({
  task, index, total, dragFrom, dragInsertIdx,
  onDragStart, onDragMove, onDragDrop, onDragStateChange, onTap,
}: TaskItemProps) {
  const translateY  = useRef(new Animated.Value(0)).current;
  const translateX  = useRef(new Animated.Value(0)).current;
  const shiftAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const activeRef   = useRef(false);  // vertical drag active
  const swipingRef  = useRef(false);  // horizontal swipe active
  const pageYRef    = useRef(0);      // Y at touch start
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInsert  = useRef(-1);

  const indexRef  = useRef(index);
  const totalRef  = useRef(total);
  const insertRef = useRef(dragInsertIdx);
  indexRef.current  = index;
  totalRef.current  = total;
  insertRef.current = dragInsertIdx;

  const isDragged = dragFrom === index;

  useEffect(() => {
    if (dragFrom === -1 || dragFrom === index) {
      Animated.spring(shiftAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 320 }).start();
      return;
    }
    const from = dragFrom;
    const to   = dragInsertIdx === -1 ? from : dragInsertIdx;
    let target  = 0;
    if (from < to && index > from && index <= to) target = -ITEM_HEIGHT;
    if (from > to && index < from && index >= to) target =  ITEM_HEIGHT;
    Animated.spring(shiftAnim, { toValue: target, useNativeDriver: true, damping: 28, stiffness: 500 }).start();
  }, [dragFrom, dragInsertIdx, index]);

  function resetSwipe() {
    swipingRef.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 360 }).start();
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // Claim horizontal moves early (swipe) or when vertical drag is active
      onMoveShouldSetPanResponder: (_, gs) =>
        activeRef.current ||
        (Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5),

      onPanResponderGrant: (e) => {
        pageYRef.current = e.nativeEvent.pageY;
        timerRef.current = setTimeout(() => {
          if (swipingRef.current) return; // don't enter drag if already swiping
          activeRef.current = true;
          lastInsert.current = indexRef.current;
          onDragStateChange(true);
          onDragStart(indexRef.current);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Animated.spring(scaleAnim, { toValue: 1.04, useNativeDriver: true, damping: 15, stiffness: 400 }).start();
        }, LONG_PRESS_MS);
      },

      onPanResponderMove: (_, gs) => {
        if (activeRef.current) {
          // Vertical drag: reorder
          translateY.setValue(gs.dy);
          const raw = indexRef.current + gs.dy / ITEM_HEIGHT;
          const ins = Math.max(0, Math.min(totalRef.current - 1, Math.round(raw)));
          if (ins !== lastInsert.current) {
            lastInsert.current = ins;
            onDragMove(ins);
          }
          return;
        }
        // Horizontal swipe left detection
        if (gs.dx < -SWIPE_TRIGGER && Math.abs(gs.dy) < SWIPE_MAX_DY) {
          if (!swipingRef.current) {
            swipingRef.current = true;
            if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
            onTap(pageYRef.current);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          // Slide left with resistance
          translateX.setValue(Math.max(gs.dx * 0.5, -60));
        }
      },

      onPanResponderRelease: (e, gs) => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

        if (swipingRef.current) { resetSwipe(); return; }

        if (!activeRef.current) {
          // Quick tap (no meaningful movement) → show toast
          if (Math.abs(gs.dx) < 5 && Math.abs(gs.dy) < 5) {
            onTap(e.nativeEvent.pageY);
          }
          return;
        }

        activeRef.current = false;
        onDragStateChange(false);

        const from  = indexRef.current;
        const to    = insertRef.current === -1 ? from : insertRef.current;
        const snapY = (to - from) * ITEM_HEIGHT;

        Animated.parallel([
          Animated.timing(translateY, { toValue: snapY, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(scaleAnim,  { toValue: 1,     duration: 120, easing: Easing.out(Easing.quad),  useNativeDriver: true }),
        ]).start((result) => {
          if (result.finished) {
            translateY.setValue(0);
            onDragDrop(from, to);
          }
        });
      },

      onPanResponderTerminate: () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        if (swipingRef.current) { resetSwipe(); return; }
        if (!activeRef.current) return;
        activeRef.current = false;
        onDragStateChange(false);
        const from = indexRef.current;
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(scaleAnim,  { toValue: 1, duration: 120, easing: Easing.out(Easing.quad),  useNativeDriver: true }),
        ]).start(() => { translateY.setValue(0); onDragDrop(from, from); });
      },
    })
  ).current;

  const rowTransform = isDragged
    ? [{ translateX }, { translateY }, { scale: scaleAnim }]
    : [{ translateX }, { translateY: shiftAnim }];

  return (
    <Animated.View
      style={[
        styles.challengeItem,
        { transform: rowTransform, zIndex: isDragged ? 100 : 1 },
        isDragged && styles.challengeItemLifted,
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handleArea}>
        <DragHandle />
      </View>
      <View style={styles.challengeTextArea}>
        <Text style={styles.challengeText}>{task.task_text}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function PrepToast({ toastKey, tapY }: { toastKey: number; tapY: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (toastKey === 0) return;
    opacity.setValue(0);
    scale.setValue(0.92);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1,    duration: 160, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.spring(scale,   { toValue: 1,    useNativeDriver: true, damping: 18, stiffness: 380 }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }, 1800);
    });
  }, [toastKey]);

  if (toastKey === 0) return null;

  // Position just above the tap, clamped to safe area
  const top = Math.max(90, tapY - 60);

  return (
    <Animated.View
      style={[styles.toast, { top, opacity, transform: [{ scale }] }]}
      pointerEvents="none"
    >
      <Text style={styles.toastText}>Validation disponible une fois la partie lancée</Text>
    </Animated.View>
  );
}

// ─── Prepa screen ─────────────────────────────────────────────────────────────

export default function PrepaScreen() {
  const { game, currentRound, myPlayer, setMyTasks, reset } = useStore();

  useEffect(() => { stopThemeMusic(); }, []);
  useEffect(() => { playSound('decompteCountdown'); }, []);
  const { leftPlayer, isGameOver, dismissPlayerLeft } = usePlayerLeft();
  const [localTasks,    setLocalTasks]    = useState<PlayerTask[]>([]);
  const [countdown,     setCountdown]     = useState(COUNTDOWN_START);
  const [isDragging,    setIsDragging]    = useState(false);
  const [dragFrom,      setDragFrom]      = useState(-1);
  const [dragInsertIdx, setDragInsertIdx] = useState(-1);
  const [menuVisible,     setMenuVisible]     = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [toastKey,        setToastKey]        = useState(0);
  const [toastTapY,       setToastTapY]       = useState(200);

  function showToast(y: number) { playSound('taskCannotComplete'); setToastTapY(y); setToastKey((k) => k + 1); }

  const TUTORIAL_FLAG = `${FileSystem.documentDirectory}tutorial_fourneaux_seen`;

  useEffect(() => {
    FileSystem.getInfoAsync(TUTORIAL_FLAG).then((info) => {
      if (!info.exists) setTutorialVisible(true);
    }).catch(() => { setTutorialVisible(true); });
  }, []);

  function handleTutorialClose() {
    setTutorialVisible(false);
    FileSystem.writeAsStringAsync(TUTORIAL_FLAG, '1').catch(() => {});
  }

  function handleQuit() {
    Alert.alert(
      'Quitter la partie ?',
      'Tu perdras ta progression dans ce service.',
      [
        { text: 'Rester', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => { if (game?.id && myPlayer) broadcastPlayerLeft(game.id, myPlayer.id); if (myPlayer?.id) kickPlayer(myPlayer.id).catch(() => {}); reset(); router.replace('/'); } },
      ],
    );
  }

  useEffect(() => {
    if (!currentRound?.id || !myPlayer?.id) return;

    const roundId = currentRound.id;
    const playerId = myPlayer.id;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchAndListen() {
      const tasks = await loadMyTasks(roundId, playerId);
      if (cancelled) return;

      if (tasks.length > 0) {
        setMyTasks(tasks);
        setLocalTasks(tasks);
        return;
      }

      // Tasks not assigned yet (Realtime race) — wait for the first INSERT
      channel = supabase
        .channel(`pt_${roundId}_${playerId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'player_tasks',
          filter: `round_id=eq.${roundId}`,
        }, async () => {
          if (cancelled) return;
          const retryTasks = await loadMyTasks(roundId, playerId);
          if (cancelled || retryTasks.length === 0) return;
          setMyTasks(retryTasks);
          setLocalTasks(retryTasks);
          if (channel) { supabase.removeChannel(channel); channel = null; }
        })
        .subscribe();
    }

    fetchAndListen();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentRound?.id, myPlayer?.id]);

  useEffect(() => {
    if (!currentRound?.started_at || leftPlayer !== null) return;

    const startedAtMs = new Date(currentRound.started_at).getTime();

    function tick() {
      const remaining = Math.max(0, Math.ceil((startedAtMs - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) router.replace('/game');
    }

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [currentRound?.started_at, leftPlayer]);

  function handleDragStart(fromIdx: number) {
    setDragFrom(fromIdx);
    setDragInsertIdx(fromIdx);
  }

  function handleDragMove(insertIdx: number) {
    setDragInsertIdx(insertIdx);
  }

  function handleDragDrop(from: number, to: number) {
    setDragFrom(-1);
    setDragInsertIdx(-1);
    if (from === to) return;
    setLocalTasks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <View style={styles.root}>
      <ToqueBackground />
      <GameMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <PlayerLeftModal player={leftPlayer} isGameOver={isGameOver} onDismiss={dismissPlayerLeft} />
      <TutorialModal visible={tutorialVisible} onClose={handleTutorialClose} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.topBtn, pressed && styles.pressed]}
            onPress={handleQuit}
            accessibilityRole="button"
            accessibilityLabel="Quitter la partie"
          >
            <Ionicons name="close" size={28} color={palette.brandPink} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.topBtn, pressed && styles.pressed]}
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Options"
          >
            <Ionicons name="settings-outline" size={26} color={palette.brandPink} />
          </Pressable>
        </View>
        <PrepToast toastKey={toastKey} tapY={toastTapY} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isDragging}
        >
          <View style={styles.topSection}>
            <Text style={styles.heading}>Découvre la recette...</Text>
            {localTasks[0] ? (
              <View style={styles.activeChallenge}>
                <Text style={styles.activeChallengeText}>{localTasks[0].task_text}</Text>
              </View>
            ) : null}
            <View style={styles.countdownRow}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </View>
          </View>

          <View style={styles.list}>
            {localTasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                index={index}
                total={localTasks.length}
                dragFrom={dragFrom}
                dragInsertIdx={dragInsertIdx}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragDrop={handleDragDrop}
                onDragStateChange={setIsDragging}
                onTap={showToast}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgWhite },
  safeArea: { flex: 1, zIndex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.medium,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topBtn: { padding: 4 },
  backBtnText: { fontFamily: 'Recursive_600SemiBold', fontSize: 22, color: palette.brandPink },
  pressed: { opacity: 0.7 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  topSection: {
    backgroundColor: '#fff5f1',
    paddingHorizontal: spacing.small,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
    alignItems: 'center',
  },
  heading: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 38,
    color: palette.brandGreen,
    textTransform: 'uppercase',
    lineHeight: 40,
    textAlign: 'center',
  },
  activeChallenge: {
    backgroundColor: palette.bgWhite, borderRadius: 4,
    paddingHorizontal: spacing.small, paddingVertical: 10,
    alignSelf: 'stretch',
    shadowColor: 'rgba(71, 21, 0, 0.06)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 44, elevation: 3,
  },
  activeChallengeText: {
    fontFamily: 'Recursive_600SemiBold', fontSize: 20,
    color: palette.brandPink, textAlign: 'center',
  },
  countdownRow: { alignItems: 'center', gap: 4 },
  countdownNumber: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 80,
    lineHeight: 84,
    color: palette.brandPink,
  },
  countdownLabel: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    color: palette.brandPink,
    opacity: 0.6,
  },

  list: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: palette.borderPeach,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 251, 250, 0.9)',
    borderBottomWidth: 1,
    borderColor: palette.borderPeach,
  },
  challengeItemLifted: {
    backgroundColor: '#ffffff',
    shadowColor: 'rgba(71, 21, 0, 0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  handleArea: {
    paddingLeft: spacing.small,
    paddingRight: spacing.xsmall,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragDots: { flexDirection: 'row', gap: 3 },
  dotsCol: { gap: 4 },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.brandPink,
    opacity: 0.4,
  },
  challengeTextArea: { flex: 1 },
  challengeText: {
    flex: 1,
    paddingRight: spacing.small,
    paddingVertical: 24,
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    color: palette.textPrimary,
  },
  toast: {
    position: 'absolute',
    left: spacing.medium,
    right: spacing.medium,
    backgroundColor: palette.bgWhite,
    borderRadius: radius.main,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.borderPeach,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  toastText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    color: palette.textPrimary,
    textAlign: 'center',
  },
});
