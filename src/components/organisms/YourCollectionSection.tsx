import IconButton from '@/src/components/atoms/IconButton';
import CollectionEntryRow from '@/src/components/molecules/CollectionEntryRow';
import type { OwnershipEntry } from '@/src/lib/ownership';
import theme from '@/src/theme/theme';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  entries: OwnershipEntry[];
  onAdd: () => void;
  onEntryPress: (entry: OwnershipEntry) => void;
  onQuantityChange: (entry: OwnershipEntry, quantity: number) => void;
  onDeleteRequest: (entry: OwnershipEntry) => void;
};

export default function YourCollectionSection({
  entries,
  onAdd,
  onEntryPress,
  onQuantityChange,
  onDeleteRequest,
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Your Collection
        </Text>
        <IconButton icon="plus" label="Add a copy to your collection" onPress={onAdd} />
      </View>

      {entries.length === 0 ? (
        <Text style={styles.empty}>You don't own this card yet. Tap + to add a copy.</Text>
      ) : (
        entries.map((e) => (
          <CollectionEntryRow
            key={e.id}
            entry={e}
            onPress={() => onEntryPress(e)}
            onQuantityChange={(n) => onQuantityChange(e, n)}
            onDeleteRequest={() => onDeleteRequest(e)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.space1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.base, color: theme.colors.text },
  empty: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text },
});