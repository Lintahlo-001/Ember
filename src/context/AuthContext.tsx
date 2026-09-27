import { supabase } from '@/src/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  session: Session | null;
  isLoggedIn: boolean;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null; cancelled?: boolean }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithPassword: AuthContextType['signInWithPassword'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithPassword: AuthContextType['signUpWithPassword'] = async (
    email,
    password,
    username
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return { error: error.message };
    await supabase.auth.signOut();
    return { error: null };
  };

  const signInWithGoogle: AuthContextType['signInWithGoogle'] = async () => {
    const redirectTo = makeRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return { error: error.message };

    const result = await WebBrowser.openAuthSessionAsync(data.url ?? '', redirectTo);
    if (result.type !== 'success') return { error: null, cancelled: true };

    const { params, errorCode } = QueryParams.getQueryParams(result.url);
    if (errorCode) return { error: errorCode };

    const { access_token, refresh_token } = params;
    if (!access_token) return { error: 'No access token returned from Google.' };

    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    return { error: sessionError?.message ?? null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoggedIn: !!session,
        loading,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}