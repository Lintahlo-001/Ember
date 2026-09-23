import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '@/src/components/PlaceholderScreen';

// Busiest screen in the app - image w/ prev-next peeks, pokemon/artist/price
// pills, wishlist heart, Your Collection section, swipe nav within list.
export default function CardDetail() {
  const { cardId } = useLocalSearchParams();
  return <PlaceholderScreen name="Card Detail" subtitle={`cardId: ${cardId}`} />;
}
