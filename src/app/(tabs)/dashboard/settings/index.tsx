import Button from '@/src/components/atoms/Button';
import Screen from '@/src/components/layout/Screen';
import AccountCard from '@/src/components/molecules/AccountCard';
import ConfirmDialog from '@/src/components/molecules/ConfirmDialog';
import OptionSheet, { OptionRow } from '@/src/components/molecules/OptionSheet';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import SettingsRow from '@/src/components/molecules/SettingsRow';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/hooks/useCurrency';
import { CURRENCIES, ensureFx, setCurrency } from '@/src/lib/currency';
import { getMeta } from '@/src/lib/db';
import { formatAgo, formatBytes } from '@/src/lib/format';
import { imageCache } from '@/src/lib/imageCache';
import { requestLogout } from '@/src/lib/logout';
import { resetOnboarding } from '@/src/lib/onboarding';
import { refreshAll, summarize } from '@/src/lib/refresh';
import { failedCount, pendingCount } from '@/src/lib/sync';
import theme from '@/src/theme/theme';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

export default function Settings() {
  const { session, logout } = useAuth();
  const meta = (session?.user.user_metadata ?? {}) as Record<string, unknown>;
  const username = [meta.username, meta.full_name, meta.name].find((v): v is string => typeof v === 'string' && v.length > 0) ?? null;

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { code } = useCurrency();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currencyName = CURRENCIES.find((c) => c.code === code)?.name ?? code;

  const loadStatus = useCallback(async () => {
    const [last, flag, p, f, c] = await Promise.all([
      getMeta('last_refresh_at'),
      getMeta('update_available'),
      pendingCount(),
      failedCount(),
      imageCache.stats(),
    ]);
    setLastRefresh(last);
    setUpdateAvailable(flag === '1');
    setPending(p);
    setFailed(f);
    setCacheBytes(c?.bytes ?? 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus().catch(() => {});
    }, [loadStatus]),
  );

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    setProgress('Starting…');
    try {
      setResult(summarize(await refreshAll(setProgress)));
    } catch (err) {
      Alert.alert('Refresh failed', (err as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
      loadStatus().catch(() => {});
    }
  };

  const clearImages = async () => {
    setClearing(true);
    try {
      await imageCache.clear();
    } catch (err) {
      Alert.alert('Could not clear images', (err as Error).message);
    } finally {
      setClearing(false);
      setConfirmClear(false);
      loadStatus().catch(() => {});
    }
  };

  const replayHint = async () => {
    await resetOnboarding();
    Alert.alert('Onboarding hint reset', 'It will show again the next time the app opens it.');
  };

  const n = (c: number, w: string) => `${c} ${w}${c === 1 ? '' : 's'}`;
  const refreshSub = busy
    ? progress ?? ''
    : [
        updateAvailable ? 'Update available' : null,
        result ?? (lastRefresh ? `Last updated ${formatAgo(lastRefresh)}` : 'Not refreshed yet'),
        pending > 0 ? `${n(pending, 'change')} waiting to sync` : null,
        failed > 0 ? `${n(failed, 'change')} couldn't sync` : null,
      ]
        .filter(Boolean)
        .join('\n');

  return (
    <Screen>
      <ScreenHeader title="Settings" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AccountCard
          username={username}
          email={session?.user.email ?? null}
          onPress={() => router.push('/(tabs)/dashboard/settings/my-account')}
        />

        <View style={styles.group}>
          <SettingsRow
            icon="dollar-sign"
            label="Currency"
            subtext={`${currencyName} (${code})`}
            onPress={() => setCurrencyOpen(true)}
          />
          <SettingsRow icon="refresh-cw" label="Refresh cached data" subtext={refreshSub} onPress={refresh} busy={busy} showDivider />
          <SettingsRow
            icon="hard-drive"
            label="Clear image cache"
            subtext={cacheBytes === null ? undefined : `${formatBytes(cacheBytes)} on this device`}
            onPress={() => setConfirmClear(true)}
            showDivider
          />
          <SettingsRow icon="help-circle" label="Replay onboarding hint" onPress={replayHint} showDivider />
          <SettingsRow
            icon="info"
            label="About"
            subtext={`Version ${Constants.expoConfig?.version ?? '1.0.0'}\nCard data from TCGdex & Pokéwallet . Pokémon data and artwork from PokeAPI. Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc.`}
            showDivider
          />
        </View>

        <View style={styles.spacer} />

        <Button
          label="Log Out"
          icon="log-out"
          variant="outline"
          onPress={() => requestLogout(logout, () => router.replace('/(auth)/welcome'))}
        />
      </ScrollView>

      <ConfirmDialog
        visible={confirmClear}
        title="Clear image cache?"
        message="Downloaded images are removed from this device. They download again the next time you open the app."
        confirmLabel="Clear"
        loading={clearing}
        onConfirm={clearImages}
        onCancel={() => setConfirmClear(false)}
      />
      <OptionSheet visible={currencyOpen} title="Currency" onClose={() => setCurrencyOpen(false)}>
        {CURRENCIES.map((c) => (
          <OptionRow
            key={c.code}
            label={`${c.name} (${c.code})`}
            selected={c.code === code}
            onPress={() => {
              setCurrency(c.code).catch((err) => Alert.alert('Could not save currency', (err as Error).message));
              ensureFx().catch(() => {});
              setCurrencyOpen(false);
            }}
          />
        ))}
      </OptionSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: theme.spacing.space3, paddingTop: theme.spacing.space2, paddingBottom: 120 },
  group: {
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  spacer: { flex: 1, minHeight: theme.spacing.space3 },
});