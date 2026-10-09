import { AccountForm } from '@/src/components/organisms/AccountForm';
import { changeUsername, validators } from '@/src/lib/account';
import { useRouter } from 'expo-router';

export default function ChangeUsernameScreen() {
  const router = useRouter();

  return (
    <AccountForm
      title="Change Username"
      fields={[
        {
          name: 'username',
          label: 'New username',
          autoCapitalize: 'none',
        },
      ]}
      submitLabel="Change Username"
      successTitle="Username updated"
      successMessage="Your username has been changed."
      validate={(v): Record<string, string> => {
        const e = validators.username(v.username ?? '');
        return e ? { username: e } : {};
      }}
      onSubmit={(v) => changeUsername(v.username)}
      onDone={() => router.back()}
    />
  );
}