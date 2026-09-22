import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ToqueBackground } from '@/components/ToqueBackground';
import OignonSvg from '@/assets/images/oignon-heureux.svg';
import OeufSvg from '@/assets/images/oeuf-loupe.svg';
import ChamallowSvg from '@/assets/images/chamallow.svg';
import { palette, spacing, radius, border } from '@/constants/palette';
import { createGame, getOrCreateDeviceId } from '@/lib/game';
import { useStore } from '@/store';
import type { Character } from '@/store';

const CARD_H = 207;
const CARD_W = 360;

const ALL_CHARACTERS: Character[] = [
  'choux', 'avocado', 'onion', 'carot', 'banana',
  'potatoes', 'poivron', 'aubergine', 'mushroom',
];

interface ModeCardProps {
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
}

function PlayersBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function ModeCard({
  title, description, players, Character, charWidth, charHeight,
  charLeft, charRotate, comingSoon = false, onPress,
}: ModeCardProps) {
  return (
    <Pressable
      onPress={!comingSoon ? onPress : undefined}
      style={({ pressed }) => [styles.card, comingSoon && styles.cardDimmed, pressed && !comingSoon && styles.pressed]}
      accessibilityRole={!comingSoon ? 'button' : undefined}
    >
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.cardBg} />
        <View style={styles.cardHighlight} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>
      <View
        style={[
          styles.charWrap,
          { left: charLeft, width: charWidth, height: charHeight },
          charRotate ? { transform: [{ rotate: charRotate }] } : undefined,
        ]}
      >
        <Character width={charWidth} height={charHeight} />
      </View>
      <PlayersBadge label={players} />
      {comingSoon && (
        <View style={styles.comingSoonOverlay}>
          <View style={styles.comingSoonBox}>
            <Text style={styles.comingSoonText}>Arrive bientôt !</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function ConfigScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setGame, setMyPlayer, setDeviceId } = useStore();

  async function handleCreate() {
    if (pseudo.trim().length < 2) { setError('Pseudo trop court'); return; }

    setLoading(true);
    setError('');

    try {
      const deviceId = await getOrCreateDeviceId();
      setDeviceId(deviceId);

      const character = ALL_CHARACTERS[Math.floor(Math.random() * ALL_CHARACTERS.length)];
      const { game, player } = await createGame(deviceId, pseudo.trim(), character);
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
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Thématique</Text>

          <View style={styles.cardList}>
            <ModeCard
              title="Tâches"
              description="Description du mode 1 en bref pour comprendre de quoi il s'agit...."
              players="2-10 joueurs"
              Character={OignonSvg}
              charWidth={191}
              charHeight={199}
              charLeft={169}
              onPress={() => setModalVisible(true)}
            />
            <ModeCard
              title="Chasse"
              description="Description du mode 1 en bref pour comprendre de quoi il s'agit...."
              players="3-10 joueurs"
              Character={OeufSvg}
              charWidth={179}
              charHeight={169}
              charLeft={186}
              comingSoon
            />
            <ModeCard
              title="Binômes"
              description="Description du mode 1 en bref pour comprendre de quoi il s'agit...."
              players="3-10 joueurs"
              Character={ChamallowSvg}
              charWidth={112}
              charHeight={236}
              charLeft={196}
              charRotate="20.04deg"
              comingSoon
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={modalVisible}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => !loading && setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => !loading && setModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Ton pseudo</Text>
            <Text style={styles.modalSubtitle}>Comment tu t'appelles, chef ?</Text>

            <TextInput
              style={styles.modalInput}
              value={pseudo}
              onChangeText={setPseudo}
              placeholder="Chef Saucissier"
              placeholderTextColor={palette.textPrimary + '55'}
              maxLength={13}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

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
                : <Text style={styles.modalBtnText}>Créer la partie</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgWhite },
  safeArea: { flex: 1, zIndex: 1 },
  backBtn: { paddingHorizontal: spacing.medium, paddingVertical: spacing.small },
  backBtnText: { fontFamily: 'Recursive_600SemiBold', fontSize: 22, color: palette.brandPink },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: (393 - CARD_W) / 2,
    paddingBottom: spacing.medium,
    gap: spacing.medium,
  },
  sectionTitle: { fontFamily: 'Recursive_600SemiBold', fontSize: 22, color: palette.brandPink },
  cardList: { gap: spacing.small },

  card: {
    width: CARD_W, height: CARD_H, borderRadius: radius.main,
    overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.medium, paddingVertical: spacing.xsmall,
  },
  cardDimmed: { opacity: 0.4 },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.bgYellowLight,
    borderWidth: border.width, borderColor: palette.borderPeach, borderRadius: radius.main,
  },
  cardHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderTopWidth: 5, borderLeftWidth: 5, borderColor: palette.highlightInner, borderRadius: radius.main,
  },
  cardContent: { width: 144, gap: spacing.xsmall, zIndex: 1 },
  cardTitle: { fontFamily: 'Recursive_600SemiBold', fontSize: 18, color: palette.brandGreen },
  cardDesc: { fontFamily: 'Recursive_400Regular', fontSize: 16, color: palette.textPrimary, lineHeight: 22 },
  charWrap: { position: 'absolute', bottom: 0 },
  badge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: palette.bgPink, borderRadius: radius.chip,
    paddingHorizontal: 6, paddingVertical: 3, zIndex: 2,
  },
  badgeText: { fontFamily: 'Recursive_400Regular', fontSize: 14, color: palette.brandPink, opacity: 0.5 },
  comingSoonOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  comingSoonBox: {
    backgroundColor: palette.bgWhite, paddingHorizontal: spacing.medium, paddingVertical: spacing.xsmall,
    borderRadius: 4, shadowColor: palette.shadowYellow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 6,
  },
  comingSoonText: {
    fontFamily: 'Staatliches_400Regular', fontSize: 38, color: palette.brandPink,
    textTransform: 'uppercase', letterSpacing: 1,
  },

  // Modal
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(82, 0, 39, 0.45)' },
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
