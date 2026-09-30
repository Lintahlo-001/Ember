import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY — check server/.env');
    }
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const TTL_MS = 60_000;
const MAX_CACHE = 500;
const cache = new Map<string, { user: User; expires: number }>();

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token.length > 4096) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const hit = cache.get(token);
  if (hit && hit.expires > Date.now()) {
    res.locals.user = hit.user;
    next();
    return;
  }

  const { data, error } = await getClient().auth.getUser(token);
  if (error || !data.user) {
    cache.delete(token);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(token, { user: data.user, expires: Date.now() + TTL_MS });
  res.locals.user = data.user;
  next();
}