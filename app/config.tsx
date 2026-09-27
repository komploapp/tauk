import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ToqueBackground } from '@/components/ToqueBackground';
import { TutorialModal } from '@/components/TutorialModal';
import OignonSvg from '@/assets/images/oignon-heureux.svg';
import OeufSvg from '@/assets/images/oeuf-loupe.svg';
import ChamallowSvg from '@/assets/images/chamallow.svg';
import { palette, spacing, radius, border } from '@/constants/palette';
import { createGame, getOrCreateDeviceId } from '@/lib/game';
import { t } from '@/lib/i18n';
import { useStore } from '@/store';
import type { Character } from '@/store';
import { playSound } from '@/lib/sound';

const CARD_W = 360;
const CARD_ASPECT = 0.5;

const ALL_CHARACTERS: Character[] = [
  'choux', 'avocado', 'onion', 'carot', 'banana',
  'potatoes', 'poivron', 'aubergine', 'mushroom',
];

interface ModeCardProps {
  cardWidth: number;
  title: string;
  description: string;
  players: string;
  Character: React.FC<{ width: number; height: number }>;
  charWidth: number;
  charHeight: number;
  charLeft: number;
  charRotate?: string;
  comingSoon?: boolean;
  onPress?: () => void;
  onInfoPress?: () => void;
}

function PlayersBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function ModeCard({
  cardWidth, title, description, players, Character, charWidth, charHeight,
  charLeft, charRotate, comingSoon = false, onPress, onInfoPress,
}: ModeCardProps) {
  const lang = useStore((s) => s.lang);
  const scale = cardWidth / CARD_W;
  const cardHeight = Math.round(cardWidth * CARD_ASPECT);
  const sCharW = Math.round(charWidth * scale);
  const sCharH = Math.round(charHeight * scale);
  const sCharL = Math.round(charLeft * scale);
  const contentWidth = Math.round(152 * scale);

  return (
    <View style={[styles.cardWrap, { width: cardWidth + 2 * border.width, height: cardHeight + 2 * border.width }]}>
      <View style={styles.card}>
        <Pressable
          onPress={!comingSoon ? onPress : undefined}
          style={({ pressed }) => [
            styles.cardPressable,
            comingSoon && styles.cardDimmed,
            pressed && !comingSoon && styles.pressed,
          ]}
          accessibilityRole={!comingSoon ? 'button' : undefined}
        >
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.cardBg} />
            <View style={styles.cardHighlight} />
          </View>
          <View style={[styles.cardContent, { width: contentWidth }]}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{title}</Text>
              {onInfoPress && (
                <Pressable onPress={onInfoPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Voir le tutoriel ${title}`}>
                  <Ionicons name="information-circle-outline" size={22} color={palette.brandGreen} />
                </Pressable>
              )}
            </View>
            <Text style={styles.cardDesc}>{description}</Text>
          </View>
          <View
            style={[
              styles.charWrap,
              { left: sCharL, width: sCharW, height: sCharH },
              charRotate ? { transform: [{ rotate: charRotate }] } : undefined,
            ]}
          >
            <Character width={sCharW} height={sCharH} />
          </View>
          <PlayersBadge label={players} />
        </Pressable>
        {comingSoon && (
          <View style={styles.comingSoonWrap}>
            <View style={styles.comingSoonBox}>
              <Text style={styles.comingSoonText}>{t(lang, 'comingSoon')}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ConfigScreen() {
  type TimerDuration = null | 60 | 180 | 300;
  const TIMER_OPTIONS: TimerDuration[] = [null, 60, 180, 300];
  const TIMER_LABELS: Record<string, string> = { 'null': '∞', '60': "1'", '180': "3'", '300': "5'" };

  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(screenWidth - 2 * spacing.medium, CARD_W);

  const [modalVisible, setModalVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [rounds, setRounds] = useState<3 | 6 | 10>(3);
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setGame, setMyPlayer, setDeviceId, lang } = useStore();

  async function handleCreate() {
    if (pseudo.trim().length < 2) { setError(t(lang, 'pseudoTooShort')); return; }

    setLoading(true);
    setError('');

    try {
      const deviceId = await getOrCreateDeviceId();
      setDeviceId(deviceId);

      const character = ALL_CHARACTERS[Math.floor(Math.random() * ALL_CHARACTERS.length)];
      const { game, player } = await createGame(deviceId, pseudo.trim(), character, 7, rounds, timerDuration);
      setGame(game);
      setMyPlayer(player);

      setModalVisible(false);
      setPseudo('');
      router.push('/host');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ToqueBackground />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel="Paramètres"
          >
            <Ionicons name="settings-outline" size={28} color={palette.brandPink} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>{t(lang, 'modeSection')}</Text>

          <View style={styles.cardList}>
            <ModeCard
              cardWidth={cardWidth}
              title="Fourneaux"
              description="Réalisez vos défis secrets en cachette et piégez vos convives !"
              players="2-10 joueurs"
              Character={OignonSvg}
              charWidth={168}
              charHeight={175}
              charLeft={184}
              onPress={() => { playSound('uiPress'); setModalVisible(true); }}
              onInfoPress={() => { playSound('uiPress'); setTutorialVisible(true); }}
            />
            <ModeCard
              cardWidth={cardWidth}
              title="Carnage"
              description="Garde un œil sur ta proie sans finir toi-même sur le gril !"
              players="3-10 joueurs"
              Character={OeufSvg}
              charWidth={157}
              charHeight={148}
              charLeft={201}
              comingSoon
            />
            <ModeCard
              cardWidth={cardWidth}
              title="Binomes"
              description="Repère ton complice et taukez en même temps !"
              players="3-10 joueurs"
              Character={ChamallowSvg}
              charWidth={98}
              charHeight={207}
              charLeft={211}
              charRotate="20.04deg"
              comingSoon
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      <TutorialModal visible={tutorialVisible} onClose={() => setTutorialVisible(false)} />

      <Modal
        visible={modalVisible}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => !loading && setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.58)' }}>
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <BlurView style={StyleSheet.absoluteFillObject} intensity={50} tint="dark" />
          </View>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => !loading && setModalVisible(false)}
          />
          <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t(lang, 'pseudoTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t(lang, 'pseudoSubtitle')}</Text>

            <TextInput
              style={styles.modalInput}
              value={pseudo}
              onChangeText={setPseudo}
              placeholder={t(lang, 'pseudoPlaceholder')}
              placeholderTextColor={palette.textPrimary + '55'}
              maxLength={13}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            <View style={styles.roundsSection}>
              <Text style={styles.roundsLabel}>Nombre de services</Text>
              <View style={styles.roundsRow}>
                {([3, 6, 10] as const).map((n) => (
                  <Pressable
                    key={n}
                    style={({ pressed }) => [
                      styles.roundsChip,
                      rounds === n && styles.roundsChipActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => { playSound('uiPress'); setRounds(n); }}
                    accessibilityRole="radio"
                    accessibilityLabel={`${n} services`}
                    accessibilityState={{ selected: rounds === n }}
                  >
                    <Text style={[styles.roundsChipText, rounds === n && styles.roundsChipTextActive]}>
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.roundsSection}>
              <Text style={styles.roundsLabel}>Durée du timer</Text>
              <View style={styles.roundsRow}>
                {TIMER_OPTIONS.map((d) => {
                  const key = String(d);
                  const active = timerDuration === d;
                  return (
                    <Pressable
                      key={key}
                      style={({ pressed }) => [
                        styles.roundsChip,
                        active && styles.roundsChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => { playSound('uiPress'); setTimerDuration(d); }}
                      accessibilityRole="radio"
                      accessibilityLabel={d === null ? 'Sans timer' : `${d / 60} minute${d > 60 ? 's' : ''}`}
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.roundsChipText, active && styles.roundsChipTextActive]}>
                        {TIMER_LABELS[key]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {error ? <Text style={styles.modalError}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.modalBtn,
                (loading || pseudo.trim().length < 2) && styles.modalBtnDisabled,
                pressed && styles.pressed,
              ]}
              onPress={handleCreate}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalBtnText}>{t(lang, 'createGame')}</Text>
              }
            </Pressable>
          </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
    paddingTop: 12,
    paddingBottom: 4,
    width: '100%',
  },
  backBtn: { padding: 4 },
  settingsBtn: { padding: 4 },
  backBtnText: { fontFamily: 'Recursive_600SemiBold', fontSize: 22, color: palette.brandPink },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.medium,
    paddingTop: spacing.small,
    paddingBottom: spacing.medium,
    gap: spacing.medium,
  },
  sectionTitle: { fontFamily: 'Recursive_600SemiBold', fontSize: 22, color: palette.brandPink },
  cardList: { gap: spacing.xsmall },

  /* Bordure sur le wrapper externe — dimensions calculées dynamiquement dans ModeCard */
  cardWrap: {
    borderRadius: radius.main + border.width,
    borderWidth: border.width,
    borderColor: palette.borderPeach,
  },
  /* Clip du contenu sur le View interne — dimensions exactes 360×207 */
  card: {
    flex: 1,
    borderRadius: radius.main,
    overflow: 'hidden',
  },
  cardPressable: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'flex-start',
    paddingTop: spacing.small,
    paddingHorizontal: spacing.small,
  },
  cardDimmed: { opacity: 0.4 },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.bgYellowLight,
  },
  cardHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderTopWidth: 5, borderLeftWidth: 5, borderColor: palette.highlightInner, borderRadius: radius.main,
  },
  cardContent: { gap: 8, zIndex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontFamily: 'Recursive_600SemiBold', fontSize: 18, color: palette.brandGreen },
  cardDesc: { fontFamily: 'Recursive_400Regular', fontSize: 14, color: palette.textPrimary, lineHeight: 20 },
  charWrap: { position: 'absolute', bottom: 0 },
  badge: {
    position: 'absolute', top: 13, right: 12,
    backgroundColor: palette.bgPink, borderRadius: radius.chip,
    paddingHorizontal: 6, paddingVertical: 3, zIndex: 2,
  },
  badgeText: { fontFamily: 'Recursive_400Regular', fontSize: 14, color: palette.brandPink, opacity: 0.5 },
  comingSoonWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  comingSoonBox: {
    backgroundColor: palette.bgWhite, paddingHorizontal: spacing.medium, paddingVertical: spacing.xsmall,
    borderRadius: 4, shadowColor: palette.shadowYellow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 6,
    maxWidth: '90%',
  },
  comingSoonText: {
    fontFamily: 'Staatliches_400Regular', fontSize: 38, color: palette.brandPink,
    textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center',
  },

  // Modal
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.001)' },
  modalWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  modalSheet: {
    backgroundColor: '#fff6f2',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 26, paddingTop: 32, paddingBottom: 48,
    gap: 16,
  },
  modalTitle: {
    fontFamily: 'Staatliches_400Regular', fontSize: 38,
    color: palette.brandPink, textTransform: 'uppercase',
  },
  modalSubtitle: {
    fontFamily: 'Recursive_400Regular', fontSize: 16,
    color: palette.textPrimary, marginTop: -8,
  },
  modalInput: {
    fontFamily: 'Recursive_400Regular', fontSize: 20,
    color: palette.textPrimary, backgroundColor: palette.bgWhite,
    borderWidth: 2, borderColor: palette.borderPeach, borderRadius: radius.main,
    paddingHorizontal: spacing.medium, paddingVertical: 14,
    marginTop: 8,
  },
  roundsSection: { gap: 8 },
  roundsLabel: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 14,
    color: palette.brandGreen,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roundsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roundsChip: {
    flex: 1,
    backgroundColor: palette.bgWhite,
    borderWidth: 2,
    borderColor: palette.borderPeach,
    borderRadius: radius.main,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundsChipActive: {
    borderColor: palette.brandPink,
    backgroundColor: palette.bgPink,
  },
  roundsChipText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 22,
    color: palette.textPrimary,
    opacity: 0.5,
  },
  roundsChipTextActive: {
    color: palette.brandPink,
    opacity: 1,
  },
  modalError: { fontFamily: 'Recursive_400Regular', fontSize: 14, color: palette.brandPink },
  modalBtn: {
    backgroundColor: palette.brandGreen, borderRadius: radius.main,
    paddingVertical: spacing.xsmall, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  modalBtnDisabled: { opacity: 0.4 },
  modalBtnText: { fontFamily: 'Recursive_400Regular', fontSize: 20, lineHeight: 26, color: '#ffffff' },
  pressed: { opacity: 0.8 },
});
