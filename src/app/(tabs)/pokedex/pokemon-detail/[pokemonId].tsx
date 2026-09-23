import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '@/src/components/PlaceholderScreen';

export default function PokemonDetail() {
  const { pokemonId } = useLocalSearchParams();
  return <PlaceholderScreen name="Pokemon Detail" subtitle={`pokemonId: ${pokemonId} - owned/total progress, grid of every card printed of this Pokemon`} />;
}
