import ProgressBar from '@/src/components/atoms/ProgressBar';
import { percentOf, progressCaption, progressOf, type Progress } from '@/src/lib/stats';
import theme from '@/src/theme/theme';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  progress: Progress;
  leading?: ReactNode;
  trailing?: ReactNode;
  prominent?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
};

export default function ProgressRow({
  title,
  progress,
  leading,
  trailing,
  prominent,
  onPress,
  accessibilityHint,
}: Props) {
  const label = `${title}, ${progress.owned} of ${progress.total} owned, ${percentOf(progress)} percent complete`;

  const body = (
    <>
      <View style={styles.top}>
        {leading}
        <View style={styles.titleWrap}>
          <Text style={[styles.title, prominent && styles.prominent]} numberOfLines={1}>
            {title}
          </Text>
          {trailing}
        </View>
        <Text style={styles.caption} numberOfLines={1}>
          {progressCaption(progress)}
        </Text>
      </View>
      <ProgressBar value={progressOf(progress)} label={`${title} progress`} />
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.card} accessible accessibilityLabel={label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.space1,
    minHeight: theme.a11y.touchTargetMin,
    justifyContent: 'center',
    padding: theme.spacing.space1,
    paddingHorizontal: theme.spacing.space2,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space1 },
  titleWrap: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.space1 },
  title: { flexShrink: 1, fontFamily: theme.fonts.bodyMedium, fontSize: theme.fontSizes.base, color: theme.colors.text },
  prominent: { fontFamily: theme.fonts.header, fontSize: theme.fontSizes.base },
  caption: {
    flex: 1,
    textAlign: 'right',
    fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text,
  },
});