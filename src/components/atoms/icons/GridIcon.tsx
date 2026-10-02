import Svg, { Rect } from 'react-native-svg';

type Props = { columns: number; size?: number; color: string };

export default function GridIcon({ columns, size = 24, color }: Props) {
  const n = Math.min(5, Math.max(3, columns));
  const gap = 2;
  const w = (20 - gap * (n - 1)) / n;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {[3, 13].flatMap((y) =>
        Array.from({ length: n }, (_, i) => (
          <Rect key={`${y}-${i}`} x={2 + i * (w + gap)} y={y} width={w} height={8} rx={1} fill={color} />
        )),
      )}
    </Svg>
  );
}