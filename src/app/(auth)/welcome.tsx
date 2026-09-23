import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function Welcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ember</Text>
      <Text style={styles.subtitle}>Track your Pokémon card collection</Text>

      <Link href="/(auth)/login" asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </Pressable>
      </Link>

      <Link href="/(auth)/signup" asChild>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sign Up</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff', gap: 12 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  primaryButton: { backgroundColor: '#E4574C', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 12, width: '100%', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  secondaryButton: { paddingVertical: 14, paddingHorizontal: 48, borderRadius: 12, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  secondaryButtonText: { color: '#333', fontWeight: '600' },
});
