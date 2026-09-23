import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// TODO: real search-on-submit (not live inline), Card Sets section grouped
// by `serie` with collapsible groups + favorites sorted first.
export default function Dashboard() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ember</Text>
        <Link href="/(tabs)/dashboard/settings" asChild>
          <Pressable>
            <Ionicons name="settings-outline" size={24} />
          </Pressable>
        </Link>
      </View>

      <Link href="/(tabs)/dashboard/search-results" asChild>
        <Pressable style={styles.searchBar}>
          <Text style={{ color: '#999' }}>Search for a card...</Text>
        </Pressable>
      </Link>

      <View style={styles.navCards}>
        <Link href="/(tabs)/dashboard/my-cards" asChild>
          <Pressable style={styles.navCard}>
            <Text>My Cards</Text>
          </Pressable>
        </Link>
        <Link href="/(tabs)/dashboard/statistics" asChild>
          <Pressable style={styles.navCard}>
            <Text>Statistics</Text>
          </Pressable>
        </Link>
      </View>

      <Text style={styles.placeholder}>Card Sets section (grouped by serie) - TODO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  searchBar: { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: '#f2f2f2' },
  navCards: { flexDirection: 'row', gap: 12, marginTop: 16 },
  navCard: { flex: 1, padding: 20, borderRadius: 12, backgroundColor: '#f2f2f2', alignItems: 'center' },
  placeholder: { marginTop: 24, color: '#999', textAlign: 'center' },
});
