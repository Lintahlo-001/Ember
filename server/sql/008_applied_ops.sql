CREATE TABLE IF NOT EXISTS public.applied_ops (
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  op_id      uuid NOT NULL,
  entry_id   uuid,
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, op_id)
);
CREATE INDEX IF NOT EXISTS applied_ops_applied_at_idx ON public.applied_ops (applied_at);

ALTER TABLE public.applied_ops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own select" ON public.applied_ops;
DROP POLICY IF EXISTS "own insert" ON public.applied_ops;
DROP POLICY IF EXISTS "own prune"  ON public.applied_ops;

CREATE POLICY "own select" ON public.applied_ops FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "own insert" ON public.applied_ops FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "own prune" ON public.applied_ops FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND applied_at < now() - interval '14 days');

REVOKE ALL ON public.applied_ops FROM anon;
GRANT SELECT, INSERT, DELETE ON public.applied_ops TO authenticated;

DROP FUNCTION IF EXISTS public.add_ownership_entry(text, text, text, integer, text);

CREATE OR REPLACE FUNCTION public.add_ownership_entry(
  p_card_id   text,
  p_variant   text,
  p_condition text,
  p_quantity  integer,
  p_notes     text DEFAULT NULL,
  p_op_id     uuid DEFAULT NULL,
  p_entry_id  uuid DEFAULT NULL
) RETURNS public.ownership_entries
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_prev uuid;
  v_row  public.ownership_entries;
BEGIN
  IF p_op_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_op_id::text, 0));

    SELECT entry_id INTO v_prev FROM public.applied_ops WHERE op_id = p_op_id;
    IF FOUND THEN
      SELECT * INTO v_row FROM public.ownership_entries WHERE id = v_prev;
      RETURN v_row;
    END IF;
  END IF;

  INSERT INTO public.ownership_entries (id, card_id, variant, condition, quantity, notes)
  VALUES (COALESCE(p_entry_id, gen_random_uuid()), p_card_id, p_variant, p_condition,
          p_quantity, NULLIF(btrim(p_notes), ''))
  ON CONFLICT (user_id, card_id, variant, condition)
  DO UPDATE SET
    quantity = LEAST(public.ownership_entries.quantity + EXCLUDED.quantity, 9999),
    notes    = COALESCE(EXCLUDED.notes, public.ownership_entries.notes)
  RETURNING * INTO v_row;

  IF p_op_id IS NOT NULL THEN
    INSERT INTO public.applied_ops (op_id, entry_id) VALUES (p_op_id, v_row.id)
    ON CONFLICT DO NOTHING;
  END IF;

  DELETE FROM public.applied_ops WHERE applied_at < now() - interval '30 days';
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_ownership_entry(text, text, text, integer, text, uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_ownership_entry(text, text, text, integer, text, uuid, uuid) TO authenticated;