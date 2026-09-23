import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

// TODO (Group 2): username/email/password + "Continue with Google" fields,
// real Supabase account creation.
// IMPORTANT: does NOT auto-login - routes to Login after creating an
// account, not straight into Dashboard. This is intentional, don't "fix" it.
export default function Signup() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <Pressable
        style={styles.button}
        onPress={() => router.replace('/(auth)/login')}
      >
        <Text style={styles.buttonText}>Create Account (mock)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  button: { backgroundColor: '#E4574C', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
