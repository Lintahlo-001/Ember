import { Stack } from 'expo-router';

// Nested stack inside the Dashboard tab so the floating tab bar stays
// visible on My Cards, Statistics, Set Detail, etc. (per screen map).
export default function DashboardStack() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
