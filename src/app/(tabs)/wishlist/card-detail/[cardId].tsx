import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '@/src/components/PlaceholderScreen';

// Same Card Detail screen as the Dashboard tab's version, duplicated as its
// own route so the Wishlist tab bar/stack stays intact when opened from here.
export default function CardDetail() {
  const { cardId } = useLocalSearchParams();
  return <PlaceholderScreen name="Card Detail (from Wishlist)" subtitle={`cardId: ${cardId}`} />;
}
