import Screen from '@/src/components/layout/Screen';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import { ToggleRow } from '@/src/components/molecules/ToggleRow';
import { setPref, usePref } from '@/src/lib/preferences';
import theme from '@/src/theme/theme';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function DisplaySettings() {
  const dimCards = usePref('dimUnownedCards');
  const dimPokemon = usePref('dimUnownedPokemon');
  const quickAdd = usePref('cardsQuickAdd');
  const cardsBadge = usePref('cardsOwnedBadge');
  const dexBadge = usePref('pokedexOwnedBadge');

  return (
    <Screen>
      <ScreenHeader title="Display" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          <ToggleRow
            icon="eye-off"
            label="Dim cards I don't own"
            subtext="Card lists show unowned cards faded"
            value={dimCards}
            onValueChange={(v) => setPref('dimUnownedCards', v)}
          />
          <ToggleRow
            icon="eye-off"
            label="Dim Pokémon I haven't collected"
            subtext="Pokédex shows uncollected Pokémon faded"
            value={dimPokemon}
            onValueChange={(v) => setPref('dimUnownedPokemon', v)}
            showDivider
          />
          <ToggleRow
            icon="plus-circle"
            label="Quick add on cards"
            subtext="Show the + on cards you don't own"
            value={quickAdd}
            onValueChange={(v) => setPref('cardsQuickAdd', v)}
            showDivider
          />
          <ToggleRow
            icon="check-circle"
            label="Owned badge on cards"
            subtext="Show a ✓ on cards you own"
            value={cardsBadge}
            onValueChange={(v) => setPref('cardsOwnedBadge', v)}
            showDivider
          />
          <ToggleRow
            icon="check-circle"
            label="Owned badge in Pokédex"
            subtext="Show a ✓ on owned Pokémon"
            value={dexBadge}
            onValueChange={(v) => setPref('pokedexOwnedBadge', v)}
            showDivider
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: theme.spacing.space2, paddingBottom: 120 },
  group: {
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
});