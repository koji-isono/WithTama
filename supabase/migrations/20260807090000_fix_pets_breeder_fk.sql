-- Migration: fix pets.breeder_id foreign key to reference public.breeders(id)
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

ALTER TABLE public.pets
DROP CONSTRAINT IF EXISTS pets_breeder_id_fkey;

ALTER TABLE public.pets
ADD CONSTRAINT pets_breeder_id_fkey
FOREIGN KEY (breeder_id)
REFERENCES public.breeders(id)
ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_pets_breeder_id
ON public.pets (breeder_id);

COMMIT;
