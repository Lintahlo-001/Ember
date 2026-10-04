import { imageCache, type ImageKind } from '@/src/lib/imageCache';
import { useEffect, useMemo, useState } from 'react';

export function useCachedImage(url: string | null, kind: ImageKind, cacheOnView = false) {
  const [localFailed, setLocalFailed] = useState<string | null>(null);
  const [remoteFailed, setRemoteFailed] = useState<string | null>(null);

  const local = useMemo(() => (url ? imageCache.localUri(url) : null), [url]);

  useEffect(() => {
    if (url && !local && cacheOnView) imageCache.cacheOnView(url, kind);
  }, [url, local, kind, cacheOnView]);

  const useLocal = !!local && localFailed !== url;
  const uri = !url || remoteFailed === url ? null : useLocal ? local : url;

  const onError = () => {
    if (!url) return;
    if (useLocal) {
      imageCache.invalidate(url).catch(() => {});
      setLocalFailed(url);
    } else {
      setRemoteFailed(url);
    }
  };

  return { uri, onError };
}