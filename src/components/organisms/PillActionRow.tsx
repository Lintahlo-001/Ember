import IconButton from '@/src/components/atoms/IconButton';
import LogoImage from '@/src/components/atoms/LogoImage';
import Pill from '@/src/components/molecules/Pill';
import { formatPrice, pokemonArtworkUrl } from '@/src/lib/format';
import theme from '@/src/theme/theme';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  dexIds: number[];
  artistName: string | null;
  price: number | null;
  currency: string | null;
  onPokemonPress: (dexId: number) => void;
  onArtistPress: (artist: string) => void;
  // Wishlist toggle arrives in Group 5; Price detail in Group 9.
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
  onPricePress?: () => void;
};

export default function PillActionRow({
  dexIds,
  artistName,
  price,
  currency,
  onPokemonPress,
  onArtistPress,
  isWishlisted,
  onWishlistToggle,
  onPricePress,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {dexIds.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`Pokémon number ${id}`}
            onPress={() => onPokemonPress(id)}
            hitSlop={4}
            style={styles.pokemon}
          >
            <LogoImage uri={pokemonArtworkUrl(id)} label={`Pokémon ${id} artwork`} style={styles.artwork} iconSize={16} />
          </Pressable>
        ))}
        {artistName ? (
          <Pill
            icon="edit-3"
            label={artistName}
            accessibilityLabel={`Artist ${artistName}. See their cards`}
            onPress={() => onArtistPress(artistName)}
            style={styles.artist}
          />
        ) : null}
        <View style={styles.spacer} />
        <IconButton
          icon="heart"
          label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          active={isWishlisted}
          onPress={onWishlistToggle}
          disabled={!onWishlistToggle}
        />
      </View>
      <View style={styles.row}>
        <Pill
          icon="info"
          label={formatPrice(price, currency)}
          accessibilityLabel={`Market price ${formatPrice(price, currency)}`}
          onPress={onPricePress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.space1 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.space1 },
  pokemon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  artwork: { width: '100%', height: '100%' },
  artist: { flexShrink: 1 },
  spacer: { flex: 1 },
});