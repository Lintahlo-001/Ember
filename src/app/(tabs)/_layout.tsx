import NavBar from '@/src/components/organisms/NavBar';
import { Tabs } from 'expo-router';

// Tab Order: Wishlist (left) - Dashboard (middle) - Pokedex (right).
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <NavBar {...props} />}
    >
      <Tabs.Screen
        name="wishlist"
        options={{ title: 'Wishlist', tabBarAccessibilityLabel: 'Wishlist tab' }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Home', tabBarAccessibilityLabel: 'Home tab' }}
      />
      <Tabs.Screen
        name="pokedex"
        options={{ title: 'Pokédex', tabBarAccessibilityLabel: 'Pokédex tab' }}
      />
    </Tabs>
  );
}