import Button from '@/src/components/atoms/Button';
import IconButton from '@/src/components/atoms/IconButton';
import GridIcon from '@/src/components/atoms/icons/GridIcon';
import OptionSheet, { OptionRow, OptionSectionLabel } from '@/src/components/molecules/OptionSheet';
import Pill from '@/src/components/molecules/Pill';
import {
  filterLabel, NO_FILTER, OWNERSHIP_LABELS, SORT_LABELS,
  type CardFilter, type OwnershipFilter, type SortDir, type SortKey,
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
  rarities: string[]; // already ordered by rarity
  columns: number;
  onColumnsCycle: () => void;
  trailing?: ReactNode;
};

const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];
const OWNERSHIP_KEYS = Object.keys(OWNERSHIP_LABELS) as OwnershipFilter[];

export default function SortFilterBar({
  sortKey, dir, onSortKeyChange, onDirChange, filter, onFilterChange,
  rarities, columns, onColumnsCycle, trailing,
}: Props) {
  const [sheet, setSheet] = useState<'sort' | 'filter' | null>(null);
  const [pendingKey, setPendingKey] = useState(sortKey);
  const [pendingDir, setPendingDir] = useState(dir);
  const [pendingFilter, setPendingFilter] = useState(filter);

  const open = (which: 'sort' | 'filter') => {
    setPendingKey(sortKey);
    setPendingDir(dir);
    setPendingFilter(filter);
    setSheet(which);
  };
  const close = () => setSheet(null); // backdrop / back = discard pending changes

  const applySort = () => {
    if (pendingKey !== sortKey) onSortKeyChange(pendingKey);
    if (pendingDir !== dir) onDirChange(pendingDir);
    close();
  };
  const applyFilter = () => {
    onFilterChange(pendingFilter);
    close();
  };
  const toggleRarity = (r: string) =>
    setPendingFilter((f) => ({
      ...f,
      rarities: f.rarities.includes(r) ? f.rarities.filter((x) => x !== r) : [...f.rarities, r],
    }));

  const nextColumns = columns === 5 ? 3 : columns + 1;

  return (
    <View style={styles.bar}>
      <View style={styles.pillSlot}>
        <Pill
          icon={dir === 'asc' ? 'arrow-up' : 'arrow-down'}
          label={`Sort: ${SORT_LABELS[sortKey]}`}
          accessibilityLabel={`Sort by ${SORT_LABELS[sortKey]}, ${dir === 'asc' ? 'ascending' : 'descending'}. Change sort`}
          onPress={() => open('sort')}
        />
      </View>
      <View style={styles.pillSlot}>
        <Pill
          label={`Filter: ${filterLabel(filter)}`}
          accessibilityLabel={`Filter: ${filterLabel(filter)}. Change filter`}
          onPress={() => open('filter')}
        />
      </View>
      {trailing}
      <IconButton
        label={`${columns} columns. Switch to ${nextColumns}`}
        renderIcon={(color, size) => <GridIcon columns={columns} color={color} size={size} />}
        onPress={onColumnsCycle}
      />

      <OptionSheet
        visible={sheet === 'sort'}
        title="Sort by"
        onClose={close}
        footer={<Button label="Done" variant="cta" onPress={applySort} />}
      >
        {SORT_KEYS.map((k) => (
          <OptionRow key={k} label={SORT_LABELS[k]} selected={k === pendingKey} onPress={() => setPendingKey(k)} />
        ))}
        <OptionSectionLabel>Order</OptionSectionLabel>
        <OptionRow label="Ascending" selected={pendingDir === 'asc'} onPress={() => setPendingDir('asc')} />
        <OptionRow label="Descending" selected={pendingDir === 'desc'} onPress={() => setPendingDir('desc')} />
      </OptionSheet>

      <OptionSheet
        visible={sheet === 'filter'}
        title="Filter by"
        onClose={close}
        footer={
          <View style={styles.footerRow}>
            <View style={styles.slot}>
              <Button label="Clear" variant="outline" onPress={() => setPendingFilter(NO_FILTER)} />
            </View>
            <View style={styles.slot}>
              <Button label="Done" variant="cta" onPress={applyFilter} />
            </View>
          </View>
        }
      >
        <OptionSectionLabel>Ownership</OptionSectionLabel>
        {OWNERSHIP_KEYS.map((k) => (
          <OptionRow
            key={k}
            label={OWNERSHIP_LABELS[k]}
            selected={pendingFilter.ownership === k}
            onPress={() => setPendingFilter((f) => ({ ...f, ownership: k }))}
          />
        ))}
        {rarities.length > 0 ? <OptionSectionLabel>Rarity</OptionSectionLabel> : null}
        {rarities.map((r) => (
          <OptionRow
            key={r}
            multi
            label={r}
            selected={pendingFilter.rarities.includes(r)}
            onPress={() => toggleRarity(r)}
          />
        ))}
      </OptionSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space1 },
  pillSlot: { flex: 1 },
  footerRow: { flexDirection: 'row', gap: theme.spacing.space1 },
  slot: { flex: 1 },
});