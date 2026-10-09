import { AccountForm } from '@/src/components/organisms/AccountForm';
import { sendPasswordReset, validators } from '@/src/lib/account';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <AccountForm
      title="Forgot Password"
      intro="Enter the email you signed up with and we'll send you a link to set a new password."
      fields={[
        {
          name: 'email',
          label: 'Email',
          keyboardType: 'email-address',
          autoCapitalize: 'none',
          autoComplete: 'email',
        },
      ]}
      submitLabel="Send reset link"
      successTitle="Check your inbox"
      successMessage="If an account exists for that email, a reset link is on its way. It expires in 1 hour."
      validate={(v): Record<string, string> => {
        const e = validators.email(v.email ?? '');
        return e ? { email: e } : {};
      }}
      onSubmit={(v) => sendPasswordReset(v.email)}
      onDone={() => router.back()}
    />
  );
}