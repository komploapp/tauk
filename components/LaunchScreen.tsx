import { useEffect } from 'react';
import { StyleSheet, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withDelay, withTiming, Easing, runOnJS,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { ToqueBackground } from '@/components/ToqueBackground';
import { palette } from '@/constants/palette';
import LogoInvertSvg from '@/assets/images/logo-invert.svg';

const GENTLE = Easing.inOut(Easing.cubic);

// Timeline (ms) — ~40% plus lent que le spec Figma d'origine
const LOGO_DELAY      = 400;
const LOGO_DURATION   = 850;
const CIRCLE_DELAY    = LOGO_DELAY + LOGO_DURATION + 1;         // 1251
const CIRCLE_DURATION = 220;
const DISSOLVE_DELAY    = CIRCLE_DELAY + CIRCLE_DURATION + 140; // 1611
const DISSOLVE_DURATION = 1000;

interface Props { onDone: () => void }

export function LaunchScreen({ onDone }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const circleRadius   = Math.sqrt((W / 2) ** 2 + (H / 2) ** 2);
  const circleDiameter = circleRadius * 2;

  const logoX       = useSharedValue(-W);
  const circleScale = useSharedValue(0);
  const opacity     = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS !== 'web') void SplashScreen.hideAsync();

    logoX.value = withDelay(
      LOGO_DELAY,
      withTiming(0, { duration: LOGO_DURATION, easing: GENTLE }),
    );

    circleScale.value = withDelay(
      CIRCLE_DELAY,
      withTiming(1, { duration: CIRCLE_DURATION, easing: GENTLE }),
    );

    opacity.value = withDelay(
      DISSOLVE_DELAY,
      withTiming(0, { duration: DISSOLVE_DURATION, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    // Math.round évite les positions sub-pixel qui causent le flou
    transform: [{ translateX: Math.round(logoX.value) }],
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
      <ToqueBackground />

      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <LogoInvertSvg width={315} height={160} />
      </Animated.View>

      <Animated.View
        style={[
          styles.circle,
          {
            width: circleDiameter,
            height: circleDiameter,
            borderRadius: circleRadius,
            top: H / 2 - circleRadius,
            left: W / 2 - circleRadius,
          },
          circleStyle,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: palette.brandPink,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 315,
    height: 160,
    zIndex: 1,
  },
  circle: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    zIndex: 2,
  },
});
