import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Dimensions,
  Animated as RNAnimated, PanResponder, Easing as RNEasing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, withDelay,
  runOnJS, Easing, cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { ToqueBackground } from '@/components/ToqueBackground';
import { AccuseOverlay } from '@/components/AccuseOverlay';
import { GameMenu } from '@/components/GameMenu';
import { palette, spacing } from '@/constants/palette';
import { markTaskDone, createAccusation, cancelAccusation, pauseRound, kickPlayer, broadcastPlayerLeft } from '@/lib/game';
import { usePlayerLeft } from '@/hooks/usePlayerLeft';
import { PlayerLeftModal } from '@/components/PlayerLeftModal';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import type { PlayerTask, Accusation } from '@/store';
import { playSound } from '@/lib/sound';
import { useRoundTimer } from '@/hooks/useRoundTimer';

const ITEM_HEIGHT    = 76;
const LONG_PRESS_MS  = 300;
const VALIDATION_MS  = 10_000;
const FILL_COLOR     = '#FFEBEF';
const TAUK_CHARGE_MS = 300;

// Set module-level : conservé entre re-montages du composant, réinitialisé au redémarrage de l'app
const _hintPlayedRounds = new Set<string>();

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

// ─── Validating task — 10 s contestation loader ───────────────────────────────
// Cancel: tap the row during the 10-second window.

function ValidatingTask({ task, isFirst, onDone, onCancel }: {
  task: PlayerTask;
  isFirst: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const fillProgress = useSharedValue(0);
  const containerW   = useSharedValue(0);
  const doneRef      = useRef(false);
  const { taukActive, validatingTasks } = useStore();

  const entry     = validatingTasks.find((e) => e.id === task.id);
  const startedAt = entry?.startedAt ?? Date.now();
  const frozenAt  = entry?.frozenAt ?? null;

  function frozenProgress(): number {
    if (!frozenAt) return 0;
    return Math.min(1, (frozenAt - startedAt) / VALIDATION_MS);
  }
  function remainingMs(): number {
    if (!frozenAt) return VALIDATION_MS;
    return Math.max(0, VALIDATION_MS - (frozenAt - startedAt));
  }

  function handleDone() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  function handleCancel() {
    if (doneRef.current) return;
    doneRef.current = true;
    fillProgress.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(onCancel)();
    });
  }

  function launchFill(fromProgress: number, duration: number) {
    fillProgress.value = fromProgress;
    fillProgress.value = withTiming(1, { duration, easing: Easing.linear }, (done) => {
      if (done) runOnJS(handleDone)();
    });
  }

  // Gèle / reprend selon taukActive
  useEffect(() => {
    if (taukActive) {
      cancelAnimation(fillProgress);
      fillProgress.value = frozenProgress();
    } else if (frozenAt !== null) {
      // Reprise : repart depuis la position gelée avec le temps restant
      const rem = remainingMs();
      if (rem <= 0) { handleDone(); return; }
      if (containerW.value > 0) launchFill(frozenProgress(), rem);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taukActive]);

  // Sécurité : annule l'animation au démontage
  useEffect(() => {
    return () => { cancelAnimation(fillProgress); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: fillProgress.value * containerW.value,
    backgroundColor: FILL_COLOR,
  }));

  function startFill(w: number) {
    containerW.value = w;
    if (taukActive) {
      // Composant monté alors que TAUK est déjà actif : affiche la position gelée
      fillProgress.value = frozenProgress();
      return;
    }
    if (frozenAt !== null) {
      // Remontage après reprise : repart depuis la position gelée
      const rem = remainingMs();
      if (rem <= 0) { handleDone(); return; }
      launchFill(frozenProgress(), rem);
      return;
    }
    // Démarrage normal
    launchFill(0, VALIDATION_MS);
  }

  return (
    <Pressable
      style={[styles.validatingRow, isFirst ? styles.swipeOuterFirst : styles.swipeOuterRest]}
      onPress={handleCancel}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (containerW.value === 0 && w > 0) startFill(w);
      }}
    >
      <Animated.View style={fillStyle} />
      <View style={styles.validatingContent}>
        <Text style={styles.validatingText} numberOfLines={2}>
          {task.task_text}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Swipe-to-validate row ────────────────────────────────────────────────────
// The fill (#FFEBEF) tracks the finger in real time during the swipe gesture.

function SwipeChallenge({
  task, isFirst, isHintTarget, onHintStart, onDone,
}: {
  task: PlayerTask; isFirst?: boolean; isHintTarget?: boolean; onHintStart?: () => void; onDone?: () => void;
}) {
  const containerW = useSharedValue(0);
  const dx         = useSharedValue(0);

  // One-time swipe hint on the first task of the round
  useEffect(() => {
    if (!isHintTarget) return;
    const id = setTimeout(() => {
      onHintStart?.();
      dx.value = withSequence(
        withTiming(-16, { duration: 220, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 18, stiffness: 280 }),
      );
    }, 900);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-8, 8])
    .onUpdate((e) => { dx.value = Math.min(0, e.translationX); })
    .onEnd(() => {
      if (dx.value < -(containerW.value * 0.25)) {
        dx.value = withTiming(-containerW.value, { duration: 200 }, (done) => {
          if (done && onDone) runOnJS(onDone)();
        });
      } else {
        dx.value = withSpring(0, { damping: 18, stiffness: 320 });
      }
    });

  // Fill exposed on the right as the content slides left — tracks finger
  const fillStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: Math.max(0, -dx.value),
    backgroundColor: FILL_COLOR,
  }));

  const rowStyle = useAnimatedStyle(() => ({
    width: containerW.value > 0 ? containerW.value * 2 : 800,
    transform: [{ translateX: dx.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    width: Math.max(0, containerW.value),
  }));

  return (
    <View
      style={[styles.swipeOuter, isFirst ? styles.swipeOuterFirst : styles.swipeOuterRest]}
      onLayout={(e) => { containerW.value = e.nativeEvent.layout.width; }}
    >
      {/* Fill behind the sliding content */}
      <Animated.View style={fillStyle} />

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.swipeRow, rowStyle]}>
          <Animated.View style={[styles.swipeContentBox, contentStyle]}>
            <Text style={styles.challengeText}>{task.task_text}</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Draggable row (long-press drag + swipe-to-validate) ──────────────────────

interface DraggableRowProps {
  task: PlayerTask;
  index: number;
  total: number;
  isFirst: boolean;
  isHintTarget: boolean;
  dragFrom: number;
  dragInsertIdx: number;
  onSwipeDone: () => void;
  onHintStart?: () => void;
  onDragStart: (fromIdx: number) => void;
  onDragMove: (insertIdx: number) => void;
  onDragDrop: (from: number, to: number) => void;
  onDragStateChange: (active: boolean) => void;
}

function DraggableRow({
  task, index, total, isFirst, isHintTarget,
  dragFrom, dragInsertIdx,
  onSwipeDone, onHintStart, onDragStart, onDragMove, onDragDrop, onDragStateChange,
}: DraggableRowProps) {
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const shiftAnim  = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim  = useRef(new RNAnimated.Value(1)).current;
  const activeRef  = useRef(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInsert = useRef(-1);
  const indexRef   = useRef(index);
  const totalRef   = useRef(total);
  const insertRef  = useRef(dragInsertIdx);
  indexRef.current  = index;
  totalRef.current  = total;
  insertRef.current = dragInsertIdx;

  const isDragged = dragFrom === index;

  useEffect(() => {
    if (dragFrom === -1 || dragFrom === index) {
      RNAnimated.spring(shiftAnim, { toValue: 0, useNativeDriver: true, damping: 28, stiffness: 500 }).start();
      return;
    }
    const from = dragFrom;
    const to   = dragInsertIdx === -1 ? from : dragInsertIdx;
    let target  = 0;
    if (from < to && index > from && index <= to) target = -ITEM_HEIGHT;
    if (from > to && index < from && index >= to) target =  ITEM_HEIGHT;
    RNAnimated.spring(shiftAnim, { toValue: target, useNativeDriver: true, damping: 28, stiffness: 500 }).start();
  }, [dragFrom, dragInsertIdx, index]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => activeRef.current,

      onPanResponderGrant: () => {
        timerRef.current = setTimeout(() => {
          activeRef.current = true;
          lastInsert.current = indexRef.current;
          onDragStateChange(true);
          onDragStart(indexRef.current);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          RNAnimated.spring(scaleAnim, { toValue: 1.04, useNativeDriver: true, damping: 15, stiffness: 400 }).start();
        }, LONG_PRESS_MS);
      },

      onPanResponderMove: (_, gs) => {
        if (!activeRef.current) return;
        translateY.setValue(gs.dy);
        const raw = indexRef.current + gs.dy / ITEM_HEIGHT;
        const ins = Math.max(0, Math.min(totalRef.current - 1, Math.round(raw)));
        if (ins !== lastInsert.current) {
          lastInsert.current = ins;
          onDragMove(ins);
        }
      },

      onPanResponderRelease: (_, gs) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!activeRef.current) return;
        activeRef.current = false;
        onDragStateChange(false);
        const from  = indexRef.current;
        const to    = insertRef.current === -1 ? from : insertRef.current;
        const snapY = (to - from) * ITEM_HEIGHT;
        RNAnimated.parallel([
          RNAnimated.timing(translateY, { toValue: snapY, duration: 150, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
          RNAnimated.timing(scaleAnim,  { toValue: 1,     duration: 120, easing: RNEasing.out(RNEasing.quad),  useNativeDriver: true }),
        ]).start((result) => {
          if (result.finished) { translateY.setValue(0); onDragDrop(from, to); }
        });
      },

      onPanResponderTerminate: () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!activeRef.current) return;
        activeRef.current = false;
        onDragStateChange(false);
        const from = indexRef.current;
        RNAnimated.parallel([
          RNAnimated.timing(translateY, { toValue: 0, duration: 150, easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true }),
          RNAnimated.timing(scaleAnim,  { toValue: 1, duration: 120, easing: RNEasing.out(RNEasing.quad),  useNativeDriver: true }),
        ]).start(() => { translateY.setValue(0); onDragDrop(from, from); });
      },
    })
  ).current;

  const rowTransform = isDragged
    ? [{ translateY }, { scale: scaleAnim }]
    : [{ translateY: shiftAnim }];

  return (
    <RNAnimated.View
      style={[
        styles.draggableRow,
        { transform: rowTransform, zIndex: isDragged ? 100 : 1 },
        isDragged && styles.draggableRowLifted,
      ]}
    >
      <View style={styles.handleArea} {...panResponder.panHandlers}>
        <DragHandle />
      </View>
      <View style={styles.swipeWrapper}>
        <SwipeChallenge
          task={task}
          isFirst={isFirst}
          isHintTarget={isHintTarget}
          onHintStart={onHintStart}
          onDone={onSwipeDone}
        />
      </View>
    </RNAnimated.View>
  );
}

// ─── Game screen ──────────────────────────────────────────────────────────────

export default function GameScreen() {
  const [accuseVisible, setAccuseVisible] = useState(false);
  const [isDragging,    setIsDragging]    = useState(false);
  const [menuVisible,   setMenuVisible]   = useState(false);
  const [hintActive,    setHintActive]    = useState(false);

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
  const [localOrder,    setLocalOrder]    = useState<string[]>([]);
  const [dragFrom,      setDragFrom]      = useState(-1);
  const [dragInsertIdx, setDragInsertIdx] = useState(-1);
  const accusationChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const roundChannelRef      = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const roundStatusRef       = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hasEndedRoundRef       = useRef(false);
  const taukBtnRef             = useRef<View>(null);
  const taukBtnMeasureRef      = useRef({ pageY: 0, height: 100 });
  const taukTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taukFiredRef           = useRef(false);
  const taukScaleY             = useSharedValue(1);
  const taukOverlayOpacity     = useSharedValue(0);
  const taukTextOpacity        = useSharedValue(0);
  const taukChargeProgress     = useSharedValue(0);
  const taukBtnWidth           = useSharedValue(0);
  const [taukOverlayPos, setTaukOverlayPos] = useState({ top: 0, height: 100 });

  const { leftPlayer, isGameOver, dismissPlayerLeft } = usePlayerLeft();

  const {
    game, myTasks, currentRound, myPlayer, players,
    updateTaskStatus, setActiveAccusation, setBuzzer, setCurrentRound,
    validatingTasks, addValidatingTask, removeValidatingTask,
    taukActive, taukFiredAt, activateTauk, deactivateTauk, reset,
  } = useStore();

  useEffect(() => {
    if (!currentRound?.id) router.replace('/');
  }, [currentRound?.id]);

  // Active l'hint une seule fois par round, résiste aux re-montages du composant
  useEffect(() => {
    const id = currentRound?.id;
    if (!id || _hintPlayedRounds.has(id)) return;
    setHintActive(true);
  }, [currentRound?.id]);

  function handleHintPlayed() {
    const id = currentRound?.id;
    if (!id) return;
    _hintPlayedRounds.add(id);
    setHintActive(false);
  }

  useFocusEffect(
    useCallback(() => {
      const { activeAccusation, currentRound: round, myPlayer: me, taukFiredAt: fired } = useStore.getState();
      if (activeAccusation?.result === 'pending' && activeAccusation.accuser_id === me?.id) {
        // Swipe-back depuis /spectateur : l'accusation est encore pending → l'annuler
        cancelAccusation(activeAccusation.id).catch(() => {});
      } else if (activeAccusation?.id && round) {
        if (activeAccusation.accuser_id === me?.id) {
          // Seul l'accusateur déclenche la reprise : il est le dernier à revenir sur /game
          // (après avoir fermé la PointAttributionModal dans /spectateur).
          // Les autres joueurs (buzz, accusé) arrivent avant et restent figés via paused_since
          // jusqu'à ce que le Realtime de commit_round_pause_from_accusation arrive pour tous.
          const pauseStartMs = round.paused_since
            ? new Date(round.paused_since).getTime()
            : fired;
          if (pauseStartMs != null) {
            const pauseDuration = Math.max(0, Date.now() - pauseStartMs);
            setCurrentRound({
              ...round,
              total_paused_ms: (round.total_paused_ms ?? 0) + pauseDuration,
              paused_since: null,
            });
          }
          const accusationId = activeAccusation.id;
          (async () => {
            try { await supabase.rpc('commit_round_pause_from_accusation', { p_accusation_id: accusationId }); } catch {}
          })();
        }
        // Les non-accusateurs ne font rien ici : leur store se met à jour via
        // le Realtime postgres_changes sur rounds (total_paused_ms + paused_since = null)
        // déclenché par commit_round_pause_from_accusation côté accusateur.
      }
      deactivateTauk();
      taukOverlayOpacity.value = 0;
      taukTextOpacity.value = 0;
      taukScaleY.value = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => {
    if (myTasks.length > 0 && localOrder.length === 0) {
      setLocalOrder(myTasks.map((t) => t.id));
    }
  }, [myTasks]);

  // Écoute les accusations visant ce joueur — redirige vers /accuse dès qu'une arrive.
  useEffect(() => {
    if (!myPlayer?.id || !currentRound?.id) return;

    if (accusationChannelRef.current) {
      supabase.removeChannel(accusationChannelRef.current);
      accusationChannelRef.current = null;
    }

    const channel = supabase
      .channel(`accused-${myPlayer.id}-${currentRound.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'accusations', filter: `accused_id=eq.${myPlayer.id}` },
        (payload) => {
          setActiveAccusation(payload.new as Accusation);
          activateTauk();
          playTaukTransition(() => router.push('/accuse'));
        },
      )
      .subscribe();

    accusationChannelRef.current = channel;
    return () => {
      accusationChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [myPlayer?.id, currentRound?.id]);

  // Broadcast "tauk_pressed" — envoie les autres joueurs vers /buzz.
  useEffect(() => {
    if (!currentRound?.id || !myPlayer?.id) return;

    if (roundChannelRef.current) {
      supabase.removeChannel(roundChannelRef.current);
      roundChannelRef.current = null;
    }

    const channel = supabase
      .channel(`round-${currentRound.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'broadcast',
        { event: 'tauk_pressed' },
        ({ payload }: { payload: { buzzer: typeof myPlayer } }) => {
          setBuzzer(payload.buzzer);
          activateTauk();
          playTaukTransition(() => router.push('/buzz'));
        },
      )
      .subscribe();

    roundChannelRef.current = channel;
    return () => {
      roundChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [currentRound?.id, myPlayer?.id]);

  // Écoute le passage du round en "countdown" → redirige vers l'écran résultat manche.
  useEffect(() => {
    if (!currentRound?.id) return;

    if (roundStatusRef.current) {
      supabase.removeChannel(roundStatusRef.current);
      roundStatusRef.current = null;
    }

    const ch = supabase
      .channel(`round-status-${currentRound.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${currentRound.id}` },
        (payload) => {
          const newRound = payload.new as Parameters<typeof setCurrentRound>[0];
          setCurrentRound(newRound);
          if (newRound.status === 'countdown') {
            const { players: p } = useStore.getState();
            router.replace(p.length <= 2 ? '/resultat-manche-1v1' : '/resultat-manche');
          }
        },
      )
      .subscribe();

    roundStatusRef.current = ch;
    return () => {
      roundStatusRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [currentRound?.id]);

  // taukFiredAt provides an immediate local freeze while waiting for paused_since from Realtime.
  const frozenAtMs = currentRound?.paused_since
    ? new Date(currentRound.paused_since).getTime()
    : taukFiredAt;
  const { display: timerDisplay, isExpired, isUrgent } = useRoundTimer(
    currentRound?.started_at,
    frozenAtMs,
    currentRound?.total_paused_ms ?? 0,
    game?.round_duration_s ?? null,
  );

  // Quand le timer atteint 0 : fin de manche (une seule mise à jour, déduplication côté DB)
  useEffect(() => {
    if (!isExpired || hasEndedRoundRef.current || !currentRound?.id) return;
    hasEndedRoundRef.current = true;
    supabase
      .from('rounds')
      .update({ status: 'countdown', countdown_started_at: new Date().toISOString() })
      .eq('id', currentRound.id)
      .eq('status', 'playing')
      .then(() => {});
  }, [isExpired, currentRound?.id]);

  const taukOverlayStyle = useAnimatedStyle(() => ({
    opacity: taukOverlayOpacity.value,
    transform: [{ scaleY: taukScaleY.value }],
  }));

  const taukPatternStyle = useAnimatedStyle(() => ({
    opacity: taukOverlayOpacity.value,
  }));

  const taukTextStyle = useAnimatedStyle(() => ({
    opacity: taukTextOpacity.value,
  }));

  const taukChargeFillStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: taukChargeProgress.value * taukBtnWidth.value,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  }));

  const playTaukTransition = useCallback((onComplete: () => void) => {
    const screenH    = Dimensions.get('window').height;
    const { pageY, height } = taukBtnMeasureRef.current;
    const centerY    = pageY + height / 2;
    const targetScaleY = (2 * Math.max(centerY, screenH - centerY)) / height + 0.5;
    taukTextOpacity.value = 0;
    taukOverlayOpacity.value = 1;
    taukScaleY.value = 1;
    taukScaleY.value = withTiming(targetScaleY, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    taukTextOpacity.value = withDelay(280, withTiming(1, { duration: 80 }));
    taukTransitionTimerRef.current = setTimeout(onComplete, 900);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fireTauk() {
    if (taukFiredRef.current) return;
    taukFiredRef.current = true;
    playSound('taukBell');
    activateTauk();
    if (currentRound?.id) pauseRound(currentRound.id).catch(() => {});
    if (otherPlayers.length === 1) {
      playTaukTransition(() => {
        setBuzzer(myPlayer);
        handleAccuse(otherPlayers[0].id);
      });
    } else {
      broadcastTauk();
      playTaukTransition(() => setAccuseVisible(true));
    }
  }

  function handleTaukPressIn() {
    taukFiredRef.current = false;
    taukChargeProgress.value = 0;
    taukChargeProgress.value = withTiming(1, { duration: TAUK_CHARGE_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(fireTauk)();
    });
  }

  function handleTaukPressOut() {
    if (taukFiredRef.current) return;
    cancelAnimation(taukChargeProgress);
    taukChargeProgress.value = withTiming(0, { duration: 200 });
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (taukTransitionTimerRef.current) clearTimeout(taukTransitionTimerRef.current);
      cancelAnimation(taukChargeProgress);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedTasks     = localOrder.map((id) => myTasks.find((t) => t.id === id)).filter((t): t is PlayerTask => t !== undefined);
  const pendingTasks     = orderedTasks.filter((t) => t.status === 'pending');
  const doneTasks        = orderedTasks.filter((t) => t.status !== 'pending');
  const draggablePending = pendingTasks.filter((t) => !validatingTasks.some((e) => e.id === t.id));
  const activeTask       = pendingTasks[0] ?? null;
  const otherPlayers     = players.filter((p) => p.id !== myPlayer?.id);

  function handleTaskSwipe(taskId: string) {
    addValidatingTask(taskId);
  }

  function handleValidationComplete(task: PlayerTask) {
    removeValidatingTask(task.id);
    if (!currentRound?.id || !myPlayer?.id) return;
    playSound('attributionPoint');
    updateTaskStatus(task.id, 'done');
    markTaskDone(task.id, currentRound.id, myPlayer.id);
  }

  function handleValidationCancel(taskId: string) {
    removeValidatingTask(taskId);
  }

  async function handleAccuse(accusedPlayerId: string) {
    if (!currentRound?.id || !myPlayer?.id) return;
    setAccuseVisible(false);
    try {
      const accusationId = await createAccusation(currentRound.id, myPlayer.id, accusedPlayerId);
      setActiveAccusation({
        id: accusationId,
        round_id: currentRound.id,
        accuser_id: myPlayer.id,
        accused_id: accusedPlayerId,
        result: 'pending',
      });
    } catch {
      // accusation peut échouer silencieusement, on continue quand même
    }
    router.push('/spectateur');
  }

  function broadcastTauk() {
    roundChannelRef.current?.send({
      type: 'broadcast',
      event: 'tauk_pressed',
      payload: { buzzer: myPlayer },
    });
  }

  function handleCancelTauk() {
    deactivateTauk();
    if (currentRound?.id) {
      supabase.channel(`round-bc-${currentRound.id}`).send({
        type: 'broadcast',
        event: 'tauk_cancelled',
        payload: {},
      });
    }
    setAccuseVisible(false);
  }

  function handleReorder(fromDragIdx: number, toDragIdx: number) {
    if (fromDragIdx === toDragIdx) return;
    const fromId = draggablePending[fromDragIdx]?.id;
    const toId   = draggablePending[toDragIdx]?.id;
    if (!fromId || !toId) return;
    setLocalOrder((prev) => {
      const next = [...prev];
      const fIdx = next.indexOf(fromId);
      const tIdx = next.indexOf(toId);
      if (fIdx === -1 || tIdx === -1) return prev;
      next.splice(fIdx, 1);
      next.splice(tIdx, 0, fromId);
      return next;
    });
  }

  function handleDragStart(idx: number) { setDragFrom(idx); setDragInsertIdx(idx); }
  function handleDragMove(idx: number)  { setDragInsertIdx(idx); }
  function handleDragDrop(from: number, to: number) {
    setDragFrom(-1); setDragInsertIdx(-1);
    handleReorder(from, to);
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ToqueBackground />
      <GameMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <PlayerLeftModal player={leftPlayer} isGameOver={isGameOver} onDismiss={dismissPlayerLeft} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── Sticky header + active challenge ───────── */}
        <View style={styles.topSection}>
          <View style={styles.header}>
            <Pressable onPress={handleQuit} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Quitter">
              <Ionicons name="close" size={26} color={palette.brandPink} />
            </Pressable>
            {game?.round_duration_s != null && (
              <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
                {timerDisplay}
              </Text>
            )}
            <Pressable onPress={() => { playSound('uiPress'); setMenuVisible(true); }} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Options">
              <Ionicons name="settings-outline" size={22} color={palette.brandPink} />
            </Pressable>
          </View>

          {activeTask && (
            <View style={styles.activeChallenge}>
              <Text style={styles.activeChallengeText}>{activeTask.task_text}</Text>
            </View>
          )}
        </View>

        {/* ── TAUK sticky button ──────────────────────── */}
        <Pressable
          ref={taukBtnRef}
          onLayout={(e) => {
            taukBtnWidth.value = e.nativeEvent.layout.width;
            taukBtnRef.current?.measure((_, __, ___, h, ____, py) => {
              taukBtnMeasureRef.current = { pageY: py, height: h };
              setTaukOverlayPos({ top: py, height: h });
            });
          }}
          style={({ pressed }) => [styles.taukBtn, pressed && styles.taukBtnPressed]}
          onPressIn={handleTaukPressIn}
          onPressOut={handleTaukPressOut}
          accessibilityRole="button"
          accessibilityLabel="TAUK ! Accuser un joueur"
        >
          {({ pressed }) => (
            <>
              <View style={[styles.taukHighlight, pressed && { opacity: 0 }]} />
              <Animated.View style={taukChargeFillStyle} />
              <Text style={styles.taukTitle}>TAUK !</Text>
              <Text style={styles.taukSubtitle}>Maintenir pour accuser</Text>
            </>
          )}
        </Pressable>

        {/* ── Scrollable task list ────────────────────── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isDragging}
        >
          <View style={styles.taskList}>
            {pendingTasks.map((task, pendingIdx) => {
              if (validatingTasks.some((e) => e.id === task.id)) {
                return (
                  <ValidatingTask
                    key={`validating-${task.id}`}
                    task={task}
                    isFirst={pendingIdx === 0}
                    onDone={() => handleValidationComplete(task)}
                    onCancel={() => handleValidationCancel(task.id)}
                  />
                );
              }

              const dragIdx = draggablePending.indexOf(task);

              return (
                <DraggableRow
                  key={`draggable-${task.id}`}
                  task={task}
                  index={dragIdx}
                  total={draggablePending.length}
                  isFirst={pendingIdx === 0}
                  isHintTarget={hintActive && pendingIdx === 0}
                  onHintStart={handleHintPlayed}
                  dragFrom={dragFrom}
                  dragInsertIdx={dragInsertIdx}
                  onSwipeDone={() => handleTaskSwipe(task.id)}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragDrop={handleDragDrop}
                  onDragStateChange={setIsDragging}
                />
              );
            })}
          </View>

          {doneTasks.length > 0 && (
            <View style={styles.doneSection}>
              <Text style={styles.doneSectionTitle}>Actions réalisées</Text>
              {doneTasks.map((task) => (
                <View key={task.id} style={styles.doneRow}>
                  <Text style={styles.doneRowText}>{task.task_text}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ── TAUK pink expansion overlay ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.taukTransitionOverlay,
          { top: taukOverlayPos.top, height: taukOverlayPos.height },
          taukOverlayStyle,
        ]}
      />
      {/* ── TAUK toque pattern — plein écran, synchronisé avec l'opacité rose ── */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.taukPatternOverlay, taukPatternStyle]}>
        <ToqueBackground />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.taukTransitionLabel, taukTextStyle]}>
        <Text
          style={styles.taukTransitionLabelText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          TAUK !
        </Text>
      </Animated.View>

      <AccuseOverlay
        visible={accuseVisible}
        onClose={handleCancelTauk}
        onConfirm={handleAccuse}
        players={otherPlayers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgWhite },
  taukTransitionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: palette.brandPink,
    zIndex: 999,
  },
  taukPatternOverlay: {
    zIndex: 999,
  },
  taukTransitionLabel: {
    position: 'absolute',
    width: '90%',
    alignSelf: 'center',
    top: '50%',
    marginTop: -64.5,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taukTransitionLabelText: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 129,
    lineHeight: 129,
    textAlign: 'center',
    textTransform: 'uppercase',
    color: '#FFFFFF',
    width: '100%',
  },
  safeArea: { flex: 1, zIndex: 1 },

  // Sticky top
  topSection: {
    backgroundColor: '#fff5f1',
    paddingHorizontal: spacing.small, paddingTop: 20, paddingBottom: 18, gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerText: {
    fontFamily: 'Recursive_600SemiBold', fontSize: 20, color: palette.brandGreen,
    letterSpacing: 1, minWidth: 52, textAlign: 'center',
  },
  timerTextUrgent: { color: palette.brandPink },
  iconBtn: {
    width: 32, height: 32, borderRadius: 60,
    backgroundColor: 'rgba(255, 20, 134, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontFamily: 'Recursive_600SemiBold', fontSize: 16, color: palette.brandPink, lineHeight: 20 },
  activeChallenge: {
    backgroundColor: palette.bgWhite, borderRadius: 4,
    paddingHorizontal: spacing.small, paddingVertical: 10,
    shadowColor: 'rgba(71, 21, 0, 0.06)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 44, elevation: 3,
  },
  activeChallengeText: {
    fontFamily: 'Recursive_600SemiBold', fontSize: 20, color: palette.brandPink, textAlign: 'center',
  },

  // TAUK button
  taukBtn: {
    paddingVertical: 22, alignItems: 'center', justifyContent: 'center', gap: 3,
    backgroundColor: palette.brandPink,
    borderTopWidth: 3, borderBottomWidth: 3, borderTopColor: '#e0006c', borderBottomColor: '#e0006c',
    overflow: 'hidden',
  },
  taukBtnPressed: { backgroundColor: '#e0006c' },
  taukHighlight: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  taukTitle: {
    fontFamily: 'Staatliches_400Regular', fontSize: 60, lineHeight: 60,
    color: '#ffffff', textTransform: 'uppercase', textAlign: 'center',
  },
  taukSubtitle: { fontFamily: 'Recursive_400Regular', fontSize: 13, color: '#ffffff', textAlign: 'center' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  taskList: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: palette.borderPeach },

  // Validating row
  validatingRow: {
    overflow: 'hidden',
    backgroundColor: palette.bgWhite,
  },
  validatingContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.small, paddingVertical: 28,
  },
  validatingText: {
    flex: 1, fontFamily: 'Recursive_400Regular', fontSize: 16, color: palette.textPrimary,
  },

  // Draggable row
  draggableRow: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: 'rgba(255, 251, 250, 0.9)',
  },
  draggableRowLifted: {
    backgroundColor: '#ffffff',
    shadowColor: 'rgba(71, 21, 0, 0.18)', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1, shadowRadius: 20, elevation: 8,
  },
  handleArea: { paddingLeft: spacing.small, paddingRight: 8, justifyContent: 'center', alignItems: 'center' },
  swipeWrapper: { flex: 1, overflow: 'hidden' },

  // Swipe row
  swipeOuter: { overflow: 'hidden', backgroundColor: 'rgba(255, 251, 250, 0.9)' },
  swipeOuterFirst: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.borderPeach },
  swipeOuterRest:  { borderBottomWidth: 1, borderColor: palette.borderPeach },
  swipeRow: { flexDirection: 'row' },
  swipeContentBox: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.small, paddingVertical: 28,
    backgroundColor: 'rgba(255, 251, 250, 0.9)',
  },
  challengeText: { flex: 1, fontFamily: 'Recursive_400Regular', fontSize: 16, color: palette.textPrimary },

  // Done section
  doneSection: {
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: palette.borderPeach,
    paddingTop: 8, paddingBottom: 4,
  },
  doneSectionTitle: {
    fontFamily: 'Recursive_600SemiBold', fontSize: 11,
    color: palette.brandPink, opacity: 0.5,
    paddingHorizontal: spacing.small, paddingBottom: 4,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  doneRow: {
    paddingHorizontal: spacing.small, paddingVertical: 12,
    borderTopWidth: 1, borderColor: palette.borderPeach,
  },
  doneRowText: {
    fontFamily: 'Recursive_400Regular', fontSize: 14,
    color: palette.textPrimary, opacity: 0.4,
    textDecorationLine: 'line-through',
  },

  // Drag dots
  dragDots: { flexDirection: 'row', gap: 3 },
  dotsCol: { gap: 4 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: palette.brandPink, opacity: 0.4 },
});
