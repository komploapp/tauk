import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing, radius } from '@/constants/palette';

interface Props {
  visible: boolean;
  onClose: () => void;
  onShowTutorial: () => void;
}

const MODES = [
  {
    key: 'fourneaux',
    label: 'Fourneaux',
    description: 'Réalisez vos défis secrets en cachette et piégez vos convives !',
    active: true,
  },
  {
    key: 'carnage',
    label: 'Carnage',
    description: "Garde un œil sur ta proie sans finir toi-même sur le gril !",
    active: false,
  },
  {
    key: 'binomes',
    label: 'Binomes',
    description: 'Repère ton complice et taukez en même temps !',
    active: false,
  },
] as const;

export function RulesModal({ visible, onClose, onShowTutorial }: Props) {
  const insets = useSafeAreaInsets();
  return (
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
        <Pressable style={[styles.sheet, { paddingTop: insets.top + spacing.medium }]} onPress={() => {}}>
          <Text style={styles.title}>Règles du jeu</Text>
          <View style={styles.modeList}>
            {MODES.map((mode) => (
              <Pressable
                key={mode.key}
                style={({ pressed }) => [
                  styles.modeCard,
                  !mode.active && styles.modeCardDimmed,
                  mode.active && pressed && styles.pressed,
                ]}
                onPress={mode.active ? onShowTutorial : undefined}
                accessibilityRole={mode.active ? 'button' : 'none'}
                accessibilityLabel={mode.active ? `Mode ${mode.label} — voir le tutoriel` : mode.label}
              >
                <Text style={[styles.modeLabel, !mode.active && styles.modeLabelDimmed]}>
                  {mode.label}
                </Text>
                <Text style={[styles.modeDesc, !mode.active && styles.modeDescDimmed]}>
                  {mode.description}
                </Text>
                {!mode.active && (
                  <Text style={styles.comingSoon}>bientôt au menu !</Text>
                )}
              </Pressable>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Text style={styles.closeBtnText}>Fermer</Text>
          </Pressable>
          <View style={styles.handle} />
        </Pressable>
      </Pressable>
    </Modal>
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
    fontSize: 38,
    color: palette.brandPink,
    textTransform: 'uppercase',
    lineHeight: 40,
    marginBottom: 16,
  },
  modeList: {
    gap: 12,
  },
  modeCard: {
    backgroundColor: palette.highlightInner,
    borderRadius: radius.main,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  modeCardDimmed: {
    opacity: 0.4,
  },
  modeLabel: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 28,
    lineHeight: 30,
    color: palette.brandPink,
    textTransform: 'uppercase',
  },
  modeLabelDimmed: {
    color: palette.textPrimary,
  },
  modeDesc: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.textPrimary,
  },
  modeDescDimmed: {},
  comingSoon: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 11,
    color: palette.brandGreen,
    marginTop: 2,
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: palette.brandGreen,
    borderRadius: radius.main,
    paddingVertical: spacing.xsmall,
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 18,
    lineHeight: 24,
    color: '#fff',
  },
  pressed: { opacity: 0.8 },
});
