import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '@/constants/palette';

type Challenge = {
  id: string;
  text: string;
  done: boolean;
};

const DEMO_CHALLENGES: Challenge[] = [
  { id: '1', text: 'Voici une liste de défis amusants pour pimenter vos soirées entre amis.', done: false },
  { id: '2', text: 'Voici une liste de défis amusants pour pimenter vos soirées entre amis.', done: false },
  { id: '3', text: 'Voici une liste de défis amusants pour pimenter vos soirées entre amis.', done: true },
  { id: '4', text: 'Voici une liste de défis amusants pour pimenter vos soirées entre amis.', done: true },
  { id: '5', text: 'Voici une liste de défis amusants pour pimenter vos soirées entre amis.', done: true },
  { id: '6', text: 'Voici une liste de défis amusants pour pimenter vos soirées entre amis.', done: false },
];

function Bullet({ active }: { active: boolean }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletRow}>
        <View style={[styles.bulletDot, active && styles.bulletDotActive]} />
        <View style={[styles.bulletDot, active && styles.bulletDotActive]} />
        <View style={[styles.bulletDot, active && styles.bulletDotActive]} />
      </View>
      <View style={styles.bulletRow}>
        <View style={[styles.bulletDot, active && styles.bulletDotActive]} />
        <View style={[styles.bulletDot, active && styles.bulletDotActive]} />
        <View style={[styles.bulletDot, active && styles.bulletDotActive]} />
      </View>
    </View>
  );
}

interface ChallengeRowProps {
  challenge: Challenge;
  selected: boolean;
  onPress: () => void;
}

function ChallengeRow({ challenge, selected, onPress }: ChallengeRowProps) {
  return (
    <Pressable
      style={[
        styles.row,
        selected && styles.rowSelected,
      ]}
      onPress={onPress}
      disabled={challenge.done}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: challenge.done }}
    >
      <Bullet active={selected} />
      <Text style={[
        styles.rowText,
        selected && styles.rowTextSelected,
        challenge.done && styles.rowTextDone,
      ]}>
        {challenge.text}
      </Text>
    </Pressable>
  );
}

interface ChallengeOverlayProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (challengeId: string) => void;
}

export function ChallengeOverlay({ visible, onClose, onConfirm }: ChallengeOverlayProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleShow() {
    setSelectedId(null);
  }

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onShow={handleShow}
    >
      <View style={styles.sheet}>
        <SafeAreaView style={styles.inner} edges={['top', 'bottom']}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Text style={styles.backBtnText}>{'<'}</Text>
            </Pressable>
            <View style={styles.settingsBtn}>
              <Text style={styles.settingsBtnText}>⚙</Text>
            </View>
          </View>

          {/* ── Titre ── */}
          <Text style={styles.title}>Sur quel défi ?</Text>

          {/* ── Liste des défis (scrollable, prend l'espace restant) ── */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {DEMO_CHALLENGES.map((challenge) => (
              <ChallengeRow
                key={challenge.id}
                challenge={challenge}
                selected={selectedId === challenge.id}
                onPress={() => setSelectedId(challenge.id)}
              />
            ))}
          </ScrollView>

          {/* ── Bouton confirmer — toujours visible en bas ── */}
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              !selectedId && styles.confirmBtnDisabled,
              pressed && !!selectedId && styles.confirmBtnPressed,
            ]}
            onPress={() => selectedId && onConfirm(selectedId)}
            disabled={!selectedId}
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedId }}
          >
            <Text style={styles.confirmText}>Confirmer</Text>
          </Pressable>

        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: '#fff6f2',
  },
  inner: {
    flex: 1,
    paddingVertical: 48,
    gap: 24,
  },

  // ─── Header ───────────────────────────────────────────────────────────────
  header: {
    width: 340,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // ─── Titre ────────────────────────────────────────────────────────────────
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // ─── Liste des défis ──────────────────────────────────────────────────────
  // flex: 1 → absorbe l'espace restant entre le titre et le bouton
  listScroll: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  listContent: {
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 16,
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#ffdac7',
    backgroundColor: 'rgba(255, 251, 250, 0.9)',
  },
  rowSelected: {
    backgroundColor: palette.brandPink,
  },
  rowText: {
    flex: 1,
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    color: palette.textPrimary,
  },
  rowTextSelected: {
    color: '#fdfefe',
  },
  rowTextDone: {
    textDecorationLine: 'line-through',
  },

  // ─── Bullet ───────────────────────────────────────────────────────────────
  bullet: {
    gap: 2,
    flexShrink: 0,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 2,
  },
  bulletDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.brandPink,
    opacity: 0.35,
  },
  bulletDotActive: {
    backgroundColor: '#ffffff',
    opacity: 1,
  },

  // ─── Bouton confirmer ─────────────────────────────────────────────────────
  confirmBtn: {
    width: 340,
    alignSelf: 'center',
    height: 47,
    backgroundColor: palette.brandGreen,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.3,
  },
  confirmBtnPressed: {
    opacity: 0.85,
  },
  confirmText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: '#ffffff',
  },
});
