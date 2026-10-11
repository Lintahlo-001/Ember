import SetCard from '@/src/components/molecules/SetCard';
import type { SetBrief } from '@/src/lib/api';
import theme from '@/src/theme/theme';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const INITIAL = 8;
const CHUNK = 8;
const SETTLE_MS = 300;
const STEP_MS = 40;

type Props = {
  sets: SetBrief[];
  ownedBySet: Map<string, number>;
  itemWidth: number;
  onOpenSet: (setId: string) => void;
};

function SeriesSetGrid({ sets, ownedBySet, itemWidth, onOpenSet }: Props) {
  const [count, setCount] = useState(INITIAL);

  useEffect(() => {
    if (count >= sets.length) return;
    const t = setTimeout(
      () => setCount((c) => Math.min(c + CHUNK, sets.length)),
      count === INITIAL ? SETTLE_MS : STEP_MS,
    );
    return () => clearTimeout(t);
  }, [count, sets.length]);

  return (
    <View style={styles.grid}>
      {sets.slice(0, count).map((s) => (
        <View key={s.id} style={{ width: itemWidth }}>
          <SetCard
            id={s.id}
            name={s.name}
            logoUri={s.logo_url}
            cardCount={s.card_count_total}
            owned={ownedBySet.get(s.id) ?? 0}
            onPress={onOpenSet}
          />
        </View>
      ))}
    </View>
  );
}

export default memo(SeriesSetGrid);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.space1 },
});