import type { User, UserIdentity } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { wipeUserData } from '../lib/userScope';

export class AccountError extends Error {
  constructor(message: string, public field?: string, public code?: string) { super(message); }
}

export const validators = {
  username: (v: string) => (/^[A-Za-z0-9_.]{3,20}$/.test(v.trim()) ? null : '3–20 characters: letters, numbers, _ or .'),
  email: (v: string) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : 'Enter a valid email address.'),
  password: (v: string) => (v.length >= 8 ? null : 'Use at least 8 characters.'),
};

function toError(e: unknown, field?: string): AccountError {
  const err = e as { code?: string; status?: number; message?: string };
  switch (err?.code) {
    case 'invalid_credentials': return new AccountError('Incorrect password.', 'currentPassword');
    case 'same_password': return new AccountError('Your new password must be different from the current one.', 'password');
    case 'weak_password': return new AccountError('That password is too weak. Try a longer one.', 'password');
    case 'email_exists': return new AccountError('That email is already in use.', 'email');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit': return new AccountError('Too many attempts. Please wait a minute and try again.');
  }
  if (err?.status === 0 || /network|fetch/i.test(err?.message ?? '')) {
    return new AccountError("Can't reach the server. Check your connection and try again.");
  }
  return new AccountError(err?.message ?? 'Something went wrong.', field);
}

export async function reauth(password: string) {
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) throw new AccountError('No account email found. Please log in again.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw toError(error, 'currentPassword');
}

export async function changeUsername(username: string) {
  const { error } = await supabase.auth.updateUser({ data: { username: username.trim() } });
  if (error) throw toError(error, 'username');
}

export async function changeEmail(newEmail: string, currentPassword: string): Promise<boolean> {
  await reauth(currentPassword);
  const { data, error } = await supabase.auth.updateUser(
    { email: newEmail.trim() },
    { emailRedirectTo: makeRedirectUri({ scheme: 'ember', path: 'login' }) },
  );
  if (error) throw toError(error, 'email');
  return !!data.user?.new_email;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await reauth(currentPassword);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw toError(error, 'password');
}

export async function setPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword, data: { has_password: true } });
  if (error) throw toError(error, 'password');
}

export async function sendPasswordReset(email: string) {
  const redirectTo = makeRedirectUri({ scheme: 'ember', path: 'reset-password' });
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw toError(error, 'email');
}

function parseParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  for (const part of [query, hash]) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const [k, v = ''] = pair.split('=');
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    }
  }
  return out;
}

export async function completeAuthFromUrl(url: string) {
  const p = parseParams(url);
  if (p.error_description || p.error) {
  if (p.error_code === 'identity_already_exists' || /already linked/i.test(p.error_description ?? '')) {
    throw new AccountError('That Google account is already registered.', undefined, 'identity_already_exists');
  }
    throw new AccountError(p.error_description ?? p.error);
  }
  if (p.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(p.code);
    if (error) throw error;
  } else if (p.access_token && p.refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
    if (error) throw error;
  } else if (p.token_hash && p.type === 'recovery') {
  const { error } = await supabase.auth.verifyOtp({ token_hash: p.token_hash, type: 'recovery' });
  if (error) throw error;
  } else {
    throw new AccountError('This link is invalid or has expired.');
  }
}

export async function linkGoogle() {
  const redirectTo = makeRedirectUri({ scheme: 'ember', path: 'link-callback' });
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) throw toError(error ?? new Error('Could not start Google linking.'));
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false; // user cancelled
  try { await completeAuthFromUrl(result.url); }
  catch (e) { throw e instanceof AccountError ? e : toError(e); }
  return true;
}

export async function unlinkGoogle() {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) throw toError(error);
  const identities = data.identities ?? [];
  const google = identities.find((i) => i.provider === 'google');
  if (!google) return;
  if (identities.length < 2) throw new AccountError("Google is your only sign-in method, so it can't be unlinked.");
  const { error: e2 } = await supabase.auth.unlinkIdentity(google);
  if (e2) throw toError(e2);
  await supabase.auth.refreshSession();
}

export type AccountInfo = {
  loading: boolean;
  username: string;
  email: string;
  hasPassword: boolean;
  canChangeEmail: boolean;
  google: UserIdentity | null;
  canUnlinkGoogle: boolean;
  refresh: () => Promise<void>;
};

export function useAccountInfo(): AccountInfo {
  const [user, setUser] = useState<User | null>(null);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    setUser(s.session?.user ?? null);
    setIdentities(s.session?.user?.identities ?? []);
    setLoading(false);
    try { 
      const { data } = await supabase.auth.getUserIdentities();
      if (data?.identities) setIdentities(data.identities);
    } catch { }
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { refresh(); });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const email = user?.email ?? '';
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const hasEmailIdentity = identities.some((i) => i.provider === 'email');
  const google = identities.find((i) => i.provider === 'google') ?? null;
  return {
    loading,
    username: (meta.username as string) || (meta.full_name as string) || email.split('@')[0] || '',
    email,
    hasPassword: hasEmailIdentity || meta.has_password === true,
    canChangeEmail: hasEmailIdentity, 
    google,
    canUnlinkGoogle: identities.length >= 2,
    refresh,
  };
}

const API_URL = process.env.EXPO_PUBLIC_API_URL

export async function deleteAccount(currentPassword?: string) {
  if (currentPassword !== undefined) await reauth(currentPassword);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AccountError('Please log in again.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch(`${API_URL}/account`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
    if (res.status === 401) throw new AccountError('Please log in again.');
    if (!res.ok) throw new AccountError('Could not delete your account. Please try again.');
  } catch (e) {
    if (e instanceof AccountError) throw e;
    throw new AccountError("Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

export async function finishAccountDeletion() {
  await wipeUserData();
  await supabase.auth.signOut({ scope: 'local' });
}