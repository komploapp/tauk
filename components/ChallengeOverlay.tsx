import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameMenu } from '@/components/GameMenu';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '@/constants/palette';
import { useStore } from '@/store';
import type { PlayerTask, ValidatingEntry } from '@/store';

const VALIDATION_MS = 10_000;

type TaskState = 'pending' | 'validating' | 'done';

function frozenProgress(entry: ValidatingEntry): number {
  if (!entry.frozenAt) return 0;
  return Math.min(1, (entry.frozenAt - entry.startedAt) / VALIDATION_MS);
}

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

interface TaskRowProps {
  task: PlayerTask;
  state: TaskState;
  selected: boolean;
  frozenProgress?: number; // 0–1 ratio of fill progress when frozen
  onPress: () => void;
}

function TaskRow({ task, state, selected, frozenProgress, onPress }: TaskRowProps) {
  const isDone = state === 'done';
  const isValidating = state === 'validating';

  return (
    <Pressable
      style={[
        styles.row,
        selected && styles.rowSelected,
        isValidating && !selected && styles.rowValidating,
        isDone && styles.rowDone,
      ]}
      onPress={onPress}
      disabled={isDone}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: isDone }}
    >
      {/* Frozen fill anchored to right */}
      {isValidating && !selected && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {frozenProgress !== undefined && frozenProgress > 0 ? (
            <View
              style={[
                styles.validatingFill,
                { position: 'absolute', right: 0, top: 0, bottom: 0, left: `${(1 - frozenProgress) * 100}%` },
              ]}
            />
          ) : (
            <View style={styles.validatingFill} />
          )}
        </View>
      )}

      <Bullet active={selected} />

      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowText,
            selected && styles.rowTextSelected,
            isDone && styles.rowTextDone,
          ]}
          numberOfLines={3}
        >
          {task.task_text}
        </Text>
      </View>
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{label}</Text>
    </View>
  );
}

interface ChallengeOverlayProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (playerTaskId: string) => void;
}

export function ChallengeOverlay({ visible, onClose, onConfirm }: ChallengeOverlayProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const { myTasks, validatingTasks } = useStore();

  function handleShow() {
    setSelectedId(null);
  }

  const pendingTasks      = myTasks.filter((t) => t.status === 'pending' && !validatingTasks.some((e) => e.id === t.id));
  const validatingTaskList = myTasks.filter((t) => t.status === 'pending' &&  validatingTasks.some((e) => e.id === t.id));
  const doneTasks          = myTasks.filter((t) => t.status !== 'pending');

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onShow={handleShow}
    >
      <GameMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <View style={styles.sheet}>
        <SafeAreaView style={styles.inner} edges={['top', 'bottom']}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={22} color={palette.brandPink} />
            </Pressable>
            <Pressable
              onPress={() => setMenuVisible(true)}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Paramètres"
            >
              <Ionicons name="settings-outline" size={20} color={palette.brandPink} />
            </Pressable>
          </View>

          {/* ── Titre ── */}
          <Text style={styles.title}>Sur quel défi ?</Text>

          {/* ── Liste (scrollable) ── */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {validatingTaskList.length > 0 && (
              <>
                <SectionLabel label="En cours de validation" />
                {validatingTaskList.map((task) => {
                  const entry = validatingTasks.find((e) => e.id === task.id);
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      state="validating"
                      selected={selectedId === task.id}
                      frozenProgress={entry ? frozenProgress(entry) : 0}
                      onPress={() => setSelectedId(task.id)}
                    />
                  );
                })}
              </>
            )}

            {pendingTasks.length > 0 && (
              <>
                {validatingTaskList.length > 0 && <SectionLabel label="À faire" />}
                {pendingTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    state="pending"
                    selected={selectedId === task.id}
                    onPress={() => setSelectedId(task.id)}
                  />
                ))}
              </>
            )}

            {doneTasks.length > 0 && (
              <>
                <SectionLabel label="Actions réalisées" />
                {doneTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    state="done"
                    selected={false}
                    onPress={() => {}}
                  />
                ))}
              </>
            )}
          </ScrollView>

          {/* ── Confirmer ── */}
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
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 20, 134, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Titre ────────────────────────────────────────────────────────────────
  title: {
    fontFamily: 'Staatliches_400Regular',
    fontSize: 36,
    color: palette.brandPink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // ─── Liste ────────────────────────────────────────────────────────────────
  listScroll: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  listContent: {
    backgroundColor: '#ffffff',
  },

  // ─── Section label ────────────────────────────────────────────────────────
  sectionLabel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#ffffff',
  },
  sectionLabelText: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 11,
    color: palette.brandPink,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ─── Row ──────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#ffdac7',
    backgroundColor: 'rgba(255, 251, 250, 0.9)',
    overflow: 'hidden',
  },
  rowSelected: {
    backgroundColor: palette.brandPink,
  },
  rowValidating: {
    backgroundColor: 'transparent',
  },
  rowDone: {
    opacity: 0.45,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowText: {
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

  // ─── Validating fill (static #FFEBEF) ─────────────────────────────────────
  validatingFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFEBEF',
  },
  validatingLabel: {
    fontFamily: 'Recursive_400Regular',
    fontSize: 11,
    color: palette.brandPink,
    opacity: 0.6,
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

  // ─── Confirmer ────────────────────────────────────────────────────────────
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
