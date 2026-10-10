import { AccountForm } from '@/src/components/organisms/AccountForm';
import { useAuth } from '@/src/context/AuthContext';
import { changeEmail, validators } from '@/src/lib/account';
import { requestLogout } from '@/src/lib/logout';
import { useRouter } from 'expo-router';

export default function ChangeEmailScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <AccountForm
      title="Change Email"
      fields={[
        { name: 'email', label: 'New email', keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email' },
        { name: 'currentPassword', label: 'Current password', secure: true, autoComplete: 'current-password' },
      ]}
      submitLabel="Change Email"
      successTitle="Email updated"
      successMessage="Your email has been changed."
      validate={(v) => {
        const e: Record<string, string> = {};
        const m = validators.email(v.email ?? ''); if (m) e.email = m;
        if (!v.currentPassword) e.currentPassword = 'Enter your current password.';
        return e;
      }}
      onSubmit={async (v) => {
        const pending = await changeEmail(v.email, v.currentPassword);
        return pending
          ? `We sent a confirmation link to ${v.email}. You'll be logged out now. Confirm the link, then sign in with your new email.`
          : 'Email updated.';
      }}
      onDone={() => requestLogout(logout, () => router.replace('/(auth)/welcome'))}
    />
  );
}