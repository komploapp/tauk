import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { palette, spacing, radius } from '@/constants/palette';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const RULES = [
  {
    title: '🎯 But du jeu',
    body: "Accomplis tes tâches secrètes sans te faire démasquer, et accuse les autres avant qu'ils t'éliminent.",
  },
  {
    title: '📋 Chaque service',
    body: "Chaque joueur reçoit des tâches à réaliser discrètement pendant la partie. Accomplis-les sans attirer l'attention.",
  },
  {
    title: '🕵️ Accuser',
    body: "Si tu soupçonnes quelqu'un d'avoir accompli une tâche, glisse sa carte vers le bas pour l'accuser. Attention, une mauvaise accusation te coûte des points !",
  },
  {
    title: '✅ Valider une tâche',
    body: "Maintiens ton doigt sur une tâche pour la marquer comme accomplie. Les autres joueurs verront que quelqu'un l'a faite — à toi de rester discret.",
  },
  {
    title: '🏆 Score',
    body: 'Tu gagnes des points pour chaque tâche accomplie et chaque accusation réussie. Le joueur avec le plus de points à la fin remporte la partie.',
  },
];

export function RulesModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <BlurView style={StyleSheet.absoluteFillObject} intensity={20} tint="dark" />
        </View>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Règles du jeu</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {RULES.map((rule) => (
              <View key={rule.title} style={styles.rule}>
                <Text style={styles.ruleTitle}>{rule.title}</Text>
                <Text style={styles.ruleBody}>{rule.body}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fermer les règles"
          >
            <Text style={styles.closeBtnText}>Compris !</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.bgWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.medium,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.borderPeach,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 38,
    color: palette.brandPink,
    textTransform: 'uppercase',
    lineHeight: 40,
    marginBottom: 16,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 20, paddingBottom: 8 },
  rule: { gap: 6 },
  ruleTitle: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 16,
    color: palette.brandGreen,
  },
  ruleBody: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: palette.textPrimary,
  },
  closeBtn: {
    marginTop: 24,
    backgroundColor: palette.brandGreen,
    borderRadius: radius.main,
    paddingVertical: spacing.xsmall,
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 18,
    lineHeight: 24,
    color: '#fff',
  },
  pressed: { opacity: 0.8 },
});
