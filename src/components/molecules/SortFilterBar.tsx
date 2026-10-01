import Button from '@/src/components/atoms/Button';
import IconButton from '@/src/components/atoms/IconButton';
import OptionSheet, { OptionRow, OptionSectionLabel } from '@/src/components/molecules/OptionSheet';
import Pill from '@/src/components/molecules/Pill';
import {
    filterLabel,
    SORT_LABELS,
    type CardFilter,
    type SortDir,
    type SortKey,
} from '@/src/lib/cardList';
import theme from '@/src/theme/theme';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sortKey: SortKey;
  dir: SortDir;
  onSortKeyChange: (k: SortKey) => void;
  onDirChange: (d: SortDir) => void;
  filter: CardFilter;
  onFilterChange: (f: CardFilter) => void;
  rarities: string[];
  columns: number;
  onColumnsCycle: () => void;
  trailing?: ReactNode;
};

const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

export default function SortFilterBar({
  sortKey,
  dir,
  onSortKeyChange,
  onDirChange,
  filter,
  onFilterChange,
  rarities,
  columns,
  onColumnsCycle,
  trailing,
}: Props) {
  const [sheet, setSheet] = useState<'sort' | 'filter' | null>(null);
  const close = () => setSheet(null);
  const pickFilter = (f: CardFilter) => {
    onFilterChange(f);
    close();
  };

  return (
    <View style={styles.bar}>
      <View style={styles.pillSlot}>
        <Pill
          icon={dir === 'asc' ? 'arrow-up' : 'arrow-down'}
          label={`Sort: ${SORT_LABELS[sortKey]}`}
          accessibilityLabel={`Sort by ${SORT_LABELS[sortKey]}, ${dir === 'asc' ? 'ascending' : 'descending'}. Change sort`}
          onPress={() => setSheet('sort')}
        />
      </View>
      <View style={styles.pillSlot}>
        <Pill
          label={`Filter: ${filterLabel(filter)}`}
          accessibilityLabel={`Filter: ${filterLabel(filter)}. Change filter`}
          onPress={() => setSheet('filter')}
        />
      </View>
      {trailing}
      <IconButton icon="grid" label={`Show ${columns === 5 ? 3 : columns + 1} columns`} onPress={onColumnsCycle} />

      <OptionSheet visible={sheet === 'sort'} title="Sort by" onClose={close}>
        {SORT_KEYS.map((k) => (
          <OptionRow key={k} label={SORT_LABELS[k]} selected={k === sortKey} onPress={() => onSortKeyChange(k)} />
        ))}
        <OptionSectionLabel>Order</OptionSectionLabel>
        <OptionRow label="Ascending" selected={dir === 'asc'} onPress={() => onDirChange('asc')} />
        <OptionRow label="Descending" selected={dir === 'desc'} onPress={() => onDirChange('desc')} />
        <View style={styles.done}>
          <Button label="Done" variant="cta" onPress={close} />
        </View>
      </OptionSheet>

      <OptionSheet visible={sheet === 'filter'} title="Filter by" onClose={close}>
        <OptionRow label="All" selected={filter.kind === 'all'} onPress={() => pickFilter({ kind: 'all' })} />
        <OptionRow label="Owned" selected={filter.kind === 'owned'} onPress={() => pickFilter({ kind: 'owned' })} />
        <OptionRow
          label="Not Owned"
          selected={filter.kind === 'notOwned'}
          onPress={() => pickFilter({ kind: 'notOwned' })}
        />
        {rarities.length > 0 ? <OptionSectionLabel>Rarity</OptionSectionLabel> : null}
        {rarities.map((r) => (
          <OptionRow
            key={r}
            label={r}
            selected={filter.kind === 'rarity' && filter.rarity === r}
            onPress={() => pickFilter({ kind: 'rarity', rarity: r })}
          />
        ))}
      </OptionSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space1 },
  pillSlot: { flex: 1 },
  done: { marginTop: theme.spacing.space2 },
});