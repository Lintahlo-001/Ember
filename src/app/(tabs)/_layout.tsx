import NavBar from '@/src/components/organisms/NavBar';
import { Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export default function TabsLayout() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/dashboard') {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        BackHandler.exitApp();
        return true;
      }
    );

    return () => subscription.remove();
  }, [pathname]);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <NavBar {...props} />}
    >
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarAccessibilityLabel: 'Wishlist tab',
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />

      <Tabs.Screen
        name="pokedex"
        options={{
          title: 'Pokédex',
          tabBarAccessibilityLabel: 'Pokédex tab',
        }}
      />
    </Tabs>
  );
}
