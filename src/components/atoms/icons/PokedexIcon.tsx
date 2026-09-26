import Svg, { Circle, Line } from 'react-native-svg';

type Props = {
  size?: number;
  color: string;
};

export default function PokedexIcon({ size = 24, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer ball */}
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      {/* Horizontal divider */}
      <Line x1="3" y1="12" x2="9.5" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="14.5" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Center button */}
      <Circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth={2} />
    </Svg>
  );
}
