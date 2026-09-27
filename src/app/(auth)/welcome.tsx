import Button from '@/src/components/atoms/Button';
import FireSparks from '@/src/components/atoms/icons/FireSparks';
import PokeballIcon from '@/src/components/atoms/icons/PokeballIcon';
import WaveFooter from '@/src/components/atoms/icons/WaveFooter';
import theme from '@/src/theme/theme';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

const RING_SIZE = 320;
const POKEBALL_SIZE = 180;

export default function Welcome() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.ballWrapper}>
          <FireSparks size={RING_SIZE} />
          <View style={styles.pokeballCenter}>
            <PokeballIcon size={POKEBALL_SIZE} color={theme.colors.primary} />
          </View>
        </View>

        <View style={styles.textGroup}>
          <Text style={styles.appName}>Ember</Text>
          <Text style={styles.title}>Collect. Track. Complete.</Text>
          <Text style={styles.subtitle}>Your Pokémon card collection, all in one place.</Text>
        </View>

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
  ballWrapper: { width: RING_SIZE, height: RING_SIZE, marginBottom: theme.spacing.space3 },
  pokeballCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center',
  },
  textGroup: {
    alignItems: 'center'
  },
  appName: {
    fontFamily: theme.fonts.header,
    fontSize: theme.fontSizes.mainHeader,
    lineHeight: theme.fontSizes.mainHeader,
    color: theme.colors.text,
    textAlign: 'center',
  },
  title: {
    fontFamily: theme.fonts.header,
    fontSize: theme.fontSizes.xl,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: -4, 
  },
  subtitle: { fontFamily: theme.fonts.body, fontSize: theme.fontSizes.base, color: theme.colors.text, textAlign: 'center' },
  buttons: { width: '100%', gap: theme.spacing.space1, marginTop: theme.spacing.space2, marginBottom: theme.spacing.space4 },
});