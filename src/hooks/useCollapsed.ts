import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'ember.collapsed.v1';

export function useCollapsed(scope: string) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setCollapsed(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const isCollapsed = useCallback((id: string) => !!collapsed[`${scope}:${id}`], [collapsed, scope]);

  const toggle = useCallback(
    (id: string) => {
      const k = `${scope}:${id}`;
      const next = !collapsed[k];
      setCollapsed((prev) => ({ ...prev, [k]: next }));
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          const stored = raw ? JSON.parse(raw) : {};
          if (next) stored[k] = true;
          else delete stored[k];
          return AsyncStorage.setItem(KEY, JSON.stringify(stored));
        })
        .catch(() => {});
    },
    [collapsed, scope],
  );

  return { collapsed, isCollapsed, toggle };
}