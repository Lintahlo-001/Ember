import { AccountForm, type FormFieldDef } from '@/src/components/organisms/AccountForm';
import { deleteAccount, finishAccountDeletion, useAccountInfo } from '@/src/lib/account';
import { useRouter } from 'expo-router';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { loading, hasPassword } = useAccountInfo();
  if (loading) return null;

  const fields: FormFieldDef[] = [
    ...(hasPassword ? [{ name: 'currentPassword', label: 'Current password', secure: true, autoComplete: 'current-password' as const }] : []),
    { name: 'confirm', label: 'Type delete to confirm', autoCapitalize: 'none' },
  ];

  return (
    <AccountForm
      title="Delete Account"
      intro="This permanently deletes your Ember account and everything in it: owned cards, wishlist and favorites, on all your devices. This can't be undone."
      fields={fields}
      submitLabel="Delete my account"
      successTitle="Account deleted"
      successMessage="Your account and data have been removed."
      validate={(v) => {
        const e: Record<string, string> = {};
        if (hasPassword && !v.currentPassword) e.currentPassword = 'Enter your current password.';
        if ((v.confirm ?? '').trim().toLowerCase() !== 'delete') e.confirm = 'Type delete to continue.';
        return e;
      }}
      onSubmit={(v) => deleteAccount(hasPassword ? v.currentPassword : undefined)}
      onDone={async () => { await finishAccountDeletion(); router.replace('/(auth)/welcome'); }}
    />
  );
}