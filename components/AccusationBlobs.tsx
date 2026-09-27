import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import HomeBlobTop from '@/assets/images/home-blob-top.svg';

export function AccusationBlobs() {
  const { width: screenWidth } = useWindowDimensions();
  const topBlobX = useSharedValue(0);
  const bottomBlobX = useSharedValue(0);

  useEffect(() => {
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

  const blobWidth = screenWidth + 80;

  return (
    <>
      <Animated.View style={[styles.blobTop, topBlobStyle]} pointerEvents="none">
        <HomeBlobTop width={blobWidth} height={49} preserveAspectRatio="none" />
      </Animated.View>
      <Animated.View style={[styles.blobBottom, bottomBlobStyle]} pointerEvents="none">
        <HomeBlobTop width={blobWidth} height={49} preserveAspectRatio="none" />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
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
});
