import { createClient } from '@supabase/supabase-js';
import { Router } from 'express';
import { pool } from '../db.js';

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { 
  auth: { persistSession: false, autoRefreshToken: false },
});

export const accountRouter = Router();

accountRouter.delete('/account', async (_req, res) => {
  const userId = (res.locals.user as { id?: string } | undefined)?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await pool.query('select public.purge_user_data($1)', [userId]);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return res.status(204).end();
  } catch (e) {
    console.error('[account] delete failed', e);
    return res.status(500).json({ error: 'Could not delete account', detail: (e as { message?: string })?.message ?? String(e) });
  }
});

accountRouter.post('/account/email-login', async (_req, res) => {
  const userId = (res.locals.user as { id?: string } | undefined)?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const { rows } = await client.query(
      `select email, email_confirmed_at is not null as confirmed,
              coalesce(encrypted_password, '') <> '' as has_password
         from auth.users where id = $1 for update`,
      [userId],
    );
    const u = rows[0] as { email: string | null; confirmed: boolean; has_password: boolean } | undefined;
    if (!u) { await client.query('rollback'); return res.status(404).json({ error: 'User not found' }); }
    if (!u.has_password) { await client.query('rollback'); return res.status(409).json({ error: 'no_password' }); }
    if (!u.email || !u.confirmed) { await client.query('rollback'); return res.status(409).json({ error: 'email_unconfirmed' }); }

    const existing = await client.query(
      `select 1 from auth.identities where user_id = $1 and provider = 'email'`,
      [userId],
    );
    if (existing.rowCount === 0) {
      await client.query(
        `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
         values ($1, $1, jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true, 'phone_verified', false),
                 'email', now(), now(), now())`,
        [userId, u.email],
      );
      await client.query(
        `update auth.users
            set raw_app_meta_data = jsonb_set(
                  coalesce(raw_app_meta_data, '{}'::jsonb), '{providers}',
                  (select coalesce(jsonb_agg(distinct p), '[]'::jsonb)
                     from jsonb_array_elements_text(coalesce(raw_app_meta_data->'providers', '[]'::jsonb) || '["email"]'::jsonb) p))
          where id = $1`,
        [userId],
      );
    }
    await client.query('commit');
    return res.status(204).end();
  } catch (e) {
    await client.query('rollback').catch(() => {});
    console.error('[account] email-login failed', e);
    return res.status(500).json({ error: 'Could not enable email sign-in', detail: (e as { message?: string })?.message ?? String(e) });
  } finally {
    client.release();
  }
});