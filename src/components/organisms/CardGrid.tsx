import CardThumbnail from '@/src/components/molecules/CardThumbnail';
import type { CardListItem } from '@/src/lib/api';
import theme from '@/src/theme/theme';
import type { ReactElement } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions } from 'react-native';

type Props = {
  cards: CardListItem[];
  owned: Map<string, number>;
  columns: number;
  onCardPress: (cardId: string) => void;
  onAddPress: (cardId: string) => void;
  header?: ReactElement;
  emptyText: string;
};

const GAP = theme.spacing.space1;
const BOTTOM_CLEARANCE = 120;

export default function CardGrid({ cards, owned, columns, onCardPress, onAddPress, header, emptyText }: Props) {
  const { width } = useWindowDimensions();
  const itemWidth = (width - theme.spacing.space3 * 2 - GAP * (columns - 1)) / columns;

  return (
    <FlatList
      key={columns}
      data={cards}
      numColumns={columns}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
      columnWrapperStyle={columns > 1 ? { gap: GAP, marginBottom: GAP } : undefined}
      contentContainerStyle={{ paddingBottom: BOTTOM_CLEARANCE }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <CardThumbnail
          name={item.name}
          imageUri={item.image_url}
          ownedCount={owned.get(item.id) ?? 0}
          width={itemWidth}
          onPress={() => onCardPress(item.id)}
          onAddPress={() => onAddPress(item.id)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.space4,
  },
});