import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ToqueBackground } from '@/components/ToqueBackground';
import LogoSvg from '@/assets/images/tauk-logo.svg';
import { palette, spacing, radius, border } from '@/constants/palette';

const TAGLINE = 'La cuisine en jeu, toi au menu';

export default function HomeScreen() {
  return (
    <View style={styles.root}>
      <ToqueBackground />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <View style={styles.logoWrap}>
            <LogoSvg width={315} height={160} />
          </View>
          <Text style={styles.tagline}>{TAGLINE}</Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => router.push('/config')}
            accessibilityRole="button"
            accessibilityLabel="Lancer la partie"
          >
            <Text style={styles.primaryBtnText}>Lancer la partie</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={() => router.push('/join')}
            accessibilityRole="button"
            accessibilityLabel="Rejoindre une partie avec un code"
          >
            <Text style={styles.secondaryBtnText}>Rejoindre</Text>
            <View style={styles.codeChip}>
              <Text style={styles.codeText}>XXXX</Text>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const fontBase = { fontFamily: 'Recursive_400Regular' } as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgWhite,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 26,
    zIndex: 1,
  },
  top: {
    width: 340,
    alignItems: 'center',
    gap: spacing.medium,
    paddingTop: 65,
  },
  logoWrap: {
    width: 315,
    height: 160,
  },
  tagline: {
    ...fontBase,
    fontSize: 20,
    lineHeight: 26,
    color: palette.brandGreen,
    textAlign: 'center',
    width: 286,
  },
  spacer: { flex: 1 },
  buttons: {
    width: 340,
    gap: spacing.medium,
    paddingBottom: spacing.medium,
  },
  primaryBtn: {
    backgroundColor: palette.brandGreen,
    borderRadius: radius.main,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.xsmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    ...fontBase,
    fontSize: 20,
    lineHeight: 26,
    color: palette.textInvert,
  },
  secondaryBtn: {
    backgroundColor: palette.bgYellowLight,
    borderWidth: border.width,
    borderColor: palette.brandGreen,
    borderRadius: radius.main,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.xsmall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: radius.main,
  },
  secondaryBtnText: {
    ...fontBase,
    fontSize: 20,
    lineHeight: 26,
    color: palette.brandGreen,
  },
  codeChip: {
    backgroundColor: palette.bgPink,
    borderRadius: radius.chip,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  codeText: {
    ...fontBase,
    fontSize: 24,
    color: palette.brandPink,
    letterSpacing: 4.8,
    opacity: 0.5,
  },
  pressed: { opacity: 0.8 },
});
