import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '@/src/components/PlaceholderScreen';

export default function CardDetail() {
  const { cardId } = useLocalSearchParams();
  return <PlaceholderScreen name="Card Detail (from Pokedex)" subtitle={`cardId: ${cardId}`} />;
}
