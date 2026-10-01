import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
      >
        <Icon name="chevron-left" size={28} color={theme.colors.text} />
      </Pressable>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
  },
  title: { flex: 1, fontFamily: theme.fonts.header, fontSize: theme.fontSizes.xl, color: theme.colors.text },
});