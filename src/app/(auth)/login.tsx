import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

// TODO (Group 2): email/password + "Continue with Google" fields, real
// Supabase auth call. Logging in goes straight to Dashboard (confirmed).
export default function Login() {
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Pressable
        style={styles.button}
        onPress={() => {
          login();
          router.replace('/(tabs)/dashboard');
        }}
      >
        <Text style={styles.buttonText}>Log In (mock)</Text>
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
