import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ToqueBackground } from '@/components/ToqueBackground';
import { palette, spacing, radius } from '@/constants/palette';
import { joinGame, getOrCreateDeviceId } from '@/lib/game';
import { useStore } from '@/store';

export default function JoinScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code?.toUpperCase().slice(0, 4) ?? '');
  const [pseudo, setPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setGame, setMyPlayer, setDeviceId } = useStore();

  async function handleJoin() {
    if (code.length !== 4) { setError('Code à 4 lettres'); return; }
    if (pseudo.trim().length < 2) { setError('Pseudo trop court'); return; }

    setLoading(true);
    setError('');

    try {
      const deviceId = await getOrCreateDeviceId();
      setDeviceId(deviceId);

      const { game, player } = await joinGame(code, deviceId, pseudo.trim());
      setGame(game);
      setMyPlayer(player);

      router.replace('/host');
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
            <Text style={styles.backBtnText}>{'<'}</Text>
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

        <View style={styles.content}>
          <Text style={styles.title}>Rejoindre</Text>
          <Text style={styles.subtitle}>Entre le code partagé par le chef de cuisine</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Code de partie</Text>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase().slice(0, 4))}
                placeholder="XXXX"
                placeholderTextColor={palette.brandPink + '55'}
                maxLength={4}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="default"
                returnKeyType="next"
                accessibilityLabel="Code de partie"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ton pseudo</Text>
              <TextInput
                style={styles.pseudoInput}
                value={pseudo}
                onChangeText={setPseudo}
                placeholder="Chef Saucissier"
                placeholderTextColor={palette.textPrimary + '55'}
                maxLength={13}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleJoin}
                accessibilityLabel="Pseudo"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.joinBtn,
                (loading || code.length !== 4 || pseudo.trim().length < 2) && styles.joinBtnDisabled,
                pressed && styles.pressed,
              ]}
              onPress={handleJoin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Rejoindre la partie"
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.joinBtnText}>Rejoindre</Text>
              }
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgWhite,
  },
  safeArea: {
    flex: 1,
    zIndex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.medium,
    paddingTop: spacing.small,
    paddingBottom: 4,
  },
  backBtn: { padding: 4 },
  backBtnText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 22,
    color: palette.brandPink,
  },
  settingsBtn: { padding: 4 },
  content: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 32,
    gap: 32,
  },
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 52,
    lineHeight: 52,
    color: palette.brandPink,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    lineHeight: 22,
    color: palette.textPrimary,
    marginTop: -20,
  },
  form: {
    gap: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 14,
    color: palette.brandGreen,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeInput: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 32,
    letterSpacing: 12,
    color: palette.brandPink,
    backgroundColor: palette.bgYellowLight,
    borderWidth: 2,
    borderColor: palette.brandPink + '30',
    borderRadius: radius.main,
    paddingHorizontal: spacing.medium,
    paddingVertical: 14,
    textAlign: 'center',
  },
  pseudoInput: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 18,
    color: palette.textPrimary,
    backgroundColor: palette.bgYellowLight,
    borderWidth: 2,
    borderColor: palette.borderPeach,
    borderRadius: radius.main,
    paddingHorizontal: spacing.medium,
    paddingVertical: 14,
  },
  error: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 14,
    color: palette.brandPink,
    textAlign: 'center',
  },
  joinBtn: {
    backgroundColor: palette.brandGreen,
    borderRadius: radius.main,
    paddingVertical: spacing.xsmall,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  joinBtnDisabled: {
    opacity: 0.4,
  },
  joinBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    lineHeight: 26,
    color: palette.textInvert,
  },
  pressed: { opacity: 0.8 },
});
