import { useLocalSearchParams } from 'expo-router';
import PlaceholderScreen from '@/src/components/PlaceholderScreen';

export default function SetDetail() {
  const { setId } = useLocalSearchParams();
  return <PlaceholderScreen name="Set Detail" subtitle={`setId: ${setId} - logo, name, release date, progress, card grid`} />;
}
