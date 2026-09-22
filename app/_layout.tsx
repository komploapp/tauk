import { useFonts } from 'expo-font';
import { Recursive_400Regular, Recursive_600SemiBold } from '@expo-google-fonts/recursive';
import { Staatliches_400Regular } from '@expo-google-fonts/staatliches';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loaded && Platform.OS !== 'web') SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded && !timedOut) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
