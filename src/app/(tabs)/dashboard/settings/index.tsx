import Button from '@/src/components/atoms/Button';
import Screen from '@/src/components/layout/Screen';
import AccountCard from '@/src/components/molecules/AccountCard';
import { ActionDialog } from '@/src/components/molecules/ActionDialog';
import ConfirmDialog from '@/src/components/molecules/ConfirmDialog';
import OptionSheet, { OptionRow } from '@/src/components/molecules/OptionSheet';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import SettingsRow from '@/src/components/molecules/SettingsRow';
import { ToggleRow } from '@/src/components/molecules/ToggleRow';
import { useAuth } from '@/src/context/AuthContext';
import { useCurrency } from '@/src/hooks/useCurrency';
import { CURRENCIES, ensureFx, setCurrency } from '@/src/lib/currency';
import { clearOwnedCards, clearWishlist } from '@/src/lib/dataReset';
import { getMeta } from '@/src/lib/db';
import { formatAgo, formatBytes } from '@/src/lib/format';
import { imageCache } from '@/src/lib/imageCache';
import { requestLogout } from '@/src/lib/logout';
import { resetOnboarding } from '@/src/lib/onboarding';
import { setPref, useBadgePrefs, useDimUnownedCards, useDimUnownedPokemon } from '@/src/lib/preferences';
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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const dimCards = useDimUnownedCards();
  const dimPokemon = useDimUnownedPokemon();
  const [clearKind, setClearKind] = useState<'owned' | 'wishlist' | null>(null);
  const [clearBusy, setClearBusy] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

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

  async function doClear() {
    const kind = clearKind;
    if (!kind) return;
    setClearKind(null);
    setClearBusy(true);
    try {
      const n = await (kind === 'owned' ? clearOwnedCards() : clearWishlist());
      setNotice(kind === 'owned'
        ? { title: 'Owned cards cleared', message: `Removed ${n} owned ${n === 1 ? 'entry' : 'entries'}.` }
        : { title: 'Wishlist cleared', message: `Removed ${n} wishlisted ${n === 1 ? 'card' : 'cards'}.` });
    } catch (e) {
      setNotice({ title: "Couldn't clear", message: (e as Error).message });
    } finally {
      setClearBusy(false);
    }
  }

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
          <ToggleRow icon="eye-off" label="Dim cards I don't own" subtext="Card lists show unowned cards faded" value={dimCards} onValueChange={(v) => setPref('dimUnownedCards', v)} />
          <ToggleRow icon="eye-off" label="Dim Pokémon I haven't collected" subtext="Pokédex shows uncollected Pokémon faded" value={dimPokemon} onValueChange={(v) => setPref('dimUnownedPokemon', v)} />
          <ToggleRow icon="plus-circle" label="Quick add on cards" subtext="Show the + on cards you don't own" value={useBadgePrefs('cards').quickAdd} onValueChange={(v) => setPref('cardsQuickAdd', v)} />
          <ToggleRow icon="check-circle" label="Owned badge on cards" subtext="Show a ✓ on cards you own" value={useBadgePrefs('cards').ownedBadge} onValueChange={(v) => setPref('cardsOwnedBadge', v)} />
          <ToggleRow icon="check-circle" label="Owned badge in Pokédex" subtext="Show a ✓ on owned Pokémon" value={useBadgePrefs('pokedex').ownedBadge} onValueChange={(v) => setPref('pokedexOwnedBadge', v)} />
          <SettingsRow icon="refresh-cw" label="Refresh cached data" subtext={refreshSub} onPress={refresh} busy={busy} showDivider />
          <SettingsRow
            icon="hard-drive"
            label="Clear image cache"
            subtext={cacheBytes === null ? undefined : `${formatBytes(cacheBytes)} on this device`}
            onPress={() => setConfirmClear(true)}
            showDivider
          />
          <SettingsRow icon="help-circle" label="Replay onboarding hint" onPress={async () => { await resetOnboarding(); router.back(); }} showDivider/>
          <SettingsRow icon="heart" label="Credits" onPress={() => router.push('/(tabs)/dashboard/settings/credits')} showDivider/>
          <SettingsRow icon="info" label="Version" subtext={Constants.expoConfig?.version ?? '1.0.0'} showDivider/>
        </View>

        <View style={styles.spacer} />
          <SettingsRow icon="trash-2" label="Clear owned cards" subtext={clearBusy ? 'Working…' : 'Remove every card you marked as owned'} onPress={() => !clearBusy && setClearKind('owned')} showDivider/>
          <SettingsRow icon="heart" label="Clear wishlist" subtext={clearBusy ? 'Working…' : 'Remove every wishlisted card'} onPress={() => !clearBusy && setClearKind('wishlist')} showDivider/>
        <View style={styles.group}>

        </View>

        <Button
          label="Log Out"
          icon="log-out"
          variant="outline"
          onPress={() => setConfirmLogout(true)}
        />
      </ScrollView>

      <ActionDialog
        visible={confirmLogout}
        icon="log-out"
        title="Log out of Ember?"
        message="Any unsynced changes will be checked before you're signed out."
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => { setConfirmLogout(false); requestLogout(logout, () => router.replace('/(auth)/welcome')); }}
      />

      <ActionDialog
        visible={!!clearKind}
        icon="trash-2"
        destructive
        title={clearKind === 'owned' ? 'Clear all owned cards?' : 'Clear your wishlist?'}
        message={clearKind === 'owned'
          ? "This permanently removes every owned entry from your account on all your devices. Your wishlist isn't affected. This can't be undone."
          : "This permanently removes every wishlisted card from your account on all your devices. Your owned cards aren't affected. This can't be undone."}
        confirmLabel={clearKind === 'owned' ? 'Clear owned cards' : 'Clear wishlist'}
        cancelLabel="Cancel"
        onCancel={() => setClearKind(null)}
        onConfirm={doClear}
      />
      <ActionDialog visible={!!notice} title={notice?.title ?? ''} message={notice?.message} confirmLabel="OK" onConfirm={() => setNotice(null)} />

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