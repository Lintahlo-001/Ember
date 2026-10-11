import LogoImage from '@/src/components/atoms/LogoImage';
import ProgressRow from '@/src/components/molecules/ProgressRow';
import type { SetBrief } from '@/src/lib/api';
import theme from '@/src/theme/theme';
import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const INITIAL = 8;
const CHUNK = 8;
const SETTLE_MS = 300;
const STEP_MS = 40;

type RowProps = {
  id: string;
  name: string;
  logoUri: string | null;
  owned: number;
  total: number;
  onPress: (id: string) => void;
};

const SetProgressRow = memo(function SetProgressRow({ id, name, logoUri, owned, total, onPress }: RowProps) {
  const progress = useMemo(() => ({ owned, total }), [owned, total]);
  return (
    <ProgressRow
      title={name}
      leading={<LogoImage uri={logoUri} label={`${name} logo`} style={styles.logo} iconSize={20} />}
      progress={progress}
      onPress={() => onPress(id)}
      accessibilityHint="Opens the rarity breakdown"
    />
  );
});

type Props = {
  sets: SetBrief[];
  ownedBySet: Map<string, number>;
  onOpenSet: (setId: string) => void;
};

function SeriesProgressList({ sets, ownedBySet, onOpenSet }: Props) {
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
    <View style={styles.list}>
      {sets.slice(0, count).map((s) => (
        <SetProgressRow
          key={s.id}
          id={s.id}
          name={s.name}
          logoUri={s.logo_url}
          owned={ownedBySet.get(s.id) ?? 0}
          total={s.card_count_total}
          onPress={onOpenSet}
        />
      ))}
    </View>
  );
}

export default memo(SeriesProgressList);

const styles = StyleSheet.create({
  list: { gap: theme.spacing.space1 },
  logo: { width: 36, height: 28 },
});