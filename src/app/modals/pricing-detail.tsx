import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

// Opened from Card Detail's price pill. Standard/Market/Low/Mid/High breakdown.
export default function PricingDetailModal() {
  const { cardId } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pricing Detail</Text>
      <Text style={styles.subtitle}>cardId: {cardId}</Text>
      <Text style={styles.subtitle}>Standard / Market / Low / Mid / High rows - TODO</Text>
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'flex-end', gap: 8 },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666' },
  closeButton: { marginTop: 16, alignItems: 'center', padding: 14 },
  closeButtonText: { color: '#E4574C', fontWeight: '600' },
});
