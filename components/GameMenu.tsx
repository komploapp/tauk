import { useState, useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { RulesModal } from '@/components/RulesModal';
import { TutorialModal } from '@/components/TutorialModal';
import { palette, spacing, radius } from '@/constants/palette';
import { useStore } from '@/store';
import { playSound } from '@/lib/sound';

const ROUND_OPTIONS = [3, 6, 10] as const;
type RoundCount = 3 | 6 | 10;

export type TimerDuration = null | 60 | 180 | 300;
const TIMER_OPTIONS: TimerDuration[] = [null, 60, 180, 300];
const TIMER_LABELS: Record<string, string> = { 'null': '∞', '60': "1'", '180': "3'", '300': "5'" };

interface Props {
  visible: boolean;
  onClose: () => void;
  isHost?: boolean;
  roundCount?: RoundCount;
  onRoundCountChange?: (n: RoundCount) => void;
  timerDuration?: TimerDuration;
  onTimerDurationChange?: (d: TimerDuration) => void;
}

function RestrictToast({ toastKey, tapY }: { toastKey: number; tapY: number }) {
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

  return (
    <Animated.View
      style={[styles.restrictToast, { top: Math.max(80, tapY - 70), opacity, transform: [{ scale }] }]}
      pointerEvents="none"
    >
      <Text style={styles.restrictToastText}>
        Seul l'hôte peut changer les paramètres de la partie.
      </Text>
    </Animated.View>
  );
}

export function GameMenu({ visible, onClose, isHost, roundCount, onRoundCountChange, timerDuration, onTimerDurationChange }: Props) {
  const insets = useSafeAreaInsets();
  const muted = useStore((s) => s.muted);
  const setMuted = useStore((s) => s.setMuted);
  const musicMuted = useStore((s) => s.musicMuted);
  const setMusicMuted = useStore((s) => s.setMusicMuted);
  const [rulesVisible, setRulesVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [restrictToastKey, setRestrictToastKey] = useState(0);
  const [restrictToastY,   setRestrictToastY]   = useState(200);

  return (
    <>
      <RulesModal
        visible={rulesVisible}
        onClose={() => setRulesVisible(false)}
        onShowTutorial={() => { setRulesVisible(false); setTimeout(() => setTutorialVisible(true), 300); }}
      />
      <TutorialModal visible={tutorialVisible} onClose={() => setTutorialVisible(false)} />
      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.58)' }} onPress={onClose} accessible={false}>
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <BlurView style={StyleSheet.absoluteFillObject} intensity={50} tint="dark" />
          </View>
          <RestrictToast toastKey={restrictToastKey} tapY={restrictToastY} />
          <Pressable style={[styles.sheet, { paddingTop: insets.top + 16 }]} onPress={() => {}}>
            <Text style={styles.title}>Options</Text>

            {roundCount !== undefined && (
              <>
                <View style={styles.roundRow}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="layers-outline" size={24} color={palette.brandGreen} />
                    <Text style={styles.rowLabel}>Services</Text>
                  </View>
                  <View style={styles.chipGroup}>
                    {ROUND_OPTIONS.map((n) => (
                      <Pressable
                        key={n}
                        style={({ pressed }) => [
                          styles.roundChip,
                          roundCount === n && styles.roundChipActive,
                          pressed && isHost && styles.pressed,
                        ]}
                        onPress={isHost && onRoundCountChange ? () => { playSound('uiPress'); onRoundCountChange(n); } : !isHost ? (e) => { setRestrictToastY(e.nativeEvent.pageY); setRestrictToastKey((k) => k + 1); } : undefined}
                        accessibilityRole="button"
                        accessibilityLabel={`${n} services${roundCount === n ? ', sélectionné' : ''}`}
                      >
                        <Text style={[styles.roundChipText, roundCount === n && styles.roundChipTextActive]}>
                          {n}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            )}

            {timerDuration !== undefined && (
              <>
                <View style={styles.roundRow}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="timer-outline" size={24} color={palette.brandGreen} />
                    <Text style={styles.rowLabel}>Timer</Text>
                  </View>
                  <View style={styles.chipGroup}>
                    {TIMER_OPTIONS.map((d) => {
                      const key = String(d);
                      const active = timerDuration === d;
                      return (
                        <Pressable
                          key={key}
                          style={({ pressed }) => [
                            styles.roundChip,
                            active && styles.roundChipActive,
                            pressed && isHost && styles.pressed,
                          ]}
                          onPress={isHost && onTimerDurationChange ? () => { playSound('uiPress'); onTimerDurationChange(d); } : !isHost ? (e) => { setRestrictToastY(e.nativeEvent.pageY); setRestrictToastKey((k) => k + 1); } : undefined}
                          accessibilityRole="button"
                          accessibilityLabel={d === null ? 'Sans timer' : `${d / 60} min${active ? ', sélectionné' : ''}`}
                        >
                          <Text style={[styles.roundChipText, active && styles.roundChipTextActive]}>
                            {TIMER_LABELS[key]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            )}

            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => { playSound('uiPress'); setMuted(!muted); }}
              accessibilityRole="switch"
              accessibilityLabel={muted ? 'Activer les effets sonores' : 'Couper les effets sonores'}
            >
              <View style={styles.rowLeft}>
                <Ionicons
                  name={muted ? 'musical-notes-outline' : 'musical-notes-outline'}
                  size={24}
                  color={palette.brandGreen}
                />
                <Text style={styles.rowLabel}>Effets sonores</Text>
              </View>
              <View style={[styles.toggle, muted && styles.toggleOff]}>
                <View style={[styles.toggleThumb, muted && styles.toggleThumbOff]} />
              </View>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => { playSound('uiPress'); setMusicMuted(!musicMuted); }}
              accessibilityRole="switch"
              accessibilityLabel={musicMuted ? 'Activer la musique' : 'Couper la musique'}
            >
              <View style={styles.rowLeft}>
                <Ionicons
                  name={musicMuted ? 'volume-mute-outline' : 'volume-high-outline'}
                  size={24}
                  color={palette.brandGreen}
                />
                <Text style={styles.rowLabel}>Musique</Text>
              </View>
              <View style={[styles.toggle, musicMuted && styles.toggleOff]}>
                <View style={[styles.toggleThumb, musicMuted && styles.toggleThumbOff]} />
              </View>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => { playSound('uiPress'); onClose(); setTimeout(() => setRulesVisible(true), 250); }}
              accessibilityRole="button"
              accessibilityLabel="Règles du jeu"
            >
              <View style={styles.rowLeft}>
                <Ionicons name="book-outline" size={24} color={palette.brandGreen} />
                <Text style={styles.rowLabel}>Règles du jeu</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textPrimary + '66'} />
            </Pressable>

            <View style={styles.handle} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.bgWhite,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: spacing.medium,
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.borderPeach,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 32,
    color: palette.brandPink,
    textTransform: 'uppercase',
    lineHeight: 34,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 17,
    color: palette.textPrimary,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.brandGreen,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOff: {
    backgroundColor: palette.borderPeach,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  toggleThumbOff: {
    alignSelf: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: palette.borderPeach,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  roundChip: {
    width: 40,
    height: 36,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: palette.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundChipActive: {
    backgroundColor: palette.brandPink,
  },
  roundChipText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    color: palette.brandPink,
  },
  roundChipTextActive: {
    color: '#fff',
  },
  pressed: { opacity: 0.75 },

  restrictToast: {
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
  restrictToastText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    color: palette.textPrimary,
    textAlign: 'center',
  },
});
