import NavBar from '@/src/components/organisms/NavBar';
import { router, Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export default function TabsLayout() {
  const pathname = usePathname();

  useEffect(() => {
    const atDashboard = pathname === '/dashboard';
    const atOtherRoot = pathname === '/wishlist' || pathname === '/pokedex';
    if (!atDashboard && !atOtherRoot) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (atDashboard) BackHandler.exitApp();
      else router.navigate('/(tabs)/dashboard');
      return true;
    });
    return () => subscription.remove();
  }, [pathname]);

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <NavBar {...props} />}>
      <Tabs.Screen name="wishlist" options={{ title: 'Wishlist', tabBarAccessibilityLabel: 'Wishlist tab' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home tab' }} />
      <Tabs.Screen name="pokedex" options={{ title: 'Pokédex', tabBarAccessibilityLabel: 'Pokédex tab' }} />
    </Tabs>
  );
}