import { theme } from '@/src/theme/theme';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

type Props = { icon: React.ComponentProps<typeof Feather>['name']; label: string; subtext?: string; value: boolean; onValueChange: (v: boolean) => void };

export function ToggleRow({ icon, label, subtext, value, onValueChange }: Props) {
  return (
    <Pressable onPress={() => onValueChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} style={s.row}>
      <Feather name={icon} size={22} color={theme.colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{label}</Text>
        {!!subtext && <Text style={s.sub}>{subtext}</Text>}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: theme.colors.primary }} thumbColor="#fff" />
    </Pressable>
  );
}
const s = StyleSheet.create({
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: theme.colors.surface, borderRadius: 12 },
  label: { fontFamily: 'WorkSans-Medium', fontSize: 16, color: theme.colors.text },
  sub: { fontFamily: 'WorkSans-Regular', fontSize: 13, color: theme.colors.text, opacity: 0.7, marginTop: 2 },
});