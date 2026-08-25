-- Migration: add admin SELECT RLS for breeder-documents storage (Decision No.132)
-- AD-02: admin can view identity/license documents via Signed URL (admin JWT + SELECT RLS)
-- Does NOT add admin INSERT / UPDATE / DELETE policies
-- Does NOT modify breeder own policies or bucket public setting
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

DROP POLICY IF EXISTS breeder_documents_storage_select_admin ON storage.objects;

CREATE POLICY breeder_documents_storage_select_admin
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'breeder-documents'
    AND public.is_admin()
  );

COMMIT;
