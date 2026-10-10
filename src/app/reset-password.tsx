import Button from '@/src/components/atoms/Button';
import Screen from '@/src/components/layout/Screen';
import { AccountForm } from '@/src/components/organisms/AccountForm';
import { completeAuthFromUrl, setPassword, validators } from '@/src/lib/account';
import { clearRecoveryUrl, getRecoveryUrl, subscribeRecovery } from '@/src/lib/recoveryLink';
import { theme } from '@/src/theme/theme';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

type State = 'waiting' | 'ready' | 'invalid';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>('waiting');
  const [reason, setReason] = useState<string | null>(null);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    const handle = async (url: string | null) => {
      if (!url || handled.current === url) return;
      handled.current = url;
      try {
        await completeAuthFromUrl(url);
        clearRecoveryUrl();
        if (alive) setState('ready');
      } catch (e) {
        console.warn('Reset link failed:', url.split(/[?#]/)[0], (e as Error).message);
        if (alive) { setReason((e as Error).message); setState('invalid'); }
      }
    };
    handle(getRecoveryUrl());
    const unsub = subscribeRecovery(handle);
    const t = setTimeout(() => alive && setState((s) => (s === 'waiting' ? 'invalid' : s)), 12000);
    return () => { alive = false; unsub(); clearTimeout(t); };
  }, []);

  if (state === 'waiting') {
    return <Screen><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.colors.primary} /></View></Screen>;
  }
  if (state === 'invalid') {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
          <Text style={{ fontFamily: 'Anton-Regular', fontSize: 26, color: theme.colors.text }}>Link expired</Text>
          <Text style={{ fontFamily: 'WorkSans-Regular', fontSize: 15, lineHeight: 22, color: theme.colors.text }}>
            This reset link is invalid or has already been used. Request a new one and open it on this device.
          </Text>
          {reason ? <Text style={{ fontFamily: 'WorkSans-Regular', fontSize: 12, color: theme.colors.text }}>{reason}</Text> : null}
          <Button
            label="Request a new link"
            onPress={() => router.replace('/(auth)/forgot-password')}
            />
        </View>
      </Screen>
    );
  }
  return (
    <AccountForm
      title="Set New Password"
      fields={[
        { name: 'password', label: 'New password', secure: true, autoComplete: 'new-password' },
        { name: 'confirm', label: 'Confirm new password', secure: true, autoComplete: 'new-password' },
      ]}
      submitLabel="Save password"
      successTitle="Password updated"
      successMessage="You're all set. Taking you to your collection."
      validate={(v): Record<string, string> => {
        const m = validators.password(v.password ?? '');
        if (m) {
            return { password: m };
        }
        if (v.password !== v.confirm) {
            return { confirm: "Passwords don't match." };
        }
        return {};
        }}
      onSubmit={(v) => setPassword(v.password)}
      onDone={() => router.replace('/(tabs)/dashboard')}
    />
  );
}