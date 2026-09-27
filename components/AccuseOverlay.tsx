import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing } from '@/constants/palette';
import type { Player, Character } from '@/store';

import ChousSvg from '@/assets/images/personnages/character-choux.svg';
import AvocadoSvg from '@/assets/images/personnages/character-avocado.svg';
import Onion1Svg from '@/assets/images/personnages/character-onion-1.svg';
import CarotSvg from '@/assets/images/personnages/character-carot.svg';
import BananaSvg from '@/assets/images/personnages/character-banana.svg';
import PotatoesSvg from '@/assets/images/personnages/character-potatoes.svg';
import PoivronSvg from '@/assets/images/personnages/character-poivron.svg';
import AubergineSvg from '@/assets/images/personnages/character-aubergine.svg';
import MushroomSvg from '@/assets/images/personnages/character-mushroom.svg';

const AVATAR_SIZE = 74;
const SLOT_W = 105;
const MAX_PSEUDO = 13;

type CharSvg = React.FC<{ width: number; height: number }>;

const CHARACTER_MAP: Record<Character, CharSvg> = {
  choux: ChousSvg,
  avocado: AvocadoSvg,
  onion: Onion1Svg,
  carot: CarotSvg,
  banana: BananaSvg,
  potatoes: PotatoesSvg,
  poivron: PoivronSvg,
  aubergine: AubergineSvg,
  mushroom: MushroomSvg,
};

type Slot = { id: string; pseudo: string; Char: CharSvg };

const DEMO_SLOTS: Slot[] = [
  { id: '1', pseudo: 'Chef Chou',    Char: ChousSvg },
  { id: '2', pseudo: 'Chef Avocat',  Char: AvocadoSvg },
  { id: '3', pseudo: 'Chef Oignon',  Char: Onion1Svg },
  { id: '4', pseudo: 'Chef Carotte', Char: CarotSvg },
  { id: '5', pseudo: 'Chef Banane',  Char: BananaSvg },
  { id: '6', pseudo: 'Chef Patate',  Char: PotatoesSvg },
];

function playerToSlot(p: Player): Slot {
  return { id: p.id, pseudo: p.pseudo, Char: CHARACTER_MAP[p.character] ?? ChousSvg };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function PlayerSlot({ slot, selected, onPress }: { slot: Slot; selected: boolean; onPress: () => void }) {
  const { Char, pseudo } = slot;
  return (
    <Pressable
      style={styles.slot}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={[styles.avatar, selected && styles.avatarSelected]}>
        <Char width={AVATAR_SIZE} height={AVATAR_SIZE} />
      </View>
      <Text style={[styles.pseudo, selected && styles.pseudoSelected]} numberOfLines={2}>
        {pseudo.slice(0, MAX_PSEUDO)}
      </Text>
    </Pressable>
  );
}

interface AccuseOverlayProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (playerId: string) => void;
  players?: Player[];
}

export function AccuseOverlay({ visible, onClose, onConfirm, players }: AccuseOverlayProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const slots: Slot[] = players && players.length > 0
    ? players.map(playerToSlot)
    : DEMO_SLOTS;

  const rows = chunk(slots, 3);

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
      onRequestClose={onClose}
    >
      <View style={styles.backdrop} pointerEvents="none" />

      <SafeAreaView style={styles.headerSafe} edges={['top']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Pressable
            style={styles.headerBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Annuler"
          >
            <Text style={styles.headerBtnText}>{'<'}</Text>
          </Pressable>
          <Pressable
            style={styles.headerBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Annuler"
          >
            <Text style={styles.headerBtnText}>✕</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.sheet}>
        <Text style={styles.title}>TU ACCUSES QUI ?</Text>

        <View style={styles.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((slot) => (
                <PlayerSlot
                  key={slot.id}
                  slot={slot}
                  selected={selectedId === slot.id}
                  onPress={() => setSelectedId(slot.id)}
                />
              ))}
            </View>
          ))}
        </View>

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

        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Annuler l'accusation"
        >
          <Text style={styles.cancelBtnInlineText}>Annuler</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(82, 0, 39, 0.55)' },
  headerSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 8,
  },
  headerBtn: {
    width: 32, height: 32, borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnText: { fontFamily: 'Recursive_600SemiBold', fontSize: 16, color: '#ffffff', lineHeight: 20 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff6f2', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 32, paddingBottom: 40, paddingHorizontal: spacing.small,
    gap: 32, alignItems: 'center',
  },
  title: {
    fontFamily: 'Staatliches_400Regular', fontSize: 36,
    color: palette.brandPink, textTransform: 'uppercase', textAlign: 'center',
  },
  grid: { width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 24, height: 123, alignItems: 'center' },
  slot: { width: SLOT_W, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 9 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, overflow: 'hidden' },
  avatarSelected: { borderWidth: 3, borderColor: palette.brandPink },
  pseudo: { fontFamily: 'Recursive_400Regular', fontSize: 13, lineHeight: 20, color: palette.textPrimary, textAlign: 'center', width: '100%' },
  pseudoSelected: { color: palette.brandPink },
  confirmBtn: {
    width: 340, backgroundColor: palette.brandGreen,
    borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnPressed: { opacity: 0.85 },
  confirmText: { fontFamily: 'Recursive_400Regular', fontSize: 20, color: '#ffffff' },
  btnPressed: { opacity: 0.8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 24, alignItems: 'center' },
  cancelBtnInlineText: { fontFamily: 'Recursive_400Regular', fontSize: 16, color: palette.brandPink, opacity: 0.7 },
});
