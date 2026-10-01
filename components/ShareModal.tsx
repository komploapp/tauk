import { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Share, Linking, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { palette, spacing, radius } from '@/constants/palette';
import { playSound } from '@/lib/sound';

const INVITE_BASE = 'https://tauk.app/join?code=';

interface ShareOption {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: (url: string, code: string) => void;
}

const OPTIONS: ShareOption[] = [
  {
    key: 'whatsapp',
    icon: 'logo-whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    onPress: (url) => {
      const text = encodeURIComponent(`Rejoins ma partie Tauk ! 🎮\n${url}`);
      Linking.openURL(`whatsapp://send?text=${text}`).catch(() =>
        Alert.alert('WhatsApp non disponible')
      );
    },
  },
  {
    key: 'messages',
    icon: 'chatbubble-outline',
    label: 'Messages',
    color: '#34C759',
    onPress: (url) => {
      const body = encodeURIComponent(`Rejoins ma partie Tauk ! 🎮\n${url}`);
      Linking.openURL(`sms:?body=${body}`).catch(() =>
        Alert.alert('Messages non disponible')
      );
    },
  },
  {
    key: 'copy',
    icon: 'copy-outline',
    label: 'Copier',
    color: palette.brandPink,
    onPress: async (_, code) => {
      await Clipboard.setStringAsync(code);
      Alert.alert('Copié !', `Code "${code}" copié dans le presse-papier.`);
    },
  },
  {
    key: 'more',
    icon: 'ellipsis-horizontal-circle-outline',
    label: 'Plus',
    color: palette.brandGreen,
    onPress: (url, code) => {
      Share.share({ message: `Rejoins ma partie Tauk ! 🎮\nCode : ${code}\n\n${url}` });
    },
  },
];

interface Props {
  visible: boolean;
  gameCode: string;
  onClose: () => void;
}

export function ShareModal({ visible, gameCode, onClose }: Props) {
  const [qrExpanded, setQrExpanded] = useState(false);
  const inviteUrl = `${INVITE_BASE}${gameCode}`;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <BlurView style={StyleSheet.absoluteFill} intensity={30} tint="dark" />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          {/* ── Header ── */}
          <Text style={styles.title}>Inviter des convives</Text>

          {/* ── QR code ── */}
          <Pressable
            style={({ pressed }) => [styles.qrWrap, pressed && styles.pressed]}
            onPress={() => { playSound('uiPress'); setQrExpanded(true); }}
            accessibilityRole="button"
            accessibilityLabel="Agrandir le QR code"
          >
            <QRCode
              value={inviteUrl}
              size={180}
              color={palette.textPrimary}
              backgroundColor={palette.bgWhite}
            />
            <Text style={styles.codeHint}>
              Code : <Text style={styles.codeValue}>{gameCode}</Text>
            </Text>
            <View style={styles.expandHint}>
              <Ionicons name="expand-outline" size={13} color={palette.textPrimary + '55'} />
              <Text style={styles.expandHintText}>Appuyer pour agrandir</Text>
            </View>
          </Pressable>

          {/* ── Separator ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou partager via</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Share options ── */}
          <View style={styles.optionsRow}>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [styles.optionBtn, pressed && styles.pressed]}
                onPress={() => { playSound('uiPress'); opt.onPress(inviteUrl, gameCode); }}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
              >
                <View style={[styles.optionIcon, { backgroundColor: opt.color + '18' }]}>
                  <Ionicons name={opt.icon} size={26} color={opt.color} />
                </View>
                <Text style={styles.optionLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ── Bottom close ── */}
          <Pressable
            style={({ pressed }) => [styles.closeBottomBtn, pressed && styles.pressed]}
            onPress={() => { playSound('uiPress'); onClose(); }}
            accessibilityRole="button"
          >
            <Text style={styles.closeBottomText}>Fermer</Text>
          </Pressable>
        </View>
      </View>

      {/* ── QR expanded overlay ── */}
      <Modal
        visible={qrExpanded}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setQrExpanded(false)}
      >
        <Pressable style={styles.qrExpandedBackdrop} onPress={() => setQrExpanded(false)}>
          <BlurView style={StyleSheet.absoluteFill} intensity={60} tint="dark" />
          <View style={styles.qrExpandedCard}>
            <QRCode
              value={inviteUrl}
              size={260}
              color={palette.textPrimary}
              backgroundColor={palette.bgWhite}
            />
            <Text style={styles.codeHint}>
              Code : <Text style={styles.codeValue}>{gameCode}</Text>
            </Text>
          </View>
          <Text style={styles.qrExpandedDismiss}>Appuyer pour fermer</Text>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.bgWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingBottom: spacing.medium,
    paddingHorizontal: spacing.medium,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 16,
  },

  // ── Header
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 26,
    color: palette.brandPink,
    lineHeight: 30,
    textAlign: 'center',
  },

  // ── QR
  qrWrap: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  codeHint: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 15,
    color: palette.textPrimary + '99',
  },
  codeValue: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 15,
    color: palette.brandPink,
    letterSpacing: 3,
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -4,
  },
  expandHintText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 11,
    color: palette.textPrimary + '55',
  },

  // ── QR expanded
  qrExpandedBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  qrExpandedCard: {
    backgroundColor: palette.bgWhite,
    borderRadius: radius.main,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  qrExpandedDismiss: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 13,
    color: '#fff',
    opacity: 0.6,
  },

  // ── Separator
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.borderPeach,
  },
  dividerText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 13,
    color: palette.textPrimary + '66',
  },

  // ── Options
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  optionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 12,
    color: palette.textPrimary + 'bb',
  },

  // ── Bottom button
  closeBottomBtn: {
    backgroundColor: palette.brandPink,
    borderRadius: radius.main,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBottomText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 17,
    color: '#fff',
  },

  pressed: { opacity: 0.75 },
});
