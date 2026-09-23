import PlaceholderScreen from '@/src/components/PlaceholderScreen';

// Re-entering the current password is required before the change takes effect.
export default function ChangeEmail() {
  return <PlaceholderScreen name="Change Email" subtitle="new email + current password (required before change)" />;
}
