-- Migration: Phase1 PostgREST table privileges (GRANT)
-- RLS remains the row-level gate; GRANT only allows roles to attempt operations.
-- Applies after all Phase1 base tables exist.
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- PostgREST roles must resolve objects in public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- buyers: bootstrap + profile (auth/repository client, buyers/repository server)
-- RLS: SELECT / INSERT / UPDATE own row only — no DELETE policy
GRANT SELECT, INSERT, UPDATE ON TABLE public.buyers TO authenticated;

-- breeders: bootstrap + profile + billing read (browser + server authenticated)
-- RLS: SELECT / INSERT / UPDATE own row — no DELETE policy
GRANT SELECT, INSERT, UPDATE ON TABLE public.breeders TO authenticated;

-- pets: breeder CRUD except hard delete (server authenticated)
-- RLS: SELECT (own + published + admin), INSERT draft, UPDATE own — no DELETE policy
GRANT SELECT, INSERT, UPDATE ON TABLE public.pets TO authenticated;

-- favorites: buyer list / add / remove (server authenticated)
-- RLS: SELECT / INSERT / DELETE own — no UPDATE policy
GRANT SELECT, INSERT, DELETE ON TABLE public.favorites TO authenticated;

-- inquiries + inquiry_messages: buyer/breeder messaging (server authenticated)
-- RLS: SELECT / INSERT / UPDATE — soft delete via UPDATE, no DELETE policy
GRANT SELECT, INSERT, UPDATE ON TABLE public.inquiries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.inquiry_messages TO authenticated;

-- visits: list/detail read only from app; mutations via SECURITY DEFINER RPCs
-- RLS: SELECT / INSERT / UPDATE policies exist; client uses SELECT only
GRANT SELECT ON TABLE public.visits TO authenticated;

-- pet_photos: breeder manage + public main-photo read on /pets (server)
-- RLS: SELECT (own + public published), INSERT / UPDATE / DELETE own
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pet_photos TO authenticated;

-- review logs: append via SECURITY DEFINER RPCs; app reads via authenticated SELECT only
GRANT SELECT ON TABLE public.pet_review_logs TO authenticated;
GRANT SELECT ON TABLE public.breeder_review_logs TO authenticated;

-- anon: public /pets reads pet_photos for main image (published_pets_public uses Views with GRANT already)
-- RLS: pet_photos_select_public_published TO anon — base table SELECT required to evaluate policy
GRANT SELECT ON TABLE public.pet_photos TO anon;

-- service_role-only: no anon/authenticated access (RLS has no policies + explicit revoke)
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon, authenticated;

COMMIT;
