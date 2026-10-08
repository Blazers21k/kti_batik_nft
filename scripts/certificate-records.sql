-- Run against the PostgreSQL database configured as DATABASE_URL; this script is safe to rerun.
-- This stores account ownership links and supplemental data for legacy NFTs.

CREATE TABLE IF NOT EXISTS public.certificate_records (
  token_id TEXT PRIMARY KEY CHECK (token_id ~ '^[0-9]+$'),
  artisan_user_id TEXT NOT NULL,
  supplemental_materials JSONB,
  supplemental_technique TEXT,
  linked_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT certificate_records_materials_array
    CHECK (supplemental_materials IS NULL OR jsonb_typeof(supplemental_materials) = 'array')
);

ALTER TABLE public.certificate_records
  ADD COLUMN IF NOT EXISTS supplemental_technique TEXT;

CREATE INDEX IF NOT EXISTS certificate_records_artisan_user_id_idx
  ON public.certificate_records (artisan_user_id);

REVOKE ALL ON TABLE public.certificate_records FROM PUBLIC;
