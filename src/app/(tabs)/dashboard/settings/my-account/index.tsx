import Screen from '@/src/components/layout/Screen';
import AccountCard from '@/src/components/molecules/AccountCard';
import { ActionDialog } from '@/src/components/molecules/ActionDialog';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import SettingsRow from '@/src/components/molecules/SettingsRow';
import { linkGoogle, unlinkGoogle, useAccountInfo } from '@/src/lib/account';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

type Dlg = { title: string; message: string; confirm?: () => void } | null;

export default function MyAccountScreen() {
  const router = useRouter();
  const a = useAccountInfo();
  const [busy, setBusy] = useState(false);
  const [dlg, setDlg] = useState<Dlg>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); await a.refresh(); }
    catch (e) {
      const err = e as { code?: string; message?: string };
      setDlg(
        err.code === 'identity_already_exists'
          ? {
              title: 'Google account already registered',
              message: 'That Google account is already registered with another Ember account. Log in with it directly, or link a different Google account.',
            }
          : { title: 'Something went wrong', message: err.message ?? 'Please try again.' },
      );
    }
    finally { setBusy(false); }
  }

  function onGooglePress() {
    if (busy) return;
    if (!a.google) return void run(linkGoogle);
    if (!a.canUnlinkGoogle) {
      return setDlg({ title: "Can't unlink Google", message: 'Google is the only way you sign in to this account. Create a password sign-in first, or keep Google linked.' });
    }
    setDlg({
      title: 'Unlink Google?',
      message: 'You will sign in with your email and password instead. You can link Google again any time.',
      confirm: () => run(unlinkGoogle),
    });
  }

  const googleEmail = (a.google?.identity_data?.email as string | undefined) ?? '';

  return (
    <Screen>
      <ScreenHeader title="My Account" />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, gap: 16 }}>
        <AccountCard username={a.username} email={a.email} />
        <View style={{ gap: 8 }}>
          <SettingsRow icon="user" label="Change Username" onPress={() => router.push('/(tabs)/dashboard/settings/my-account/change-username')} />
          <SettingsRow icon="mail" label="Change Email" onPress={() => router.push('/(tabs)/dashboard/settings/my-account/change-email')} />
          <SettingsRow
            icon="lock"
            label={a.hasPassword ? 'Change Password' : 'Set Password'}
            subtext={a.hasPassword ? undefined : 'Add a password so you can also log in with your email'}
            onPress={() => router.push('/(tabs)/dashboard/settings/my-account/change-password')}
          />
          <SettingsRow
            icon="link"
            label="Google account"
            subtext={a.google ? `Linked${googleEmail ? ` · ${googleEmail}` : ''} — tap to unlink` : 'Not linked — tap to link'}
            onPress={onGooglePress}
          />
          <SettingsRow 
            icon="trash-2" label="Delete Account" subtext="Permanently remove your account and all data" 
            onPress={() => router.push('/(tabs)/dashboard/settings/my-account/delete-account')} 
          />
        </View>
      </ScrollView>
      <ActionDialog
        visible={!!dlg}
        icon="info"
        title={dlg?.title ?? ''}
        message={dlg?.message}
        confirmLabel={dlg?.confirm ? 'Unlink' : 'OK'}
        cancelLabel={dlg?.confirm ? 'Cancel' : undefined}
        destructive={!!dlg?.confirm}
        onConfirm={() => { const c = dlg?.confirm; setDlg(null); c?.(); }}
        onCancel={() => setDlg(null)}
      />
    </Screen>
  );
}