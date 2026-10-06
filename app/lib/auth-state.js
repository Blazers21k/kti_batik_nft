import { Pool } from "pg";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "users.json");
const STATE_ID = "users";
const EMPTY_STATE = {
  users: [],
  sessions: [],
  pendingVerifications: [],
  passwordResets: [],
};

let pool;

function normalizeState(state) {
  const normalized = state && typeof state === "object" ? state : {};
  return {
    ...EMPTY_STATE,
    ...normalized,
    users: Array.isArray(normalized.users) ? normalized.users : [],
    sessions: Array.isArray(normalized.sessions) ? normalized.sessions : [],
    pendingVerifications: Array.isArray(normalized.pendingVerifications)
      ? normalized.pendingVerifications
      : [],
    passwordResets: Array.isArray(normalized.passwordResets)
      ? normalized.passwordResets
      : [],
  };
}

function shouldUseLocalJson() {
  return !process.env.DATABASE_URL && process.env.NODE_ENV !== "production";
}

function readLocalState() {
  try {
    return normalizeState(JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")));
  } catch {
    return normalizeState(EMPTY_STATE);
  }
}

function writeLocalState(state) {
  const directory = path.dirname(DATA_FILE);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for production auth storage");
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

export async function readAuthState() {
  if (shouldUseLocalJson()) return readLocalState();

  const result = await getPool().query(
    "SELECT state FROM auth_state WHERE id = $1",
    [STATE_ID]
  );

  if (!result.rows[0]) {
    throw new Error("Auth database is not initialized; run scripts/auth-state.sql");
  }

  return normalizeState(result.rows[0].state);
}

export async function updateAuthState(update) {
  if (shouldUseLocalJson()) {
    const state = readLocalState();
    const result = await update(state);
    writeLocalState(state);
    return result;
  }

  const client = await getPool().connect();
  let transactionStarted = false;
  try {
    await client.query("BEGIN");
    transactionStarted = true;
    const result = await client.query(
      "SELECT state FROM auth_state WHERE id = $1 FOR UPDATE",
      [STATE_ID]
    );

    if (!result.rows[0]) {
      throw new Error("Auth database is not initialized; run scripts/auth-state.sql");
    }

    const state = normalizeState(result.rows[0].state);
    const value = await update(state);
    await client.query(
      "UPDATE auth_state SET state = $1::jsonb, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(state), STATE_ID]
    );
    await client.query("COMMIT");
    transactionStarted = false;
    return value;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the error that caused the transaction to fail.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
