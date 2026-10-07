import { getUpdateFlag, subscribeUpdateFlag } from '@/src/lib/updateFlag';
import { useEffect, useState } from 'react';

export function useUpdateAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    getUpdateFlag().then((v) => alive && setAvailable(v)).catch(() => {});
    const unsubscribe = subscribeUpdateFlag(setAvailable);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  return available;
}