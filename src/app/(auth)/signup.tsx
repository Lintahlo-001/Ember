import Button from '@/src/components/atoms/Button';
import Icon from '@/src/components/atoms/Icon';
import PokeballIcon from '@/src/components/atoms/icons/PokeballIcon';
import Screen from '@/src/components/layout/Screen';
import FormField from '@/src/components/molecules/FormField';
import SocialAuthButton from '@/src/components/molecules/SocialAuthButton';
import SuccessDialog from '@/src/components/molecules/SuccessDialog';
import { useAuth } from '@/src/context/AuthContext';
import theme from '@/src/theme/theme';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function Signup() {
  const { signUpWithPassword, signInWithGoogle } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSignup = async () => {
    setError(null);
    setSubmitting(true);
    const { error: signUpError } = await signUpWithPassword(email.trim(), password, username.trim());
    setSubmitting(false);
    if (signUpError) return setError(signUpError);
    setShowSuccess(true);
  };

  const handleSuccessConfirm = () => {
    router.replace('/(auth)/login');
  };

  const handleGoogle = async () => {
    setError(null);
    const { error: googleError, cancelled } = await signInWithGoogle();
    if (cancelled) return;
    if (googleError) return setError(googleError);
    router.replace('/(tabs)/dashboard');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
          <Icon name="chevron-left" size={24} color={theme.colors.text} />
        </Pressable>

        <View style={styles.header}>
          <PokeballIcon size={80} color={theme.colors.primary} />
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Join the community and start your collection journey.</Text>
        </View>

        <View style={styles.form}>
          <FormField label="Username" value={username} onChangeText={setUsername} placeholder="Choose a username" leftIcon="user" autoCapitalize="none" />
          <FormField label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter your email" leftIcon="mail" keyboardType="email-address" textContentType="emailAddress" />
          <FormField label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" leftIcon="lock" secureTextEntry textContentType="newPassword" />

          {error ? <Text style={styles.formError}>{error}</Text> : null}

          <Button label="Sign Up" variant="cta" onPress={handleSignup} loading={submitting} disabled={!username || !email || !password} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <SocialAuthButton provider="google" onPress={handleGoogle} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text style={styles.footerLink}>Log In</Text>
          </Link>
        </View>
      </ScrollView>
      <SuccessDialog
        visible={showSuccess}
        title="Account Created!"
        message="Your account is ready. Log in to start building your collection."
        buttonLabel="Go to Login"
        onConfirm={handleSuccessConfirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, gap: theme.spacing.space3, paddingBottom: theme.spacing.space4 },
  header: { alignItems: 'center', gap: theme.spacing.space1, marginTop: theme.spacing.space2 },
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
  subtitle: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text, textAlign: 'center' },
  form: { gap: theme.spacing.space2 },
  formError: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: '#C0392B', textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space1 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#ddd' },
  dividerText: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: '#999' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.space2 },
  footerText: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm, color: theme.colors.text },
  footerLink: { fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.sm, color: theme.colors.primary },
});