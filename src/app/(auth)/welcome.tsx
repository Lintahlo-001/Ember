import Button from '@/src/components/atoms/Button';
import FireSparks from '@/src/components/atoms/icons/FireSparks';
import PokeballIcon from '@/src/components/atoms/icons/PokeballIcon';
import WaveFooter from '@/src/components/atoms/icons/WaveFooter';
import theme from '@/src/theme/theme';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function Welcome() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.ballWrapper}>
          <FireSparks size={260} />
          <View style={styles.pokeballCenter}>
            <PokeballIcon size={130} color={theme.colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>Collect. Track. Complete.</Text>
        <Text style={styles.subtitle}>Your Pokémon card collection, all in one place.</Text>

        <View style={styles.buttons}>
          <Button label="Log In" variant="cta" onPress={() => router.push('/(auth)/login')} />
          <Button label="Sign Up" variant="outline" onPress={() => router.push('/(auth)/signup')} />
        </View>
      </View>

      <WaveFooter height={120} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.space3,
    gap: theme.spacing.space2,
  },
  ballWrapper: { width: 260, height: 260, marginBottom: theme.spacing.space2 },
  pokeballCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center',},
  title: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text, textAlign: 'center' },
  subtitle: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text, textAlign: 'center', marginBottom: theme.spacing.space2 },
  buttons: { width: '100%', gap: theme.spacing.space1, marginTop: theme.spacing.space2 },
});