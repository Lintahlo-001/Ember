import Icon from '@/src/components/atoms/Icon';
import theme from '@/src/theme/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  username: string | null;
  email: string | null;
  onPress?: () => void;
};

export default function AccountCard({ username, email, onPress }: Props) {
  const detail = [username, email].filter(Boolean).join(', ');

  const content = (
    <>
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <MaterialCommunityIcons
          name="account-circle-outline"
          size={56}
          color={theme.colors.text}
        />
      </View>

      <View style={styles.text}>
        <Text style={styles.title}>My Account</Text>
        {username ? (
          <Text style={styles.small} numberOfLines={1}>
            {username}
          </Text>
        ) : null}
        {email ? (
          <Text style={styles.small} numberOfLines={1}>
            {email}
          </Text>
        ) : null}
      </View>

      {onPress ? (
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Icon name="chevron-right" size={24} color={theme.colors.text} />
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `My Account. ${detail}` : 'My Account'}
      onPress={onPress}
      style={styles.card}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.space2,
    minHeight: 96,
    padding: theme.spacing.space2,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: '#E2DCCB',
  },
  text: { flex: 1 },
  title: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: theme.fontSizes.base,
    color: theme.colors.text,
  },
  small: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
  },
});