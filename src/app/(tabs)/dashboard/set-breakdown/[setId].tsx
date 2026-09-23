import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '@/src/components/PlaceholderScreen';

// Opened from Statistics' Series Progress list.
export default function SetBreakdown() {
  const { setId } = useLocalSearchParams();
  return <PlaceholderScreen name="Set Breakdown" subtitle={`setId: ${setId} - rarity-by-rarity owned/total + progress bars`} />;
}
