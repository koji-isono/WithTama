-- Migration: create public.pet_photos table, RLS, and set_main_pet_photo function
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

CREATE TABLE IF NOT EXISTS public.pet_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_main boolean NOT NULL DEFAULT false,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pet_photos_display_order_check CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS pet_photos_pet_id_idx ON public.pet_photos (pet_id);
CREATE INDEX IF NOT EXISTS pet_photos_pet_id_display_order_idx
  ON public.pet_photos (pet_id, display_order, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS pet_photos_one_main_per_pet_idx
  ON public.pet_photos (pet_id)
  WHERE is_main = true;

CREATE OR REPLACE FUNCTION public.set_pet_photos_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pet_photos_set_updated_at ON public.pet_photos;

CREATE TRIGGER pet_photos_set_updated_at
  BEFORE UPDATE ON public.pet_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pet_photos_updated_at();

ALTER TABLE public.pet_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pet_photos_select_own ON public.pet_photos;
DROP POLICY IF EXISTS pet_photos_insert_own ON public.pet_photos;
DROP POLICY IF EXISTS pet_photos_update_own ON public.pet_photos;
DROP POLICY IF EXISTS pet_photos_delete_own ON public.pet_photos;

CREATE POLICY pet_photos_select_own
  ON public.pet_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id = pet_photos.pet_id
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY pet_photos_insert_own
  ON public.pet_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id = pet_photos.pet_id
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY pet_photos_update_own
  ON public.pet_photos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id = pet_photos.pet_id
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id = pet_photos.pet_id
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY pet_photos_delete_own
  ON public.pet_photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pets p
      INNER JOIN public.breeders b ON b.id = p.breeder_id
      WHERE p.id = pet_photos.pet_id
        AND b.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.set_main_pet_photo(p_pet_id uuid, p_photo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breeder_user_id uuid;
BEGIN
  SELECT b.user_id
  INTO v_breeder_user_id
  FROM public.pets p
  INNER JOIN public.breeders b ON b.id = p.breeder_id
  WHERE p.id = p_pet_id
    AND p.deleted_at IS NULL;

  IF v_breeder_user_id IS NULL OR v_breeder_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized pet photo update';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pet_photos
    WHERE id = p_photo_id
      AND pet_id = p_pet_id
  ) THEN
    RAISE EXCEPTION 'Pet photo not found';
  END IF;

  UPDATE public.pet_photos
  SET is_main = false, updated_at = now()
  WHERE pet_id = p_pet_id;

  UPDATE public.pet_photos
  SET is_main = true, updated_at = now()
  WHERE id = p_photo_id
    AND pet_id = p_pet_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_main_pet_photo(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_main_pet_photo(uuid, uuid) TO authenticated;

COMMIT;
