import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { ToqueBackground } from '@/components/ToqueBackground';
import { useThemeMusic } from '@/hooks/useThemeMusic';
import { LanguagePicker } from '@/components/LanguagePicker';
import { GameMenu } from '@/components/GameMenu';
import LogoSvg from '@/assets/images/tauk-logo.svg';
import HomeBlobTop from '@/assets/images/home-blob-top.svg';
import { palette, spacing, radius, border } from '@/constants/palette';
import { useStore } from '@/store';
import { t } from '@/lib/i18n';
import { playSound } from '@/lib/sound';

export default function HomeScreen() {
  const lang = useStore((s) => s.lang);
  const insets = useSafeAreaInsets();
  useThemeMusic();
  const { width: screenWidth } = useWindowDimensions();
  const [menuVisible, setMenuVisible] = useState(false);

  const topBlobX = useSharedValue(0);
  const bottomBlobX = useSharedValue(0);

  useEffect(() => {
    useStore.getState().reset();
    topBlobX.value = withRepeat(
      withTiming(-40, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    bottomBlobX.value = withRepeat(
      withTiming(-30, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const topBlobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: topBlobX.value }],
  }));

  const bottomBlobStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: -1 }, { translateX: bottomBlobX.value }],
  }));
  const [codeActive, setCodeActive] = useState(false);
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);

  function handleCodeChange(val: string) {
    const upper = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setCode(upper);
    if (upper.length === 4) {
      router.push({ pathname: '/join', params: { code: upper } });
    }
  }

  function handleChipPress() {
    if (codeActive) {
      inputRef.current?.focus();
    } else {
      setCodeActive(true);
    }
  }

  const bottomPadding = Math.max(insets.bottom, spacing.medium);

  const blobWidth = screenWidth + 80;

  return (
    <View style={styles.root}>
      <ToqueBackground />
      <Animated.View style={[styles.blobTop, topBlobStyle]} pointerEvents="none">
        <HomeBlobTop width={blobWidth} height={49} preserveAspectRatio="none" />
      </Animated.View>
      <Animated.View style={[styles.blobBottom, bottomBlobStyle]} pointerEvents="none">
        <HomeBlobTop width={blobWidth} height={49} preserveAspectRatio="none" />
      </Animated.View>
      <GameMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />

      {/*
        KeyboardAvoidingView fills the root (flex: 1).
        behavior="padding" on iOS: adds bottom padding = keyboard height.
        The spacer (flex: 1) shrinks → buttons stay just above the keyboard.
        SafeAreaView only handles the top inset; bottom is handled by
        bottomPadding below so it doesn't double-count with the keyboard offset.
      */}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.topBar}>
            <LanguagePicker />
            <Pressable
              style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}
              onPress={() => { playSound('uiPress'); setMenuVisible(true); }}
              accessibilityRole="button"
              accessibilityLabel="Paramètres"
            >
              <Ionicons name="settings-outline" size={28} color={palette.brandPink} />
            </Pressable>
          </View>

          <View style={styles.top}>
            <View style={styles.logoWrap}>
              <LogoSvg width={315} height={160} />
            </View>
            <Text style={styles.tagline}>{t(lang, 'tagline')}</Text>
          </View>

          <View style={styles.spacer} />

          <View style={[styles.buttons, { paddingBottom: bottomPadding + 24 }]}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={() => { playSound('uiPress'); router.push('/config'); }}
              accessibilityRole="button"
              accessibilityLabel={t(lang, 'startGame')}
            >
              <Text style={styles.primaryBtnText}>{t(lang, 'startGame')}</Text>
            </Pressable>

            {/* Outer View — two independent Pressables to avoid Fabric propagation bugs */}
            <View style={styles.secondaryBtn}>
              <Pressable
                style={({ pressed }) => [styles.joinPressable, pressed && styles.joinPressed]}
                onPress={() => { playSound('uiPress'); router.push('/join'); }}
                accessibilityRole="button"
                accessibilityLabel={t(lang, 'join')}
              >
                <Text style={styles.secondaryBtnText}>{t(lang, 'join')}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.codeChip, pressed && styles.chipPressed]}
                onPress={handleChipPress}
                accessibilityRole="button"
                accessibilityLabel="Saisir le code de la partie"
              >
                {codeActive ? (
                  <TextInput
                    ref={inputRef}
                    style={styles.codeInput}
                    value={code}
                    onChangeText={handleCodeChange}
                    maxLength={4}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    spellCheck={false}
                    keyboardType="default"
                    autoFocus
                    placeholder="CODE"
                    placeholderTextColor={`${palette.brandPink}66`}
                    selectionColor={palette.brandPink}
                    onBlur={() => { setCodeActive(false); setCode(''); }}
                  />
                ) : (
                  <Text style={styles.codeText}>XXXX</Text>
                )}
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const fontBase = { fontFamily: 'Recursive_400Regular' } as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgWhite,
  },
  blobTop: {
    position: 'absolute',
    top: 0,
    left: -40,
    zIndex: 0,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -10,
    left: -40,
    zIndex: 0,
  },
  flex1: { flex: 1, zIndex: 1 },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 26,
    zIndex: 1,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  settingsBtn: {
    backgroundColor: palette.bgPink,
    padding: 8,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: {
    width: 340,
    alignItems: 'center',
    gap: spacing.medium,
    paddingTop: 40,
  },
  logoWrap: {
    width: 315,
    height: 160,
  },
  tagline: {
    ...fontBase,
    fontSize: 20,
    lineHeight: 26,
    color: palette.textPrimary,
    textAlign: 'center',
    width: 286,
  },
  spacer: { flex: 1 },
  buttons: {
    width: 340,
    gap: spacing.medium,
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
  joinPressable: {
    paddingVertical: 2,
  },
  joinPressed: { opacity: 0.6 },
  secondaryBtnText: {
    ...fontBase,
    fontSize: 20,
    lineHeight: 26,
    color: palette.brandGreen,
  },
  codeChip: {
    backgroundColor: palette.bgPink,
    borderRadius: radius.chip,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: { opacity: 0.7 },
  codeText: {
    ...fontBase,
    fontSize: 24,
    color: palette.brandPink,
    letterSpacing: 4,
    opacity: 0.5,
  },
  codeInput: {
    ...fontBase,
    fontSize: 24,
    color: palette.brandPink,
    letterSpacing: 4,
    textAlign: 'center',
    minWidth: 70,
    padding: 0,
    margin: 0,
  },
  pressed: { opacity: 0.8 },
});
