CREATE TABLE IF NOT EXISTS public.wishlist_entries (
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id    text NOT NULL CHECK (card_id ~ '^[A-Za-z0-9._-]{1,40}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);

ALTER TABLE public.wishlist_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own select" ON public.wishlist_entries;
DROP POLICY IF EXISTS "own insert" ON public.wishlist_entries;
DROP POLICY IF EXISTS "own delete" ON public.wishlist_entries;

CREATE POLICY "own select" ON public.wishlist_entries FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "own insert" ON public.wishlist_entries FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "own delete" ON public.wishlist_entries FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.wishlist_entries FROM anon;
GRANT SELECT, INSERT, DELETE ON public.wishlist_entries TO authenticated;