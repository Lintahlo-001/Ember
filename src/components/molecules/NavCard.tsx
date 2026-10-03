import theme from '@/src/theme/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
};

export default function NavCard({ icon, label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.card}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      <View
        style={styles.icon}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <MaterialCommunityIcons
          name={icon}
          size={68}
          color={theme.colors.text}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 96,
    justifyContent: 'space-between',
    padding: theme.spacing.space1,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    position: 'relative',
  },

  label: {
    alignSelf: 'flex-end',
    textAlign: 'right',
    fontFamily: theme.fonts.bodyMedium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
  },

  icon: {
    position: 'absolute',
    left: 2,
    bottom: -1,
  },
});
