import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '@/constants/palette';
import DefisSvg from '@/assets/images/didacticiel-defis.svg';
import AccusationSvg from '@/assets/images/didacticiel-accusation.svg';
import LeaderboardSvg from '@/assets/images/didacticiel-leaderboard.svg';

const ILLUSTRATION_RATIO = 240 / 292;
const HOLD_DURATION  = 2800;
const FADE_DURATION  = 350;
const FILL_DURATION  = 1800;
const FILL_HOLD      = 700;
const FILL_PAUSE     = 600;
const PAGE_OUT_MS    = 150;
const PAGE_IN_MS     = 200;

type ViewBCards = { kind: 'cards'; examples: readonly [string, string] };
type ViewBTauk  = { kind: 'tauk' };
type ViewB = ViewBCards | ViewBTauk;

type Step = {
  title: string;
  subtitle: string;
  Illustration: React.ComponentType<{ width: number; height: number }>;
  viewB: ViewB | null; // null = illustration seule, pas de crossfade
  startWithViewB?: boolean;
  tip: string;
};

const STEPS: Step[] = [
  {
    title: 'réalise tes défis !',
    subtitle: 'Réussis un défi en douce et swipe-le pour lancer un compte à rebours de 10 secondes :',
    Illustration: DefisSvg,
    viewB: {
      kind: 'cards',
      examples: [
        'Termine toutes tes phrases en chuchotant',
        'Touche ton nez discrètement quand Thomas parle',
      ],
    },
    tip: 'Si personne ne te grille : +1 point !',
  },
  {
    title: 'surveille tes amis',
    subtitle: "Dès que tu penses avoir grillé quelqu'un en plein acte, accuse-le !",
    Illustration: AccusationSvg,
    viewB: { kind: 'tauk' },
    startWithViewB: true,
    tip: "Tu as vu juste ? +1 point. Sinon tu en donnes un à l'accusé !",
  },
  {
    title: 'Remporte la partie',
    subtitle: 'Le chef le plus rusé et le moins grillé remporte la tablée !',
    Illustration: LeaderboardSvg,
    viewB: null,
    tip: 'Fais tes défis, démasque les autres, et gare aux fausses accusations !',
  },
];

function DragHandle() {
  return (
    <View style={styles.dragHandle}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.dragRow}>
          <View style={styles.dragDot} />
          <View style={styles.dragDot} />
        </View>
      ))}
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function TutorialModal({ visible, onClose }: Props) {
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);

  const cardWidth   = Math.min(340, width - 48);
  const innerWidth  = cardWidth - spacing.medium * 2;
  const frameHeight = Math.round(innerWidth * ILLUSTRATION_RATIO);

  const isLast  = step === STEPS.length - 1;
  const current = STEPS[step];

  /* ── Crossfade illustration ↔ View B ─────────────────────────── */
  const illOpacity = useRef(new Animated.Value(1)).current;
  const swapTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showingIll = useRef(true);

  function clearSwap() {
    if (swapTimer.current) clearTimeout(swapTimer.current);
    swapTimer.current = null;
    illOpacity.stopAnimation();
  }

  function scheduleNext() {
    swapTimer.current = setTimeout(() => {
      showingIll.current = !showingIll.current;
      Animated.timing(illOpacity, {
        toValue: showingIll.current ? 1 : 0,
        duration: FADE_DURATION,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished) scheduleNext(); });
    }, HOLD_DURATION);
  }

  useEffect(() => {
    if (!visible) { clearSwap(); return; }
    clearSwap();
    if (!current.viewB) {
      // Pas de View B : illustration fixe, pas de crossfade
      showingIll.current = true;
      illOpacity.setValue(1);
      return clearSwap;
    }
    const startOnIll = !current.startWithViewB;
    showingIll.current = startOnIll;
    illOpacity.setValue(startOnIll ? 1 : 0);
    scheduleNext();
    return clearSwap;
  }, [visible, step]);

  /* ── Remplissage animé (cartes droite→gauche / TAUK gauche→droite) */
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) { fillAnim.stopAnimation(); fillAnim.setValue(0); return; }
    fillAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(FILL_PAUSE),
        Animated.timing(fillAnim, {
          toValue: 1,
          duration: FILL_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.delay(FILL_HOLD),
        Animated.timing(fillAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => { loop.stop(); fillAnim.setValue(0); };
  }, [visible, step]);

  /* ── Transition fluide entre onglets ─────────────────────────── */
  const pageAnim = useRef(new Animated.Value(1)).current;

  // Ref mise à jour à chaque render pour que le panResponder ait toujours la version fraîche
  const navigateRef = useRef((_next: number) => {});
  navigateRef.current = (nextStep: number) => {
    Animated.timing(pageAnim, {
      toValue: 0,
      duration: PAGE_OUT_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(pageAnim, {
        toValue: 1,
        duration: PAGE_IN_MS,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  /* ── Refs anti-stale-closure pour panResponder ───────────────── */
  const stepRef    = useRef(step);
  const isLastRef  = useRef(isLast);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { isLastRef.current = isLast; }, [isLast]);

  /* ── Reset à l'ouverture ─────────────────────────────────────── */
  useEffect(() => {
    if (visible) {
      pageAnim.setValue(1);
      setStep(0);
    }
  }, [visible]);

  /* ── PanResponder swipe gauche/droite ────────────────────────── */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, { dx }) => {
        if (dx < -40) {
          // swipe gauche : avance, ou revient au premier onglet
          const next = isLastRef.current ? 0 : stepRef.current + 1;
          navigateRef.current(next);
        } else if (dx > 40) {
          // swipe droite : recule, ou revient au dernier onglet
          const prev = stepRef.current > 0 ? stepRef.current - 1 : STEPS.length - 1;
          navigateRef.current(prev);
        }
      },
    })
  ).current;

  const viewBOpacity = illOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const fillWidth    = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, innerWidth] });

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <BlurView style={StyleSheet.absoluteFillObject} intensity={50} tint="dark" />
        </View>

        <View style={[styles.card, { width: cardWidth }]} {...panResponder.panHandlers}>

          {/* ── Dots + Close ──────────────────────────── */}
          <View style={styles.topRow}>
            <View style={styles.topSpacer} />
            <View style={styles.dotsGroup}>
              {STEPS.map((_, i) => (
                <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
              ))}
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fermer le tutoriel"
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={palette.textPrimary} />
            </Pressable>
          </View>

          {/* ── Contenu animé (fade entre onglets) ────── */}
          <Animated.View style={{ opacity: pageAnim, width: '100%', alignItems: 'center' }}>

            {/* Titre + Sous-titre */}
            <View style={[styles.header, { width: innerWidth }]}>
              <Text style={styles.title}>{current.title}</Text>
              <Text style={styles.subtitle}>{current.subtitle}</Text>
            </View>

            {/* Zone crossfade illustration ↔ View B */}
            <View style={[styles.contentArea, { width: innerWidth, height: frameHeight }]}>

              {/* Vue A — illustration */}
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: illOpacity }]}>
                <current.Illustration width={innerWidth} height={frameHeight} />
              </Animated.View>

              {/* Vue B — masquée si l'étape n'en a pas */}
              {current.viewB !== null && (
              <Animated.View style={[styles.viewB, { opacity: viewBOpacity }]}>
                {current.viewB.kind === 'cards' ? (
                  <>
                    <View style={styles.taskRow}>
                      <Animated.View
                        style={[styles.cardFillOverlay, { width: fillWidth }]}
                        pointerEvents="none"
                      />
                      <View style={styles.handleArea}><DragHandle /></View>
                      <Text style={styles.cardText}>{current.viewB.examples[0]}</Text>
                    </View>
                    <View style={[styles.taskRow, styles.taskBorder]}>
                      <View style={styles.handleArea}><DragHandle /></View>
                      <Text style={styles.cardText}>{current.viewB.examples[1]}</Text>
                    </View>
                    <View style={[styles.taskRow, styles.taskBorder]}>
                      <View style={styles.handleArea}><DragHandle /></View>
                      <Text style={styles.cardText}>{current.viewB.examples[0]}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.taukBtn}>
                    <Animated.View
                      style={[styles.taukChargeBar, { width: fillWidth }]}
                      pointerEvents="none"
                    />
                    <Text style={styles.taukLabel}>TAUK !</Text>
                    <Text style={styles.taukSub}>Maintenir pour accuser</Text>
                  </View>
                )}
              </Animated.View>
              )}

            </View>

            {/* Tip box */}
            <View style={[styles.tipBox, { width: cardWidth }]}>
              <Text style={styles.tipText}>{current.tip}</Text>
            </View>

          </Animated.View>

        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },

  card: {
    backgroundColor: palette.bgWhite,
    borderRadius: radius.main,
    paddingTop: spacing.medium,
    alignItems: 'center',
    overflow: 'hidden',
  },

  /* Dots + close */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.medium,
    marginBottom: 12,
  },
  topSpacer: { width: 32 },
  dotsGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.bgPink,
  },
  dotActive: { backgroundColor: palette.brandPink },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Titre + sous-titre */
  header: {
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 38,
    lineHeight: 40,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.textPrimary,
    textAlign: 'left',
  },

  /* Zone crossfade */
  contentArea: {
    marginBottom: spacing.medium,
  },

  /* Vue B — conteneur commun */
  viewB: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.highlightInner,
    borderRadius: radius.main,
    overflow: 'hidden',
    flexDirection: 'column',
  },

  /* ── Cartes ─────────────────────────────── */
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: palette.bgWhite,
    overflow: 'hidden',
  },
  taskBorder: {
    borderTopWidth: 1,
    borderTopColor: palette.borderPeach,
  },
  handleArea: {
    paddingLeft: spacing.small,
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFillOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.brandPink,
    opacity: 0.14,
  },
  dragHandle: { gap: 3 },
  dragRow: { flexDirection: 'row', gap: 3 },
  dragDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.borderPeach,
  },
  cardText: {
    flex: 1,
    paddingRight: spacing.small,
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    lineHeight: 22,
    color: palette.textPrimary,
  },

  /* ── Bouton TAUK ─────────────────────────── */
  taukBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.brandPink,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderTopColor: '#e0006c',
    borderBottomColor: '#e0006c',
    overflow: 'hidden',
  },
  taukChargeBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    opacity: 0.2,
  },
  taukLabel: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 72,
    lineHeight: 68,
    color: palette.textInvert,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  taukSub: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.textInvert,
    opacity: 0.9,
  },

  /* Tip box */
  tipBox: {
    backgroundColor: palette.brandGreen,
    padding: spacing.medium,
    borderBottomLeftRadius: radius.main,
    borderBottomRightRadius: radius.main,
  },
  tipText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    lineHeight: 22,
    color: palette.textInvert,
  },
});
