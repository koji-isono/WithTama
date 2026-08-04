-- Migration: create public.inquiries, inquiry_messages, visits Version 1.0
-- New tables only: no DROP TABLE, TRUNCATE, or DELETE

-- Migration Purpose
-- Create public.inquiries
-- Create public.inquiry_messages
-- Create public.visits
-- Create indexes
-- Enable Row Level Security
-- Create RLS policies
-- Create updated_at triggers
-- This migration does not delete existing application data.

BEGIN;

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Admin role check (reuse if already exists from breeders migration)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- inquiries
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyers (id) ON DELETE RESTRICT,
  breeder_id uuid NOT NULL REFERENCES public.breeders (id) ON DELETE RESTRICT,
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'open',
  subject text,
  last_message_at timestamptz,
  closed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inquiries_status_check CHECK (
    status IN (
      'open',
      'replied',
      'visit_requested',
      'visit_scheduled',
      'completed',
      'closed'
    )
  )
);

CREATE INDEX IF NOT EXISTS inquiries_buyer_id_idx ON public.inquiries (buyer_id);
CREATE INDEX IF NOT EXISTS inquiries_breeder_id_idx ON public.inquiries (breeder_id);
CREATE INDEX IF NOT EXISTS inquiries_pet_id_idx ON public.inquiries (pet_id);
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON public.inquiries (status);
CREATE INDEX IF NOT EXISTS inquiries_last_message_at_idx ON public.inquiries (last_message_at);
CREATE INDEX IF NOT EXISTS inquiries_active_idx
  ON public.inquiries (id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS inquiries_set_updated_at ON public.inquiries;

CREATE TRIGGER inquiries_set_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inquiries_select_buyer ON public.inquiries;

CREATE POLICY inquiries_select_buyer
  ON public.inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = inquiries.buyer_id
        AND buyers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS inquiries_select_breeder ON public.inquiries;

CREATE POLICY inquiries_select_breeder
  ON public.inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.breeders
      WHERE breeders.id = inquiries.breeder_id
        AND breeders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS inquiries_select_admin ON public.inquiries;

CREATE POLICY inquiries_select_admin
  ON public.inquiries
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS inquiries_insert_buyer ON public.inquiries;

CREATE POLICY inquiries_insert_buyer
  ON public.inquiries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = inquiries.buyer_id
        AND buyers.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.pets
      WHERE pets.id = inquiries.pet_id
        AND pets.breeder_id = inquiries.breeder_id
        AND pets.deleted_at IS NULL
        AND pets.status = 'published'
    )
  );

DROP POLICY IF EXISTS inquiries_update_buyer ON public.inquiries;

CREATE POLICY inquiries_update_buyer
  ON public.inquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = inquiries.buyer_id
        AND buyers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = inquiries.buyer_id
        AND buyers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS inquiries_update_breeder ON public.inquiries;

CREATE POLICY inquiries_update_breeder
  ON public.inquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.breeders
      WHERE breeders.id = inquiries.breeder_id
        AND breeders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.breeders
      WHERE breeders.id = inquiries.breeder_id
        AND breeders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS inquiries_update_admin ON public.inquiries;

CREATE POLICY inquiries_update_admin
  ON public.inquiries
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- inquiry_messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries (id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  sender_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inquiry_messages_sender_type_check CHECK (
    sender_type IN ('buyer', 'breeder', 'admin')
  ),

  CONSTRAINT inquiry_messages_message_not_empty CHECK (
    length(trim(message)) > 0
  )
);

CREATE INDEX IF NOT EXISTS inquiry_messages_inquiry_id_idx
  ON public.inquiry_messages (inquiry_id);
CREATE INDEX IF NOT EXISTS inquiry_messages_created_at_idx
  ON public.inquiry_messages (created_at);
CREATE INDEX IF NOT EXISTS inquiry_messages_unread_idx
  ON public.inquiry_messages (inquiry_id)
  WHERE is_read = false;

ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inquiry_messages_select_party ON public.inquiry_messages;

CREATE POLICY inquiry_messages_select_party
  ON public.inquiry_messages
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.inquiries i
      JOIN public.buyers b ON b.id = i.buyer_id
      WHERE i.id = inquiry_messages.inquiry_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.inquiries i
      JOIN public.breeders br ON br.id = i.breeder_id
      WHERE i.id = inquiry_messages.inquiry_id
        AND br.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS inquiry_messages_insert_party ON public.inquiry_messages;

CREATE POLICY inquiry_messages_insert_party
  ON public.inquiry_messages
  FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid()
    AND (
      (
        sender_type = 'buyer'
        AND EXISTS (
          SELECT 1
          FROM public.inquiries i
          JOIN public.buyers b ON b.id = i.buyer_id
          WHERE i.id = inquiry_messages.inquiry_id
            AND b.user_id = auth.uid()
        )
      )
      OR (
        sender_type = 'breeder'
        AND EXISTS (
          SELECT 1
          FROM public.inquiries i
          JOIN public.breeders br ON br.id = i.breeder_id
          WHERE i.id = inquiry_messages.inquiry_id
            AND br.user_id = auth.uid()
        )
      )
      OR (
        sender_type = 'admin'
        AND public.is_admin()
      )
    )
  );

DROP POLICY IF EXISTS inquiry_messages_update_party ON public.inquiry_messages;

CREATE POLICY inquiry_messages_update_party
  ON public.inquiry_messages
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.inquiries i
      JOIN public.buyers b ON b.id = i.buyer_id
      WHERE i.id = inquiry_messages.inquiry_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.inquiries i
      JOIN public.breeders br ON br.id = i.breeder_id
      WHERE i.id = inquiry_messages.inquiry_id
        AND br.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.inquiries i
      JOIN public.buyers b ON b.id = i.buyer_id
      WHERE i.id = inquiry_messages.inquiry_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.inquiries i
      JOIN public.breeders br ON br.id = i.breeder_id
      WHERE i.id = inquiry_messages.inquiry_id
        AND br.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- visits
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries (id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL REFERENCES public.buyers (id) ON DELETE RESTRICT,
  breeder_id uuid NOT NULL REFERENCES public.breeders (id) ON DELETE RESTRICT,
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL,
  requested_at_second timestamptz,
  requested_at_third timestamptz,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'requested',
  confirmed_by_breeder_at timestamptz,
  animal_confirmed boolean NOT NULL DEFAULT false,
  explanation_completed boolean NOT NULL DEFAULT false,
  result text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  canceled_at timestamptz,
  cancellation_reason text,
  breeder_note text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT visits_inquiry_id_unique UNIQUE (inquiry_id),

  CONSTRAINT visits_status_check CHECK (
    status IN ('requested', 'scheduled', 'completed', 'canceled')
  ),

  CONSTRAINT visits_result_check CHECK (
    result IN ('pending', 'contracted', 'declined', 'considering')
  )
);

CREATE INDEX IF NOT EXISTS visits_buyer_id_idx ON public.visits (buyer_id);
CREATE INDEX IF NOT EXISTS visits_breeder_id_idx ON public.visits (breeder_id);
CREATE INDEX IF NOT EXISTS visits_pet_id_idx ON public.visits (pet_id);
CREATE INDEX IF NOT EXISTS visits_status_idx ON public.visits (status);
CREATE INDEX IF NOT EXISTS visits_scheduled_at_idx ON public.visits (scheduled_at);
CREATE INDEX IF NOT EXISTS visits_active_idx
  ON public.visits (id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS visits_set_updated_at ON public.visits;

CREATE TRIGGER visits_set_updated_at
  BEFORE UPDATE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS visits_select_party ON public.visits;

CREATE POLICY visits_select_party
  ON public.visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = visits.buyer_id
        AND buyers.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.breeders
      WHERE breeders.id = visits.breeder_id
        AND breeders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS visits_select_admin ON public.visits;

CREATE POLICY visits_select_admin
  ON public.visits
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS visits_insert_buyer ON public.visits;

CREATE POLICY visits_insert_buyer
  ON public.visits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = visits.buyer_id
        AND buyers.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.inquiries i
      WHERE i.id = visits.inquiry_id
        AND i.buyer_id = visits.buyer_id
        AND i.breeder_id = visits.breeder_id
        AND i.pet_id = visits.pet_id
    )
  );

DROP POLICY IF EXISTS visits_update_buyer ON public.visits;

CREATE POLICY visits_update_buyer
  ON public.visits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = visits.buyer_id
        AND buyers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.buyers
      WHERE buyers.id = visits.buyer_id
        AND buyers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS visits_update_breeder ON public.visits;

CREATE POLICY visits_update_breeder
  ON public.visits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.breeders
      WHERE breeders.id = visits.breeder_id
        AND breeders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.breeders
      WHERE breeders.id = visits.breeder_id
        AND breeders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS visits_update_admin ON public.visits;

CREATE POLICY visits_update_admin
  ON public.visits
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMIT;
