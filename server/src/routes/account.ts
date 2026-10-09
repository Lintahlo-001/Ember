import { createClient } from '@supabase/supabase-js';
import { Router } from 'express';
import { pool } from '../db.js';

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { 
  auth: { persistSession: false, autoRefreshToken: false },
});

export const accountRouter = Router();

accountRouter.delete('/account', async (_req, res) => {
  const userId = res.locals.userId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await pool.query('select public.purge_user_data($1)', [userId]);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return res.status(204).end();
  } catch (e) {
    console.error('[account] delete failed', e);
    return res.status(500).json({ error: 'Could not delete account' });
  }
});