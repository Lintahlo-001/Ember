CREATE TABLE IF NOT EXISTS public.ownership_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id    text NOT NULL CHECK (card_id ~ '^[A-Za-z0-9._-]{1,40}$'),
  variant    text NOT NULL CHECK (variant ~ '^[A-Za-z0-9_-]{1,40}$'),
  condition  text NOT NULL CHECK (condition IN
               ('Near Mint','Lightly Played','Moderately Played','Heavily Played','Damaged')),
  quantity   integer NOT NULL CHECK (quantity BETWEEN 1 AND 9999),
  notes      text CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id, variant, condition)
);

ALTER TABLE public.ownership_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own select" ON public.ownership_entries;
DROP POLICY IF EXISTS "own insert" ON public.ownership_entries;
DROP POLICY IF EXISTS "own update" ON public.ownership_entries;
DROP POLICY IF EXISTS "own delete" ON public.ownership_entries;

CREATE POLICY "own select" ON public.ownership_entries FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "own insert" ON public.ownership_entries FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "own update" ON public.ownership_entries FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "own delete" ON public.ownership_entries FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.ownership_entries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ownership_entries TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS ownership_touch ON public.ownership_entries;
CREATE TRIGGER ownership_touch BEFORE UPDATE ON public.ownership_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.add_ownership_entry(
  p_card_id   text,
  p_variant   text,
  p_condition text,
  p_quantity  integer,
  p_notes     text DEFAULT NULL
) RETURNS public.ownership_entries
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  INSERT INTO public.ownership_entries (card_id, variant, condition, quantity, notes)
  VALUES (p_card_id, p_variant, p_condition, p_quantity, NULLIF(btrim(p_notes), ''))
  ON CONFLICT (user_id, card_id, variant, condition)
  DO UPDATE SET
    quantity = LEAST(public.ownership_entries.quantity + EXCLUDED.quantity, 9999),
    notes    = COALESCE(EXCLUDED.notes, public.ownership_entries.notes)
  RETURNING *;
$$;

REVOKE EXECUTE ON FUNCTION public.add_ownership_entry(text, text, text, integer, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_ownership_entry(text, text, text, integer, text) TO authenticated;