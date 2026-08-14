-- Migration: PU-01 public read access for published pet list
-- Views (public columns only) + pet_photos / Storage SELECT for anon
-- Does NOT publicize pet-photos bucket; does NOT add client RPCs
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Helper — publicly listable pet (used by RLS policies only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_publicly_listable_pet(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pets p
    INNER JOIN public.breeders b ON b.id = p.breeder_id
    WHERE p.id = p_pet_id
      AND p.status = 'published'
      AND p.deleted_at IS NULL
      AND b.deleted_at IS NULL
      AND b.review_status = 'approved'
      AND b.membership_status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_publicly_listable_pet(uuid) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 2. Views — public columns only (PU-01)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.published_pets_public
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.public_display_name,
  p.species,
  p.breed,
  p.sex,
  p.birthday,
  p.price,
  p.breeder_id
FROM public.pets p
INNER JOIN public.breeders b ON b.id = p.breeder_id
WHERE p.status = 'published'
  AND p.deleted_at IS NULL
  AND b.deleted_at IS NULL
  AND b.review_status = 'approved'
  AND b.membership_status = 'active';

CREATE OR REPLACE VIEW public.breeder_public_profiles
WITH (security_invoker = false) AS
SELECT
  b.id,
  b.business_name,
  b.prefecture
FROM public.breeders b
WHERE b.deleted_at IS NULL
  AND b.review_status = 'approved'
  AND b.membership_status = 'active';

GRANT SELECT ON public.published_pets_public TO anon, authenticated;
GRANT SELECT ON public.breeder_public_profiles TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. pets — anon must use views; authenticated keeps published row SELECT
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS pets_select_public_published ON public.pets;

CREATE POLICY pets_select_public_published
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND deleted_at IS NULL
  );

-- ---------------------------------------------------------------------------
-- 4. pet_photos — public SELECT for publicly listable pets only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS pet_photos_select_public_published ON public.pet_photos;

CREATE POLICY pet_photos_select_public_published
  ON public.pet_photos
  FOR SELECT
  TO anon, authenticated
  USING (public.is_publicly_listable_pet(pet_id));

-- ---------------------------------------------------------------------------
-- 5. storage.objects — pet-photos public SELECT (private bucket unchanged)
-- Path: breeders/{userId}/pets/{petId}/{filename}
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS pet_photos_storage_select_public_published ON storage.objects;

CREATE POLICY pet_photos_storage_select_public_published
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = 'breeders'
    AND (storage.foldername(name))[3] = 'pets'
    AND (storage.foldername(name))[4] IS NOT NULL
    AND public.is_publicly_listable_pet((storage.foldername(name))[4]::uuid)
  );

COMMIT;
