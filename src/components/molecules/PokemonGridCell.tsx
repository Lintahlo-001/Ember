import Icon from '@/src/components/atoms/Icon';
import PokemonImage from '@/src/components/atoms/PokemonImage';
import { formatDexNumber } from '@/src/lib/pokedex';
import { useBadgePrefs, useDimUnownedPokemon } from '@/src/lib/preferences';
import theme from '@/src/theme/theme';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  dexId: number;
  name: string;
  imageUri: string;
  owned: boolean;
  width: number;
  onPress: (dexId: number) => void;
};

function PokemonGridCell({ dexId, name, imageUri, owned, width, onPress }: Props) {
  const dim = useDimUnownedPokemon();
  const { ownedBadge } = useBadgePrefs('pokedex');
  
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, number ${dexId}, ${owned ? 'owned' : 'not owned'}`}
      onPress={() => onPress(dexId)}
      style={[styles.cell, { width }]}
    >
      <View style={styles.art} accessible={false} importantForAccessibility="no-hide-descendants">
        <View style={[styles.fill, dim && !owned && styles.dimmed]}>
          <PokemonImage uri={imageUri} name={name} style={styles.fill} iconSize={20} />
        </View>
      </View>

      {owned && ownedBadge ? (
        <View style={styles.badge}>
          <Icon name="check" size={14} color={theme.colors.surface} />
        </View>
      ) : null}

      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>

      <Text style={styles.number}>{formatDexNumber(dexId)}</Text>
    </Pressable>
  );
}

export default memo(PokemonGridCell);

const styles = StyleSheet.create({
  cell: {
    position: 'relative',
    alignItems: 'center',
    paddingVertical: theme.spacing.space1,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },

  art: {
    width: '100%',
    aspectRatio: 1,
  },

  fill: {
    width: '100%',
    height: '100%',
  },

  dimmed: {
    opacity: 0.45,
  },

  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },

  name: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
    maxWidth: '100%',
  },

  number: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
  },
});