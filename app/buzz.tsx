import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ToqueBackground } from '@/components/ToqueBackground';
import { palette } from '@/constants/palette';

import ChousSvg from '@/assets/images/personnages/character-choux.svg';
import ReadySvg from '@/assets/images/ready.svg';
import IceSvg from '@/assets/images/ice.svg';

const ROUND_NUMBER = 57;
const LARGE_AVATAR = 166.5;

export default function BuzzScreen() {
  return (
    <View style={styles.root}>
      <ToqueBackground />

      {/* Main content — centered on screen with slight downward offset */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.content}>
          {/* ── Number section: frozen 57 + title ── */}
          <View style={styles.numberSection}>
            {/* Ice cube perfectly centered over "57" giving the frozen-in-ice look */}
            <View style={styles.frozenNumber}>
              <View style={StyleSheet.absoluteFillObject}>
                <IceSvg width={112} height={112} />
              </View>
              <Text style={styles.roundNumber}>{ROUND_NUMBER}</Text>
            </View>

            <Text style={styles.accusedTitle}>Chef Saucissier a Tauké !</Text>
          </View>

          {/* ── Avatar ── */}
          {/* Avatar circle has overflow:hidden so the tick is clipped to the circle */}
          <View style={styles.avatar}>
            <ChousSvg width={LARGE_AVATAR} height={LARGE_AVATAR} />
            <View style={styles.tick}>
              <ReadySvg width={54} height={54} />
            </View>
          </View>
        </View>
      </View>

      {/* "En attente" text — pinned to bottom, tap to proceed to accused screen */}
      <View style={styles.waitingArea} pointerEvents="box-none">
        <Pressable style={styles.waitingBox} onPress={() => router.push('/accuse')} accessibilityRole="button">
          <Text style={styles.waitingText}>En attente de ses accusations...</Text>
        </Pressable>
      </View>

      {/* Header — on top of everything so back button receives touches */}
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

  // ─── Content ──────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 65,
    paddingTop: 108, // clear the absolute header (~safe area + header row height)
  },

  // ─── Number section ───────────────────────────────────────────────────────
  numberSection: {
    alignItems: 'center',
    gap: 48,
  },

  // 112×112 box: ice SVG fills it via absoluteFill, "57" floats centered on top.
  // Combined with opacity:0.5 on the text, this produces the "frozen in ice" effect.
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

  accusedTitle: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    lineHeight: 36,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // ─── Avatar ───────────────────────────────────────────────────────────────
  // overflow:hidden clips the tick to the circle boundary
  avatar: {
    width: LARGE_AVATAR,
    height: LARGE_AVATAR,
    borderRadius: LARGE_AVATAR / 2,
    overflow: 'hidden',
  },

  // Tick inside the circle — left:112.5, top:112.5 puts it in the bottom-right quadrant,
  // clipped by overflow:hidden so only the portion inside the circle is visible.
  tick: {
    position: 'absolute',
    left: 112.5,
    top: 112.5,
    width: 54,
    height: 54,
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

  // ─── Waiting text ─────────────────────────────────────────────────────────
  waitingArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 48,
  },
  waitingBox: {
    backgroundColor: 'rgba(255, 20, 134, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingBottom: 6,
    paddingTop: 6,
  },
  waitingText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 20,
    color: palette.brandPink,
    opacity: 0.5,
    width: 230,
    lineHeight: 26,
  },
});
