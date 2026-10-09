import CardImage from '@/src/components/atoms/CardImage';
import Icon from '@/src/components/atoms/Icon';
import { useBadgePrefs, useDimUnownedCards } from '@/src/lib/preferences';
import theme from '@/src/theme/theme';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  id: string;
  name: string;
  imageUri: string | null;
  ownedCount: number;
  width: number;
  onPress: (id: string) => void;
  onAddPress?: (id: string) => void;
  showBadge?: boolean;
  scope?: 'cards' | 'pokedex';
};

function CardThumbnail({ id, name, imageUri, ownedCount, width, onPress, onAddPress, showBadge = true, scope = 'cards' }: Props) {
  const owned = ownedCount > 0;
  const dim = useDimUnownedCards();
  const { quickAdd, ownedBadge } = useBadgePrefs(scope ?? 'cards');
  const showAdd = showBadge && quickAdd && !owned;
  const showCheck = showBadge && ownedBadge && owned;

  return (
    <View style={{ width }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={owned ? `${name}, owned ${ownedCount}` : `${name}, not owned`}
        onPress={() => onPress(id)}
      >
        <View style={dim && !owned ? styles.dimmed : undefined}>
          <CardImage uri={imageUri} name={name} />
        </View>
      </Pressable>

      {showBadge && onAddPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={owned ? `Add another copy of ${name}` : `Add ${name} to collection`}
          onPress={() => onAddPress(id)}
          hitSlop={12}
          style={[styles.badge, owned ? styles.badgeOwned : styles.badgeAdd]}
        >
          {owned ? (
            <Icon name="check" size={14} color={theme.colors.surface} />
          ) : (
            <Icon name="plus" size={16} color={theme.colors.text} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export default memo(CardThumbnail);

const styles = StyleSheet.create({
  dimmed: { opacity: 0.45 },
  badge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
    borderWidth: 1.5,
  },
  badgeOwned: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  badgeAdd: { backgroundColor: theme.colors.surface, borderColor: theme.colors.text },
});