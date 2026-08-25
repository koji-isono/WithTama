-- Migration: create public.breeder_review_logs Version 1.0
-- Breeder admin review audit log (Decision No.131)
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

CREATE TABLE IF NOT EXISTS public.breeder_review_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breeder_id uuid NOT NULL REFERENCES public.breeders (id) ON DELETE RESTRICT,
  action text NOT NULL,
  comment text,
  actor_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT breeder_review_logs_action_check CHECK (
    action IN (
      'submitted',
      'review_started',
      'approved',
      'returned',
      'rejected'
    )
  ),

  CONSTRAINT breeder_review_logs_returned_comment_check CHECK (
    action <> 'returned'
    OR (comment IS NOT NULL AND btrim(comment) <> '')
  ),

  CONSTRAINT breeder_review_logs_rejected_comment_check CHECK (
    action <> 'rejected'
    OR (comment IS NOT NULL AND btrim(comment) <> '')
  )
);

CREATE INDEX IF NOT EXISTS breeder_review_logs_breeder_id_created_at_idx
  ON public.breeder_review_logs (breeder_id, created_at DESC);

ALTER TABLE public.breeder_review_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS breeder_review_logs_select_breeder_own ON public.breeder_review_logs;
DROP POLICY IF EXISTS breeder_review_logs_select_admin ON public.breeder_review_logs;
DROP POLICY IF EXISTS breeder_review_logs_insert_submitted_breeder ON public.breeder_review_logs;
DROP POLICY IF EXISTS breeder_review_logs_insert_admin_review ON public.breeder_review_logs;

CREATE POLICY breeder_review_logs_select_breeder_own
  ON public.breeder_review_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.breeders b
      WHERE b.id = breeder_review_logs.breeder_id
        AND b.user_id = auth.uid()
        AND b.deleted_at IS NULL
    )
  );

CREATE POLICY breeder_review_logs_select_admin
  ON public.breeder_review_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY breeder_review_logs_insert_submitted_breeder
  ON public.breeder_review_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND action = 'submitted'
    AND EXISTS (
      SELECT 1
      FROM public.breeders b
      WHERE b.id = breeder_id
        AND b.user_id = auth.uid()
        AND b.deleted_at IS NULL
    )
  );

CREATE POLICY breeder_review_logs_insert_admin_review
  ON public.breeder_review_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    AND actor_user_id = auth.uid()
    AND action IN ('review_started', 'approved', 'returned', 'rejected')
  );

COMMIT;
