import CardImage from '@/src/components/atoms/CardImage';
import Icon from '@/src/components/atoms/Icon';
import { DIM_UNOWNED_CARDS } from '@/src/lib/cardList';
import theme from '@/src/theme/theme';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  id: string;
  name: string;
  imageUri: string | null;
  ownedCount: number;
  width: number;
  onPress: (id: string) => void;
  onAddPress: (id: string) => void;
};

function CardThumbnail({ id, name, imageUri, ownedCount, width, onPress, onAddPress }: Props) {
  const owned = ownedCount > 0;
  return (
    <View style={{ width }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={owned ? `${name}, owned ${ownedCount}` : `${name}, not owned`}
        onPress={() => onPress(id)}
      >
        <View style={DIM_UNOWNED_CARDS && !owned ? styles.dimmed : undefined}>
          <CardImage uri={imageUri} name={name} />
        </View>
      </Pressable>

      {owned ? (
        <View style={[styles.badge, styles.badgeOwned]} accessible={false} importantForAccessibility="no-hide-descendants">
          <Icon name="check" size={14} color={theme.colors.surface} />
          {ownedCount > 1 ? <Text style={styles.count}>{ownedCount}</Text> : null}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${name} to collection`}
          onPress={() => onAddPress(id)}
          hitSlop={12}
          style={[styles.badge, styles.badgeAdd]}
        >
          <Icon name="plus" size={16} color={theme.colors.text} />
        </Pressable>
      )}
    </View>
  );
}

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
  count: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.surface },
});

export default memo(CardThumbnail);