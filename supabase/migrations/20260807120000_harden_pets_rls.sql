-- Migration: harden public.pets RLS (Decision No.103)
-- Replace development allow-all policies with production RLS
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Remove development / legacy allow-all policies
DROP POLICY IF EXISTS "pets_allow_all_for_development" ON public.pets;
DROP POLICY IF EXISTS "Development pets insert" ON public.pets;
DROP POLICY IF EXISTS "Development pets select" ON public.pets;
DROP POLICY IF EXISTS "Development pets update" ON public.pets;

DROP POLICY IF EXISTS pets_select_breeder_own ON public.pets;
DROP POLICY IF EXISTS pets_insert_breeder_own ON public.pets;
DROP POLICY IF EXISTS pets_update_breeder_own ON public.pets;
DROP POLICY IF EXISTS pets_select_public_published ON public.pets;
DROP POLICY IF EXISTS pets_select_admin ON public.pets;

-- Breeder: SELECT own pets (any status)
CREATE POLICY pets_select_breeder_own
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.breeders b
      WHERE b.id = pets.breeder_id
        AND b.user_id = auth.uid()
    )
  );

-- Public: SELECT published pets only
CREATE POLICY pets_select_public_published
  ON public.pets
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND deleted_at IS NULL
  );

-- Admin: SELECT all non-deleted pets (any status)
CREATE POLICY pets_select_admin
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    AND deleted_at IS NULL
  );

-- Breeder: INSERT draft only for own breeder_id
CREATE POLICY pets_insert_breeder_own
  ON public.pets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'draft'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.breeders b
      WHERE b.id = breeder_id
        AND b.user_id = auth.uid()
    )
  );

-- Breeder: UPDATE own pets
-- Note: status transition control (draft -> under_review, admin approve/reject)
-- is enforced in application Server Actions / future RPC, not in this policy.
CREATE POLICY pets_update_breeder_own
  ON public.pets
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.breeders b
      WHERE b.id = pets.breeder_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.breeders b
      WHERE b.id = pets.breeder_id
        AND b.user_id = auth.uid()
    )
  );

COMMIT;
