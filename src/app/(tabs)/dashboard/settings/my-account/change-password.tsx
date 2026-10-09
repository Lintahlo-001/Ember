import { AccountForm, type FormFieldDef } from '@/src/components/organisms/AccountForm';
import { changePassword, setPassword, useAccountInfo, validators } from '@/src/lib/account';
import { useRouter } from 'expo-router';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { loading, hasPassword } = useAccountInfo();
  if (loading) return null;

  const fields: FormFieldDef[] = [
    ...(hasPassword ? [{ name: 'currentPassword', label: 'Current password', secure: true, autoComplete: 'current-password' as const }] : []),
    { name: 'password', label: 'New password', secure: true, autoComplete: 'new-password' },
    { name: 'confirm', label: 'Confirm new password', secure: true, autoComplete: 'new-password' },
  ];

  return (
    <AccountForm
      key={hasPassword ? 'change' : 'set'}
      title={hasPassword ? 'Change Password' : 'Set Password'}
      intro={hasPassword ? undefined : 'You signed in with Google. Set a password to also log in with your email and password.'}
      fields={fields}
      submitLabel={hasPassword ? 'Change Password' : 'Set Password'}
      successTitle={hasPassword ? 'Password changed' : 'Password set'}
      successMessage={hasPassword ? 'Your password has been changed.' : 'You can now log in with your email and password.'}
      validate={(v) => {
        const e: Record<string, string> = {};
        if (hasPassword && !v.currentPassword) e.currentPassword = 'Enter your current password.';
        const m = validators.password(v.password ?? ''); if (m) e.password = m;
        else if (v.password !== v.confirm) e.confirm = "Passwords don't match.";
        return e;
      }}
      onSubmit={(v) => (hasPassword ? changePassword(v.currentPassword, v.password) : setPassword(v.password))}
      onDone={() => router.back()}
    />
  );
}