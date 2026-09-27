import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { palette } from '@/constants/palette';
import type { Character } from '@/store';

import ChousSvg     from '@/assets/images/personnages/character-choux.svg';
import AvocadoSvg   from '@/assets/images/personnages/character-avocado.svg';
import Onion1Svg    from '@/assets/images/personnages/character-onion-1.svg';
import CarotSvg     from '@/assets/images/personnages/character-carot.svg';
import BananaSvg    from '@/assets/images/personnages/character-banana.svg';
import PotatoesSvg  from '@/assets/images/personnages/character-potatoes.svg';
import PoivronSvg   from '@/assets/images/personnages/character-poivron.svg';
import AubergineSvg from '@/assets/images/personnages/character-aubergine.svg';
import MushroomSvg  from '@/assets/images/personnages/character-mushroom.svg';

type CharSvg = React.FC<{ width: number; height: number }>;

const CHARACTER_MAP: Record<Character, CharSvg> = {
  choux: ChousSvg, avocado: AvocadoSvg, onion: Onion1Svg,
  carot: CarotSvg, banana: BananaSvg, potatoes: PotatoesSvg,
  poivron: PoivronSvg, aubergine: AubergineSvg, mushroom: MushroomSvg,
};

const AVATAR_SIZE = 88;
const AUTO_DISMISS_MS = 4000;

export interface PointAttributionData {
  winnerName: string;
  winnerCharacter: Character;
  winnerBg: string;
  title: string;
  body: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  data: PointAttributionData | null;
}

export function PointAttributionModal({ visible, onClose, data }: Props) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!visible) return;
    timerRef.current = setTimeout(() => onCloseRef.current(), AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!data) return null;

  const CharSvg = CHARACTER_MAP[data.winnerCharacter] ?? ChousSvg;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <View style={[styles.avatar, { backgroundColor: data.winnerBg }]}>
            <CharSvg width={AVATAR_SIZE} height={AVATAR_SIZE} />
          </View>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.body}>{data.body}</Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>Continuer</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
  },
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    color: palette.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  btn: {
    marginTop: 8,
    width: '100%',
    height: 47,
    backgroundColor: palette.brandGreen,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.85 },
  btnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: '#ffffff',
  },
});
