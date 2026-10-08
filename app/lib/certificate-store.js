import { Pool } from "pg";

let pool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for certificate ownership and materials storage");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });
  }

  return pool;
}

function explainMissingTable(error) {
  if (error?.code === "42P01") {
    return new Error("Certificate database is not initialized; run scripts/certificate-records.sql");
  }
  if (error?.code === "42703" && error?.column === "supplemental_technique") {
    return new Error("Certificate database schema is outdated; rerun scripts/certificate-records.sql");
  }
  return error;
}

async function query(text, values = []) {
  try {
    return await getPool().query(text, values);
  } catch (error) {
    throw explainMissingTable(error);
  }
}

export async function registerNewCertificate(tokenId, artisanUserId) {
  await query(
    `INSERT INTO public.certificate_records (token_id, artisan_user_id)
     VALUES ($1, $2)
     ON CONFLICT (token_id) DO UPDATE SET artisan_user_id = EXCLUDED.artisan_user_id`,
    [String(tokenId), artisanUserId]
  );
}

export async function listCertificateRecords() {
  const result = await query(
    `SELECT token_id, artisan_user_id, supplemental_materials, supplemental_technique, linked_by, updated_by, updated_at
     FROM public.certificate_records ORDER BY token_id`
  );
  return result.rows;
}

export async function listCertificateRecordsForUser(userId) {
  const result = await query(
    `SELECT token_id, artisan_user_id, supplemental_materials, supplemental_technique, linked_by, updated_by, updated_at
     FROM public.certificate_records WHERE artisan_user_id = $1 ORDER BY token_id`,
    [userId]
  );
  return result.rows;
}

export async function getCertificateRecords(tokenIds) {
  if (!tokenIds?.length) return [];
  const result = await query(
    `SELECT token_id, artisan_user_id, supplemental_materials, supplemental_technique, linked_by, updated_by, updated_at
     FROM public.certificate_records WHERE token_id = ANY($1::text[])`,
    [tokenIds.map(String)]
  );
  return result.rows;
}

export async function getCertificateRecord(tokenId) {
  const result = await query(
    `SELECT token_id, artisan_user_id, supplemental_materials, supplemental_technique, linked_by, updated_by, updated_at
     FROM public.certificate_records WHERE token_id = $1`,
    [String(tokenId)]
  );
  return result.rows[0] || null;
}

export async function assignCertificate(tokenId, artisanUserId, adminUserId) {
  const result = await query(
    `INSERT INTO public.certificate_records
       (token_id, artisan_user_id, linked_by, supplemental_materials, updated_by, updated_at)
     VALUES ($1, $2, $3, NULL, NULL, NULL)
     ON CONFLICT (token_id) DO NOTHING
     RETURNING token_id, artisan_user_id, linked_by`,
    [String(tokenId), artisanUserId, adminUserId]
  );
  return result.rows[0];
}

export async function saveSupplementalCertificateData(tokenId, { materials, technique }, userId) {
  const result = await query(
    `UPDATE public.certificate_records
     SET supplemental_materials = COALESCE($1::jsonb, supplemental_materials),
         supplemental_technique = COALESCE($2, supplemental_technique),
         updated_by = $3, updated_at = NOW()
     WHERE token_id = $4
     RETURNING token_id, artisan_user_id, supplemental_materials, supplemental_technique, updated_at`,
    [materials === undefined ? null : JSON.stringify(materials), technique ?? null, userId, String(tokenId)]
  );
  return result.rows[0] || null;
}
