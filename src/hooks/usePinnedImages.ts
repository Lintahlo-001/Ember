import { runPinning } from '@/src/lib/pinning';
import { useEffect, useMemo } from 'react';

export function usePinnedImages(owned: Map<string, number>, ready: boolean) {
  const key = useMemo(() => [...owned.keys()].sort().join(','), [owned]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(async () => {
      try {
        const { images } = await runPinning();
        if (images.downloaded || images.failed) console.log('Image cache:', JSON.stringify(images, null, 2));
      } catch (err) {
        console.warn('Image pinning skipped:', (err as Error).message);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [key, ready]);
}