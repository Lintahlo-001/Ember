CREATE TABLE IF NOT EXISTS public.favorite_sets (
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  set_id     text NOT NULL CHECK (set_id ~ '^[A-Za-z0-9._-]{1,40}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, set_id)
);

ALTER TABLE public.favorite_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own select" ON public.favorite_sets;
DROP POLICY IF EXISTS "own insert" ON public.favorite_sets;
DROP POLICY IF EXISTS "own delete" ON public.favorite_sets;

CREATE POLICY "own select" ON public.favorite_sets FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "own insert" ON public.favorite_sets FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "own delete" ON public.favorite_sets FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.favorite_sets FROM anon;
GRANT SELECT, INSERT, DELETE ON public.favorite_sets TO authenticated;