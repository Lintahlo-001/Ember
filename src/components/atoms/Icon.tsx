import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type Props = {
  name: ComponentProps<typeof Feather>['name'];
  size?: number;
  color: string;
};

export default function Icon({ name, size = 20, color }: Props) {
  return <Feather name={name} size={size} color={color} />;
}