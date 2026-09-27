import { useFonts } from 'expo-font';
import { Recursive_400Regular, Recursive_600SemiBold } from '@expo-google-fonts/recursive';
import { Staatliches_400Regular } from '@expo-google-fonts/staatliches';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LaunchScreen } from '@/components/LaunchScreen';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Recursive_400Regular,
    Recursive_600SemiBold,
    Staatliches_400Regular,
  });
  const [timedOut, setTimedOut] = useState(false);
  const [showLaunch, setShowLaunch] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // SplashScreen.hideAsync() is now called inside LaunchScreen
  // so the native pink splash → custom pink overlay transition is seamless.

  if (!loaded && !timedOut) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="spectateur" options={{ animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="buzz"       options={{ animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="accuse"     options={{ animation: 'fade', animationDuration: 200 }} />
      </Stack>
      {showLaunch && <LaunchScreen onDone={() => setShowLaunch(false)} />}
    </GestureHandlerRootView>
  );
}
