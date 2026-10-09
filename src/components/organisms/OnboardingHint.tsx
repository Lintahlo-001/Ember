import { theme } from '@/src/theme/theme';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const STEPS: { icon: React.ComponentProps<typeof Feather>['name']; title: string; body: string }[] = [
  { icon: 'search', title: 'Find a card', body: 'Use the search bar on the Dashboard, type a card or Pokémon name, and submit.' },
  { icon: 'plus-circle', title: 'Mark it as owned', body: 'Tap + on a card, then set the quantity, condition and variant you actually have.' },
  { icon: 'layers', title: 'Watch it grow', body: 'Your cards show up in My Cards, and set progress updates on the Dashboard.' },
];

export function OnboardingHint({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  const step = STEPS[i];
  const close = () => { setI(0); onClose(); };

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={s.backdrop}>
        <View style={s.card} accessibilityViewIsModal>
          <Feather name={step.icon} size={40} color={theme.colors.primary} />
          <Text style={s.title}>{step.title}</Text>
          <Text style={s.body}>{step.body}</Text>
          <View style={s.dots} accessibilityLabel={`Step ${i + 1} of ${STEPS.length}`}>
            {STEPS.map((_, n) => <View key={n} style={[s.dot, n === i && s.dotOn]} />)}
          </View>
          <Pressable onPress={() => (last ? close() : setI(i + 1))} accessibilityRole="button" style={s.btn}>
            <Text style={s.btnText}>{last ? 'Got it' : 'Next'}</Text>
          </Pressable>
          {!last && (
            <Pressable onPress={close} accessibilityRole="button" style={s.skip}>
              <Text style={s.skipText}>Skip</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(32,28,28,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 24, alignItems: 'center', gap: 12 },
  title: { fontFamily: 'Anton-Regular', fontSize: 24, color: theme.colors.text, textAlign: 'center' },
  body: { fontFamily: 'WorkSans-Regular', fontSize: 15, lineHeight: 22, color: theme.colors.text, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(32,28,28,0.2)' },
  dotOn: { backgroundColor: theme.colors.primary },
  btn: { minHeight: 48, alignSelf: 'stretch', borderRadius: 12, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: 'WorkSans-Medium', fontSize: 16, color: '#fff' },
  skip: { minHeight: 48, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: 'WorkSans-Medium', fontSize: 15, color: theme.colors.text },
});