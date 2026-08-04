-- Migration: create public.favorites Version 1.0
-- New table only: no DROP TABLE, TRUNCATE, or DELETE

BEGIN;

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyers (id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT favorites_buyer_id_pet_id_unique UNIQUE (buyer_id, pet_id)
);

CREATE INDEX IF NOT EXISTS favorites_buyer_id_idx ON public.favorites (buyer_id);
CREATE INDEX IF NOT EXISTS favorites_pet_id_idx ON public.favorites (pet_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favorites_select_own ON public.favorites;
DROP POLICY IF EXISTS favorites_insert_own ON public.favorites;
DROP POLICY IF EXISTS favorites_delete_own ON public.favorites;

CREATE POLICY favorites_select_own
  ON public.favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = favorites.buyer_id
        AND buyers.user_id = auth.uid()
    )
  );

CREATE POLICY favorites_insert_own
  ON public.favorites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = favorites.buyer_id
        AND buyers.user_id = auth.uid()
    )
  );

CREATE POLICY favorites_delete_own
  ON public.favorites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = favorites.buyer_id
        AND buyers.user_id = auth.uid()
    )
  );

COMMIT;
