import Icon from '@/src/components/atoms/Icon';
import type { Suggestion } from '@/src/lib/api';
import theme from '@/src/theme/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { suggestions: Suggestion[]; onPick: (s: Suggestion) => void };

export default function SearchSuggestions({ suggestions, onPick }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.list}>
      {suggestions.map((s, i) => (
        <Pressable
          key={`${s.kind}:${s.label}`}
          accessibilityRole="button"
          accessibilityLabel={`${s.kind === 'artist' ? 'Artist' : 'Card'} ${s.label}`}
          onPress={() => onPick(s)}
          style={[styles.row, i > 0 && styles.divider]}
        >
          <Icon name={s.kind === 'artist' ? 'edit-3' : 'search'} size={16} color={theme.colors.text} />
          <Text style={styles.label} numberOfLines={1}>
            {s.label}
          </Text>
          {s.kind === 'artist' ? <Text style={styles.tag}>Artist</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
    paddingHorizontal: theme.spacing.space2,
  },
  divider: { borderTopWidth: 1, borderTopColor: '#ddd' },
  label: { flex: 1, fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text },
  tag: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});