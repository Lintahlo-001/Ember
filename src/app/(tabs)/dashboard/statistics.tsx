import LogoImage from '@/src/components/atoms/LogoImage';
import PokeballIcon from '@/src/components/atoms/icons/PokeballIcon';
import Screen from '@/src/components/layout/Screen';
import ProgressRow from '@/src/components/molecules/ProgressRow';
import RankedCardRow from '@/src/components/molecules/RankedCardRow';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import StatusView from '@/src/components/molecules/StatusView';
import SeriesGroup from '@/src/components/organisms/SeriesGroup';
import { useAllOwned } from '@/src/hooks/useAllOwned';
import { useCollapsed } from '@/src/hooks/useCollapsed';
import { useCurrency } from '@/src/hooks/useCurrency';
import { useStatistics } from '@/src/hooks/useStatistics';
import { cardNumber } from '@/src/lib/format';
import { groupBySerie, ownedPerSet } from '@/src/lib/series';
import { topValuable, totalUniqueCards } from '@/src/lib/stats';
import theme from '@/src/theme/theme';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function Statistics() {
  const { owned, loaded, error: ownedError, reload: reloadOwned } = useAllOwned();
  const { data, error, reload } = useStatistics(owned, loaded);
  const { convert, format } = useCurrency();
  const { isCollapsed, toggle } = useCollapsed('statistics');

  const top = useMemo(
    () => (data ? topValuable(data.ownedCards, data.sets, convert) : []),
    [data, convert],
  );
  const groups = useMemo(() => (data ? groupBySerie(data.sets) : []), [data]);
  const ownedBySet = useMemo(() => (data ? ownedPerSet(data.owned, data.sets) : new Map<string, number>()), [data]);

  const openSet = (setId: string) =>
    router.push({ pathname: '/(tabs)/dashboard/set-breakdown/[setId]', params: { setId } });

  const failure = ownedError ?? error;
  const retry = () => {
    reloadOwned();
    reload();
  };

  return (
    <Screen>
      <ScreenHeader title="Statistics" />
      <StatusView loading={!data && !failure} error={data ? null : failure} onRetry={retry}>
        {data ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ProgressRow
              prominent
              title="Unique Cards"
              progress={{ owned: data.owned.size, total: totalUniqueCards(data.sets) }}
            />
            <ProgressRow
              prominent
              title="Pokémon"
              trailing={<PokeballIcon size={22} color={theme.colors.accent} />}
              progress={{ owned: data.ownedPokemon, total: data.totalPokemon }}
            />

            <Text style={styles.section} accessibilityRole="header">
              Top 5 Most Valuable
            </Text>
            {top.length === 0 ? (
              <Text style={styles.empty}>
                {data.owned.size === 0
                  ? 'Add cards to your collection to see your most valuable ones.'
                  : 'None of your cards have a price yet.'}
              </Text>
            ) : (
              <View style={styles.list}>
                {top.map((r, i) => (
                  <View key={r.card.id} style={i > 0 ? styles.divider : undefined}>
                    <RankedCardRow
                      rank={i + 1}
                      name={r.card.name}
                      subtitle={`${r.setName} • ${cardNumber(
                        r.card.local_id,
                        data.sets.find((s) => s.id === r.card.set_id)?.card_count_official,
                      )}`}
                      price={format(r.card.price_market, r.card.price_currency)}
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/dashboard/card-detail/[cardId]',
                          params: { cardId: r.card.id },
                        })
                      }
                    />
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.section} accessibilityRole="header">
              Series Progress
            </Text>
            {groups.map((g) => (
              <SeriesGroup
                key={g.name}
                name={g.name}
                collapsed={isCollapsed(g.name)}
                onToggle={() => toggle(g.name)}
              >
                <View style={styles.sets}>
                  {g.sets.map((s) => (
                    <ProgressRow
                      key={s.id}
                      title={s.name}
                      leading={
                        <LogoImage uri={s.logo_url} label={`${s.name} logo`} style={styles.logo} iconSize={20} />
                      }
                      progress={{ owned: ownedBySet.get(s.id) ?? 0, total: s.card_count_total }}
                      onPress={() => openSet(s.id)}
                      accessibilityHint="Opens the rarity breakdown"
                    />
                  ))}
                </View>
              </SeriesGroup>
            ))}
          </ScrollView>
        ) : null}
      </StatusView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.space2, paddingBottom: 120, paddingTop: theme.spacing.space1 },
  section: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
  list: {
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  divider: { borderTopWidth: 1.5, borderTopColor: theme.colors.text },
  empty: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text },
  sets: { gap: theme.spacing.space1 },
  logo: { width: 36, height: 28 },
});