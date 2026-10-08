import Icon from '@/src/components/atoms/Icon';
import PokemonImage from '@/src/components/atoms/PokemonImage';
import { formatDexNumber } from '@/src/lib/pokedex';
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, number ${dexId}, ${owned ? 'owned' : 'not owned'}`}
      onPress={() => onPress(dexId)}
      style={[styles.cell, { width }]}
    >
      <View style={styles.art} accessible={false} importantForAccessibility="no-hide-descendants">
        <PokemonImage uri={imageUri} name={name} style={styles.image} iconSize={20} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.number}>{formatDexNumber(dexId)}</Text>

      {owned ? (
        <View style={styles.badge} accessible={false} importantForAccessibility="no-hide-descendants">
          <Icon name="check" size={14} color={theme.colors.surface} />
        </View>
      ) : null}
    </Pressable>
  );
}

export default memo(PokemonGridCell);

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    paddingVertical: theme.spacing.space1,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  art: { width: '100%', aspectRatio: 1 },
  image: { width: '100%', height: '100%' },
  name: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.text, maxWidth: '100%' },
  number: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
});