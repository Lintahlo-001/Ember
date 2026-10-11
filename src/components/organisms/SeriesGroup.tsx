import CollapsibleHeader from '@/src/components/molecules/CollapsibleHeader';
import theme from '@/src/theme/theme';
import { useState, type ReactNode } from 'react';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

type Props = {
  name: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
};

const LAYOUT = LinearTransition.duration(250);
const ENTER = FadeIn.duration(200);
const EXIT = FadeOut.duration(120);

export default function SeriesGroup({ name, collapsed, onToggle, children }: Props) {
  const [animate, setAnimate] = useState(false);

  const handleToggle = () => {
    setAnimate(true);
    onToggle();
  };

  return (
    <Animated.View layout={LAYOUT} style={styles.box}>
      <CollapsibleHeader tone="series" title={name} collapsed={collapsed} onToggle={handleToggle} />
      {collapsed ? null : (
        <Animated.View entering={animate ? ENTER : undefined} exiting={EXIT} style={styles.body}>
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}

export const SERIES_BODY_PADDING = theme.spacing.space1;

const styles = {
  box: {
    borderRadius: 12,
    overflow: 'hidden' as const,
    backgroundColor: theme.colors.accent,
    marginBottom: theme.spacing.space3,
  },
  body: { paddingHorizontal: SERIES_BODY_PADDING, paddingBottom: theme.spacing.space2 },
};