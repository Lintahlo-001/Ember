import Toggle from '@/src/components/atoms/Toggle';
import { theme } from '@/src/theme/theme';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  subtext?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  showDivider?: boolean;
};

export function ToggleRow({ icon, label, subtext, value, onValueChange, showDivider }: Props) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={subtext ? `${label}. ${subtext}` : label}
      style={[s.row, showDivider && s.divider]}
    >
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <Feather name={icon} size={22} color={theme.colors.text} />
      </View>
      <View style={s.text}>
        <Text style={s.label}>{label}</Text>
        {!!subtext && <Text style={s.sub}>{subtext}</Text>}
      </View>
      <Toggle value={value} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space2,
    minHeight: 56,
    paddingVertical: theme.spacing.space1,
    paddingHorizontal: theme.spacing.space2,
  },
  divider: { borderTopWidth: 1.5, borderTopColor: theme.colors.text },
  text: { flex: 1 },
  label: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  sub: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});