import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ToqueBackground } from '@/components/ToqueBackground';
import { ChallengeOverlay } from '@/components/ChallengeOverlay';
import { palette } from '@/constants/palette';

import ChousSvg from '@/assets/images/personnages/character-choux.svg';
import ReadySvg from '@/assets/images/ready.svg';
import IceSvg from '@/assets/images/ice.svg';

const ROUND_NUMBER = 57;
const LARGE_AVATAR = 166.5;

export default function AccuseScreen() {
  const [challengeVisible, setChallengeVisible] = useState(false);

  function handleOui() {
    setChallengeVisible(true);
  }

  function handleNon() {
    router.replace('/game');
  }

  function handleChallengeConfirm(_challengeId: string) {
    setChallengeVisible(false);
    router.replace('/spectateur');
  }

  return (
    <View style={styles.root}>
      <ToqueBackground />

      {/*
        Figma: container 729px de haut, centré à 50%+24.5px → commence à ~86px du haut.
        On recrée ça avec paddingTop/paddingBottom + justify-between sur les 3 blocs.
      */}
      <View style={styles.layout} pointerEvents="box-none">

        {/* ── Bloc 1 : frozen 57 + titre ── */}
        <View style={styles.numberSection}>
          {/* Ice absolue à top:-28 → déborde au-dessus du bloc, centrée sur "57" */}
          <View style={styles.iceAbsolute} pointerEvents="none">
            <IceSvg width={112} height={112} />
          </View>
          <Text style={styles.roundNumber}>{ROUND_NUMBER}</Text>
          <Text style={styles.topTitle}>Tu es accusé par</Text>
        </View>

        {/* ── Bloc 2 : avatar accusateur + pseudo ── */}
        <View style={styles.accuserBlock}>
          <View style={styles.avatar}>
            <ChousSvg width={LARGE_AVATAR} height={LARGE_AVATAR} />
            <View style={styles.tick}>
              <ReadySvg width={54} height={54} />
            </View>
          </View>
          <Text style={styles.accuserName}>Chef Saucissier</Text>
        </View>

        {/* ── Bloc 3 : question + boutons ── */}
        <View style={styles.bottomBlock}>
          <Text style={styles.questionText}>T'es cramé ?</Text>
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [styles.ouiBtn, pressed && styles.btnPressed]}
              onPress={handleOui}
              accessibilityRole="button"
              accessibilityLabel="Oui, je suis cramé"
            >
              <Text style={styles.btnText}>OUI</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.nonBtn, pressed && styles.btnPressed]}
              onPress={handleNon}
              accessibilityRole="button"
              accessibilityLabel="Non, je ne suis pas cramé"
            >
              <Text style={styles.btnText}>NON</Text>
            </Pressable>
          </View>
        </View>

      </View>

      <ChallengeOverlay
        visible={challengeVisible}
        onClose={() => setChallengeVisible(false)}
        onConfirm={handleChallengeConfirm}
      />

      {/* ── Header flottant ── */}
      <SafeAreaView style={styles.headerSafe} edges={['top']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Pressable
            onPress={() => router.back()}
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
  // Figma: container 729px centré à top:50%+24.5px sur frame 852px → top≈86px.
  // paddingTop 90 = safe area + header row. paddingBottom 40 ≈ marge inférieure.
  // justify-between distribue les 3 blocs exactement comme dans le Figma.
  layout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 90,
    paddingBottom: 40,
  },

  // ─── Bloc 1 — frozen number ───────────────────────────────────────────────
  numberSection: {
    alignItems: 'center',
    gap: 44,
    // paddingTop = 28 pour que l'ice (top:-28) ne soit pas clippée
    paddingTop: 28,
  },
  // Ice absolue centrée, débordant 28px au-dessus du numberSection
  iceAbsolute: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    width: 112,
    height: 112,
  },
  roundNumber: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 54,
    lineHeight: 54,
    color: palette.brandGreen,
    opacity: 0.5,
    textAlign: 'center',
  },
  topTitle: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    lineHeight: 36,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // ─── Bloc 2 — avatar accusateur ───────────────────────────────────────────
  accuserBlock: {
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: LARGE_AVATAR,
    height: LARGE_AVATAR,
    borderRadius: LARGE_AVATAR / 2,
    overflow: 'hidden',
  },
  tick: {
    position: 'absolute',
    left: 112.5,
    top: 112.5,
    width: 54,
    height: 54,
  },
  accuserName: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 22,
    lineHeight: 45,
    color: palette.textPrimary,
    textAlign: 'center',
  },

  // ─── Bloc 3 — question + boutons ──────────────────────────────────────────
  bottomBlock: {
    alignItems: 'center',
    gap: 24,
    width: 340,
  },
  questionText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 22,
    color: palette.brandPink,
    alignSelf: 'flex-start',
  },
  buttons: {
    width: '100%',
    gap: 16,
  },
  ouiBtn: {
    height: 47,
    backgroundColor: palette.brandGreen,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nonBtn: {
    height: 47,
    backgroundColor: palette.brandPink,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: '#ffffff',
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
