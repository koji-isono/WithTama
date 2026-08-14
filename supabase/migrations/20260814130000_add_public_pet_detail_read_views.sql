-- Migration: PU-02 public read views for published pet detail
-- Adds detail Views (public columns only); does NOT change RLS, Storage, or is_publicly_listable_pet
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. published_pet_detail_public — PU-02 detail columns (same listability as PU-01)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.published_pet_detail_public
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.public_display_name,
  p.species,
  p.breed,
  p.sex,
  p.birthday,
  p.color,
  p.temperament,
  p.description,
  p.price,
  p.price_comment,
  p.breeder_id
FROM public.pets p
INNER JOIN public.breeders b ON b.id = p.breeder_id
WHERE p.status = 'published'
  AND p.deleted_at IS NULL
  AND b.deleted_at IS NULL
  AND b.review_status = 'approved'
  AND b.membership_status = 'active';

COMMENT ON VIEW public.published_pet_detail_public IS
  'PU-02: Public pet detail columns for published listable pets only. breeder_id is for server-side JOIN; do not expose in public HTML/DTO.';

-- ---------------------------------------------------------------------------
-- 2. breeder_public_detail_profiles — PU-02 breeder detail columns
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.breeder_public_detail_profiles
WITH (security_invoker = false) AS
SELECT
  b.id,
  b.business_name,
  b.prefecture,
  b.city,
  b.profile_text,
  b.breeding_policy,
  b.health_policy,
  b.breeding_environment
FROM public.breeders b
WHERE b.deleted_at IS NULL
  AND b.review_status = 'approved'
  AND b.membership_status = 'active';

COMMENT ON VIEW public.breeder_public_detail_profiles IS
  'PU-02: Public breeder profile columns for approved active breeders. id is for server-side JOIN; do not expose in public HTML/DTO.';

-- ---------------------------------------------------------------------------
-- 3. GRANT — anon / authenticated SELECT only (matches PU-01 list views)
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.published_pet_detail_public TO anon, authenticated;
GRANT SELECT ON public.breeder_public_detail_profiles TO anon, authenticated;

COMMIT;
