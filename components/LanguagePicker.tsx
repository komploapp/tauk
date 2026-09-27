import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import FlagFr from '@/assets/images/flag-fr.svg';
import FlagEn from '@/assets/images/flag-en.svg';
import FlagDe from '@/assets/images/flag-de.svg';
import FlagEs from '@/assets/images/flag-es.svg';
import { palette, spacing, radius } from '@/constants/palette';
import { useStore } from '@/store';
import { LANGUAGES } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

const FLAG: Record<Lang, React.FC<{ width: number; height: number }>> = {
  fr: FlagFr,
  en: FlagEn,
  de: FlagDe,
  es: FlagEs,
};

export function LanguagePicker() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const [open, setOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const wrapRef = useRef<View>(null);

  const FlagCurrent = FLAG[lang];

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    wrapRef.current?.measure((_fx, _fy, _w, height, _px, py) => {
      setDropdownTop(py + height + 6);
      setOpen(true);
    });
  };

  const handleSelect = (code: Lang) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <>
      <View ref={wrapRef} collapsable={false}>
        <Pressable
          style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel="Changer de langue"
        >
          <View style={styles.flagCircle}>
            <FlagCurrent width={34} height={34} />
          </View>
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1 }}>
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <BlurView style={StyleSheet.absoluteFillObject} intensity={12} tint="dark" />
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <Pressable style={[styles.dropdown, { top: dropdownTop }]} onPress={() => {}}>
          {LANGUAGES.map(({ code, label }, idx) => {
            const FlagItem = FLAG[code];
            const isActive = code === lang;
            const isLast = idx === LANGUAGES.length - 1;
            return (
              <Pressable
                key={code}
                style={({ pressed }) => [
                  styles.row,
                  !isLast && styles.rowBorder,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => handleSelect(code)}
                accessibilityRole="menuitem"
              >
                <View style={styles.flagSmall}>
                  <FlagItem width={30} height={30} />
                </View>
                <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
                {isActive && <Text style={styles.check}>✓</Text>}
              </Pressable>
            );
          })}
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: palette.bgPink,
    padding: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  flagCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  pressed: { opacity: 0.75 },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.001)' },

  dropdown: {
    position: 'absolute',
    left: 26,
    backgroundColor: palette.bgWhite,
    borderRadius: radius.main,
    borderWidth: 1,
    borderColor: palette.borderPeach,
    minWidth: 168,
    shadowColor: '#520027',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xsmall,
    paddingVertical: 10,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.borderPeach,
  },
  rowPressed: { backgroundColor: palette.bgPink + '55' },
  flagSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  label: {
    flex: 1,
    fontFamily: 'Recursive_400Regular',
    fontSize: 16,
    color: palette.textPrimary,
  },
  labelActive: {
    fontFamily: 'Recursive_600SemiBold',
    color: palette.brandPink,
  },
  check: {
    fontFamily: 'Recursive_600SemiBold',
    fontSize: 16,
    color: palette.brandPink,
  },
});
