import CardThumbnail from '@/src/components/molecules/CardThumbnail';
import type { CardListItem } from '@/src/lib/api';
import theme from '@/src/theme/theme';
import { useMemo, type ReactElement, type Ref } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

type Row = CardListItem[];

type Props = {
  cards: CardListItem[];
  owned: Map<string, number>;
  columns: number;
  onCardPress: (cardId: string) => void;
  onAddPress: (cardId: string) => void;
  header?: ReactElement;
  emptyText: string;
  listRef?: Ref<FlatList<any>>;
};

const GAP = theme.spacing.space1;
const BOTTOM_CLEARANCE = 120;

export default function CardGrid({ cards, owned, columns, onCardPress, onAddPress, header, emptyText, listRef }: Props) {
  const { width } = useWindowDimensions();
  const itemWidth = (width - theme.spacing.space3 * 2 - GAP * (columns - 1)) / columns;

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (let i = 0; i < cards.length; i += columns) out.push(cards.slice(i, i + columns));
    return out;
  }, [cards, columns]);

  return (
    <FlatList<Row>
      ref={listRef}
      data={rows}
      keyExtractor={(r: Row) => r[0].id}
      initialNumToRender={4}
      maxToRenderPerBatch={3}
      windowSize={7}
      removeClippedSubviews
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
      contentContainerStyle={{ paddingBottom: BOTTOM_CLEARANCE }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      renderItem={({ item }: { item: Row }) => (
        <View style={styles.row}>
          {item.map((c) => (
            <CardThumbnail
              key={c.id}
              id={c.id}
              name={c.name}
              imageUri={c.image_url}
              ownedCount={owned.get(c.id) ?? 0}
              width={itemWidth}
              onPress={onCardPress}
              onAddPress={onAddPress}
            />
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  empty: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.space4,
  },
});