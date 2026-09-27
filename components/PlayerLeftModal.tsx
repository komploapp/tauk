import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { palette } from '@/constants/palette';
import type { Character, Player } from '@/store';

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

const CHARACTER_BG: Record<Character, string> = {
  choux: '#ffc014', avocado: '#7ac514', onion: '#c514b4',
  carot: '#ff7214', banana: '#ffe014', potatoes: '#c8a864',
  poivron: '#ff3214', aubergine: '#7814c8', mushroom: '#c87850',
};

const AVATAR_SIZE = 74;

interface Props {
  player: Player | null;
  onDismiss: () => void;
  isGameOver?: boolean;
}

export function PlayerLeftModal({ player, onDismiss, isGameOver = false }: Props) {
  if (!player) return null;

  const CharSvg = CHARACTER_MAP[player.character] ?? ChousSvg;

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={isGameOver ? undefined : onDismiss}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <View style={[styles.avatar, { backgroundColor: CHARACTER_BG[player.character] }]}>
            <CharSvg width={AVATAR_SIZE} height={AVATAR_SIZE} />
          </View>
          <Text style={styles.title}>{player.pseudo} est parti·e</Text>
          <Text style={styles.body}>
            {isGameOver
              ? `${player.pseudo} a quitté la partie.\nTu remportes la victoire par forfait !`
              : `${player.pseudo} a quitté la partie.\nLe jeu continue pour les joueurs restants.`}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={isGameOver ? 'Voir les résultats' : 'Continuer'}
          >
            <Text style={styles.btnText}>{isGameOver ? 'Voir les résultats' : 'OK'}</Text>
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
    fontSize: 32,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 15,
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
