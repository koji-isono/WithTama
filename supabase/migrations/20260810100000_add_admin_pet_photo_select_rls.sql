-- Migration: add admin SELECT RLS for pet_photos and pet-photos storage (Decision No.104)
-- AD-10 / AD-11: admin can view pet photos via Signed URL (admin JWT + SELECT RLS)
-- Does NOT add admin INSERT / UPDATE / DELETE policies
-- Does NOT modify breeder own policies or bucket public setting
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. public.pet_photos — admin SELECT only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS pet_photos_select_admin ON public.pet_photos;

CREATE POLICY pet_photos_select_admin
  ON public.pet_photos
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. storage.objects — pet-photos bucket admin SELECT only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS pet_photos_storage_select_admin ON storage.objects;

CREATE POLICY pet_photos_storage_select_admin
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND public.is_admin()
  );

COMMIT;
