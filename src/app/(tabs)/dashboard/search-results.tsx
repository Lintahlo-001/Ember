import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '@/src/components/PlaceholderScreen';

// Opened from Dashboard's search bar, or from Card Detail's artist pill
// (pre-filtered by artist instead of a text query).
export default function SearchResults() {
  const { query, artist } = useLocalSearchParams();
  return <PlaceholderScreen name="Search Results" subtitle={`query: ${query ?? '-'} / artist: ${artist ?? '-'}`} />;
}
