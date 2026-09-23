import { View, Text, StyleSheet } from 'react-native';

type Props = {
  name: string;
  subtitle?: string;
};

// Temporary stand-in for every unbuilt screen. Swap out screen-by-screen
// as each one gets built for real (see project build sequence groups 2-12).
export default function PlaceholderScreen({ name, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { marginTop: 8, fontSize: 14, color: '#666', textAlign: 'center' },
});
