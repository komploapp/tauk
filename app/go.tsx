import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { ToqueBackground } from '@/components/ToqueBackground';
import { palette } from '@/constants/palette';

const ANIM_DURATION_MS = 1600;

export default function GoScreen() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);

  function dismiss() {
    router.replace('/game');
  }

  useEffect(() => {
    // Phase 1 : GO! bondit à l'écran
    scale.value = withSpring(1, { mass: 0.6, damping: 9, stiffness: 220 });

    // Phase 2 : fade out puis dismiss
    opacity.value = withSequence(
      withDelay(
        ANIM_DURATION_MS - 400,
        withTiming(0, { duration: 400 }, (finished) => {
          if (finished) runOnJS(dismiss)();
        }),
      ),
    );
  }, []);

  const animatedGoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.root}>
      <ToqueBackground />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
      </SafeAreaView>

      <View style={styles.center} pointerEvents="none">
        <Animated.Text style={[styles.go, animatedGoStyle]}>GO!</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgWhite,
  },
  safeArea: {
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 20, 134, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 16,
    color: palette.brandPink,
    lineHeight: 20,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 20, 134, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: {
    fontSize: 16,
    color: palette.brandPink,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  go: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 186,
    lineHeight: 186,
    color: palette.brandPink,
    textAlign: 'center',
  },
});
