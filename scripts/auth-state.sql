-- Durable JSON document for custom auth state on Vercel.
-- Run once against the PostgreSQL database configured as DATABASE_URL.

CREATE TABLE IF NOT EXISTS public.auth_state (
  id text PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_state_object CHECK (jsonb_typeof(state) = 'object')
);

INSERT INTO public.auth_state (id, state)
VALUES (
  'users',
  '{"users":[],"sessions":[],"pendingVerifications":[],"passwordResets":[]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON TABLE public.auth_state FROM PUBLIC;
