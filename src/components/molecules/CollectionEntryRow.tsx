import Icon from '@/src/components/atoms/Icon';
import QuantityStepper from '@/src/components/molecules/QuantityStepper';
import { variantLabel } from '@/src/lib/format';
import type { OwnershipEntry } from '@/src/lib/ownership';
import theme from '@/src/theme/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  entry: OwnershipEntry;
  onPress: () => void;
  onQuantityChange: (n: number) => void;
  onDeleteRequest: () => void;
};

export default function CollectionEntryRow({ entry, onPress, onQuantityChange, onDeleteRequest }: Props) {
  const hasNote = entry.notes.trim().length > 0;
  const title = `${variantLabel(entry.variant)}, ${entry.condition}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, quantity ${entry.quantity}${hasNote ? ', has a note' : ''}. Edit entry`}
      onPress={onPress}
      style={styles.row}
    >
      {hasNote ? (
        <View style={styles.tag} accessible={false} importantForAccessibility="no-hide-descendants">
          <Icon name="file-text" size={12} color={theme.colors.surface} />
        </View>
      ) : null}

      <View style={styles.text}>
        <Text style={styles.variant} numberOfLines={1}>
          {variantLabel(entry.variant)}
        </Text>
        <Text style={styles.condition} numberOfLines={1}>
          {entry.condition}
        </Text>
      </View>

      <QuantityStepper
        value={entry.quantity}
        onChange={onQuantityChange}
        deleteAtMin
        onDeleteRequest={onDeleteRequest}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.space1,
    minHeight: 52,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.space2,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  tag: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 8,
    backgroundColor: theme.colors.text,
  },
  text: { flex: 1, paddingLeft: theme.spacing.space1 },
  variant: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  condition: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
});