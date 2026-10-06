# Auth storage on Vercel

The app keeps its existing JSON data shape, but production auth state must live
in PostgreSQL. Vercel Functions cannot persist writes to the project filesystem.

## Setup

1. Add a managed PostgreSQL database to the Vercel project. A Vercel Marketplace
   Postgres provider such as Neon can inject a pooled `DATABASE_URL`.
2. In the provider's SQL editor, run [`scripts/auth-state.sql`](../scripts/auth-state.sql).
3. Confirm `DATABASE_URL` is available to the Production environment in Vercel,
   then redeploy.

Local development without `DATABASE_URL` continues to use
`data/users.json`. Production never silently falls back to a local file.

The database stores the same JSON document fields as the old file:
`users`, `sessions`, `pendingVerifications`, and `passwordResets`. Writes use a
PostgreSQL transaction and row lock so simultaneous auth requests do not
overwrite each other's updates.
