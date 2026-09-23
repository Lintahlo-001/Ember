import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Order here = tab bar order: Wishlist (left) - Dashboard (middle) - Pokedex (right).
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#E4574C' }}>
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pokedex"
        options={{
          title: 'Pokédex',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
