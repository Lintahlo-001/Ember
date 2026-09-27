import Svg, { Circle, Line, Path } from 'react-native-svg';

export default function PokeballIcon({ size = 120, color }: { size?: number; color: string }) {
  const r = 40, cx = 50, cy = 50;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill={color} />
      <Circle cx={cx} cy={cy} r={r} stroke="#201C1C" strokeWidth={4} fill="none" />
      <Line x1={cx - r} y1={cy} x2={cx - 12} y2={cy} stroke="#201C1C" strokeWidth={4} />
      <Line x1={cx + 12} y1={cy} x2={cx + r} y2={cy} stroke="#201C1C" strokeWidth={4} />
      <Circle cx={cx} cy={cy} r={10} fill="#F6F2E9" stroke="#201C1C" strokeWidth={4} />
    </Svg>
  );
}