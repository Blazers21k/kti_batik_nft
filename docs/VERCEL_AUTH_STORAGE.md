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

## Certificate ownership and legacy materials

1. In the same PostgreSQL database, run [`scripts/certificate-records.sql`](../scripts/certificate-records.sql).
   This table links minted certificates to artisan accounts and stores app-only
   material supplements for older certificates.
2. In Vercel Project Settings → Environment Variables, add the server-only
   variable `NBC_ADMIN_EMAILS` with value `nusantarabatikchain@gmail.com` for
   Production, then redeploy. The account using this email must also be
   registered in the app. Keep this variable out of `NEXT_PUBLIC_*`.
3. Sign in with that admin account and use the dashboard to link each old
   certificate to its artisan account. The artisan can then add missing
   materials; blockchain/IPFS metadata is not changed.

The new certificate flow will not mint until the certificate table exists, so
run the SQL before deploying the feature.
