import LogoImage from '@/src/components/atoms/LogoImage';
import Screen from '@/src/components/layout/Screen';
import ProgressRow from '@/src/components/molecules/ProgressRow';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import StatusView from '@/src/components/molecules/StatusView';
import { useOwnedTotals } from '@/src/hooks/useOwnedTotals';
import type { SetDetail } from '@/src/lib/api';
import { catalog } from '@/src/lib/catalog';
import { rarityBreakdown, UNKNOWN_RARITY } from '@/src/lib/stats';
import theme from '@/src/theme/theme';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function SetBreakdown() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const id = typeof setId === 'string' ? setId : '';

  const [set, setSet] = useState<SetDetail | null>(null);
  const [icons, setIcons] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    catalog
      .set(id)
      .then((s) => !cancelled && setSet(s))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    catalog
      .ensureRarities()
      .then(() => catalog.localRarities())
      .then((list) => !cancelled && setIcons(new Map(list.map((r) => [r.name.toLowerCase(), r.icon_url]))))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const cards = useMemo(() => set?.cards ?? [], [set]);
  const ids = useMemo(() => cards.map((c) => c.id), [cards]);
  const owned = useOwnedTotals(ids);

  const rows = useMemo(() => rarityBreakdown(cards, owned), [cards, owned]);
  const total = { owned: cards.filter((c) => owned.has(c.id)).length, total: cards.length };

  return (
    <Screen>
      <ScreenHeader title={set?.name ?? 'Set Breakdown'} />
      <StatusView loading={loading} error={error} onRetry={() => setReloadKey((k) => k + 1)}>
        {set ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ProgressRow prominent title="Total" progress={total} />
            {rows.map((r) => {
              const icon = r.rarity === UNKNOWN_RARITY ? undefined : icons.get(r.rarity.toLowerCase());
              return (
                <ProgressRow
                  key={r.rarity}
                  prominent
                  title={r.rarity}
                  trailing={
                    icon ? (
                      <View accessible={false} importantForAccessibility="no-hide-descendants">
                        <LogoImage uri={icon} label={`${r.rarity} icon`} style={styles.icon} iconSize={14} />
                      </View>
                    ) : undefined
                  }
                  progress={{ owned: r.owned, total: r.total }}
                />
              );
            })}
          </ScrollView>
        ) : null}
      </StatusView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.space2, paddingBottom: 120, paddingTop: theme.spacing.space1 },
  icon: { width: 20, height: 20 },
});