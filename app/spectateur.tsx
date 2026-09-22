import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ToqueBackground } from '@/components/ToqueBackground';
import { palette } from '@/constants/palette';

import ChousSvg from '@/assets/images/personnages/character-choux.svg';
import EggSvg from '@/assets/images/personnages/character-egg.svg';
import IceSvg from '@/assets/images/ice.svg';
import CouteauSvg from '@/assets/images/couteau.svg';

const ROUND_NUMBER = 57;
const SMALL_AVATAR = 111;

export default function SpectateurScreen() {
  return (
    <View style={styles.root}>
      <ToqueBackground />

      {/*
        Figma 1:1716 — flex-col justify-between size-full.
        3 enfants en flux : numberSection · avatarsRow · waitingBox.
        paddingTop 90 = safe area + header. paddingBottom 48 = marge inférieure.
      */}
      <View style={styles.layout} pointerEvents="box-none">

        {/* ── Bloc 1 : frozen 57 + "Accusation en cours..." ── */}
        <View style={styles.numberSection}>
          {/* 112×112 : ice via absoluteFillObject, "57" centré dessus */}
          <View style={styles.frozenNumber}>
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <IceSvg width={112} height={112} />
            </View>
            <Text style={styles.roundNumber}>{ROUND_NUMBER}</Text>
          </View>
          <Text style={styles.title}>Accusation en cours...</Text>
        </View>

        {/* ── Bloc 2 : accusateur ←🔪→ accusé ── */}
        <View style={styles.avatarsRow}>

          {/* Accusateur — sans badge */}
          <View style={styles.playerCard}>
            <View style={[styles.avatar, styles.avatarAccuser]}>
              <ChousSvg width={SMALL_AVATAR} height={SMALL_AVATAR} />
            </View>
            <Text style={styles.playerName}>Chef Saucissier</Text>
          </View>

          {/* Couteau : rotate 100° + scaleY(-1) pour correspondre au Figma */}
          <View style={styles.knifeWrapper}>
            <CouteauSvg width={42} height={71} />
          </View>

          {/* Accusé */}
          <View style={styles.playerCard}>
            <View style={[styles.avatar, styles.avatarAccused]}>
              <EggSvg width={SMALL_AVATAR} height={SMALL_AVATAR} />
            </View>
            <Text style={styles.playerName}>Chef Saucissier</Text>
          </View>

        </View>

        {/* ── Bloc 3 : texte d'attente, tap to proceed to round results ── */}
        <Pressable style={styles.waitingBox} onPress={() => router.push('/resultat-manche')} accessibilityRole="button">
          <Text style={styles.waitingText}>En attente de la réponse de l'accusé</Text>
        </Pressable>

      </View>

      {/* ── Header flottant ── */}
      <SafeAreaView style={styles.headerSafe} edges={['top']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Pressable
            onPress={() => router.replace('/game')}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Text style={styles.backBtnText}>{'<'}</Text>
          </Pressable>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="Quitter"
          >
            <Text style={styles.settingsBtnText}>✕</Text>
          </Pressable>
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

  // ─── Layout principal ─────────────────────────────────────────────────────
  layout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 90,
    paddingBottom: 48,
  },

  // ─── Bloc 1 — frozen number ───────────────────────────────────────────────
  numberSection: {
    alignItems: 'center',
    gap: 47,
  },
  frozenNumber: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundNumber: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 54,
    lineHeight: 54,
    color: palette.brandGreen,
    opacity: 0.5,
    textAlign: 'center',
  },
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    lineHeight: 36,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // ─── Bloc 2 — accusateur + couteau + accusé ───────────────────────────────
  avatarsRow: {
    width: 360,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerCard: {
    width: 157.5,
    height: 184.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13.5,
  },
  avatar: {
    width: SMALL_AVATAR,
    height: SMALL_AVATAR,
    borderRadius: SMALL_AVATAR / 2,
    overflow: 'hidden',
  },
  avatarAccuser: {
    backgroundColor: '#ffc014',
  },
  avatarAccused: {
    backgroundColor: '#ff3624',
  },
  playerName: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 18,
    lineHeight: 30,
    color: palette.textPrimary,
    textAlign: 'center',
    flex: 1,
    minHeight: 0,
  },
  knifeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '100deg' }],
    marginBottom: 30,
  },

  // ─── Bloc 3 — texte d'attente ─────────────────────────────────────────────
  waitingBox: {
    backgroundColor: 'rgba(255, 20, 134, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  waitingText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: palette.brandPink,
    opacity: 0.5,
    width: 230,
    lineHeight: 26,
  },

  // ─── Header ───────────────────────────────────────────────────────────────
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 8,
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
});
