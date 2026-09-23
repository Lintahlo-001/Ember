import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

// Shared bottom-sheet modal used in "add" mode (tapping + on an unowned card
// anywhere) and "edit" mode (tapping an existing entry in Card Detail's
// Your Collection section). Fields: Quantity, Condition, Variant, Notes.
export default function OwnershipEntryModal() {
  const { cardId, mode } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ownership Entry ({mode ?? 'add'})</Text>
      <Text style={styles.subtitle}>cardId: {cardId}</Text>
      <Text style={styles.subtitle}>Quantity, Condition, Variant, Notes - TODO</Text>
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
