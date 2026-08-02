import pg from "pg";
import fs from "fs";
import path from "path";
import { isConfigured as isCloudinaryConfigured } from "./cloudinary.js";

const { Client } = pg;

let syncTimeout = null;
let isReadyToBackup = !process.env.SYNC_DATABASE_URL;

export let lastSyncStatus = {
  lastBackupAttempt: null,
  lastBackupSuccess: null,
  lastBackupError: null,
  lastRestoreAttempt: null,
  lastRestoreSuccess: null,
  lastRestoreError: null
};

// Helper to delay execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function getDatabaseUrls() {
  const primary = (
    process.env.SYNC_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
  );
  const cleanPrimary = primary ? primary.trim() : null;
  const backup = process.env.SYNC_DATABASE_URL_BACKUP ? process.env.SYNC_DATABASE_URL_BACKUP.trim() : null;
  const list = [];
  if (cleanPrimary && (cleanPrimary.startsWith('postgres://') || cleanPrimary.startsWith('postgresql://'))) {
    list.push({ name: 'Primary Neon', url: cleanPrimary });
  }
  if (backup && (backup.startsWith('postgres://') || backup.startsWith('postgresql://'))) {
    list.push({ name: 'Backup Neon', url: backup });
  }
  const autumnMath = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  if (!list.some(x => x.url === autumnMath)) {
    list.push({ name: 'Autumn Math Neon', url: autumnMath });
  }
  return list;
}

/**
 * Validates that a SQLite file at the given path is non-empty and contains
 * essential tables (teams, matches). Returns true if valid, false otherwise.
 */
function validateRestoredDatabase(dbPath) {
  try {
    if (!fs.existsSync(dbPath)) return false;
    const stat = fs.statSync(dbPath);
    if (stat.size < 4096) {
      // SQLite files smaller than 4KB are almost certainly empty/corrupt
      console.warn(`[Sync] Validation failed: restored DB too small (${stat.size} bytes)`);
      return false;
    }
    // Check SQLite magic header
    const fd = fs.openSync(dbPath, 'r');
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    if (!buf.toString('utf-8', 0, 15).startsWith('SQLite format 3')) {
      console.warn('[Sync] Validation failed: file is not a valid SQLite database');
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Sync] Validation error:', err.message);
    return false;
  }
}

/**
 * Attempts to query a single Neon instance for the latest backup data.
 * Returns { data, updatedAt } or null on failure.
 */
async function fetchFromNeon(name, url) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 3000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let client = null;
    try {
      console.log(`[Sync] Connecting to ${name} (attempt ${attempt}/${MAX_RETRIES})...`);
      client = new Client({ connectionString: url, connectionTimeoutMillis: 15000 });
      await client.connect();

      await client.query(`
        CREATE TABLE IF NOT EXISTS sqlite_sync (
          key VARCHAR(255) PRIMARY KEY,
          data BYTEA,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try { await client.query(`DROP TABLE IF EXISTS uploaded_files;`); } catch (e) {}

      const res = await client.query(
        "SELECT data, updated_at FROM sqlite_sync WHERE key = $1",
        ["tournament.db"]
      );
      await client.end();

      if (res.rows.length > 0 && res.rows[0].data) {
        console.log(`[Sync] Found backup in ${name} updated at: ${res.rows[0].updated_at}`);
        return { data: res.rows[0].data, updatedAt: new Date(res.rows[0].updated_at).getTime() };
      }
      return null; // Connected OK but no backup row yet
    } catch (err) {
      console.warn(`[Sync] Attempt ${attempt}/${MAX_RETRIES} failed for ${name}: ${err.message}`);
      if (client) { try { await client.end(); } catch (e) {} }
      if (attempt < MAX_RETRIES) {
        console.log(`[Sync] Retrying ${name} in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  return null; // All retries exhausted
}

/**
 * Restores the SQLite database from the best available Neon backup.
 * Returns true if a valid backup was restored, false otherwise.
 * IMPORTANT: Callers must check the return value to decide whether to allow writes/backups.
 */
export async function restoreDatabase(dbPath) {
  lastSyncStatus.lastRestoreAttempt = new Date().toISOString();
  const dbUrls = getDatabaseUrls();

  if (dbUrls.length === 0) {
    console.log("[Sync] SYNC_DATABASE_URL is not set. Running database locally without cloud backup.");
    isReadyToBackup = true;
    return true; // No cloud sync needed, local DB is authoritative
  }

  console.log(`[Sync] Restoring database from cloud storage (${dbUrls.length} Neon instance(s) configured)...`);

  let latestData = null;
  let latestTime = null;
  let latestSource = null;

  for (const { name, url } of dbUrls) {
    const result = await fetchFromNeon(name, url);
    if (result && (!latestTime || result.updatedAt > latestTime)) {
      latestTime = result.updatedAt;
      latestData = result.data;
      latestSource = name;
    }
  }

  if (latestData) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(dbPath, latestData);
    console.log(`[Sync] Wrote restored database (${latestData.length} bytes) from ${latestSource}`);

    // Validate the written file before declaring success
    if (!validateRestoredDatabase(dbPath)) {
      const errMsg = 'Restored file failed validation (corrupt or too small). Discarding.';
      console.error(`[Sync] ${errMsg}`);
      lastSyncStatus.lastRestoreError = errMsg;
      // Remove the corrupt file so initDatabase can start fresh
      try { fs.unlinkSync(dbPath); } catch (e) {}
      isReadyToBackup = false;
      return false;
    }

    console.log(`[Sync] Successfully restored and validated database from ${latestSource}`);
    lastSyncStatus.lastRestoreSuccess = `${new Date().toISOString()} (from ${latestSource})`;
    isReadyToBackup = true;
    return true;
  }

  // No backup found — check if we have a local template to start from
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const templateDbPath = path.join(process.cwd(), 'data', 'tournament.db');

  if (!fs.existsSync(dbPath) && fs.existsSync(templateDbPath)) {
    try {
      fs.copyFileSync(templateDbPath, dbPath);
      console.log("[Sync] Copied initial template database file to " + dbPath);
      lastSyncStatus.lastRestoreSuccess = new Date().toISOString() + " (Fresh/Template)";
      // Template is a fresh DB, safe to backup after init
      isReadyToBackup = true;
      return true;
    } catch (e) {
      console.error("[Sync] Failed to copy initial template database:", e.message);
    }
  }

  if (fs.existsSync(dbPath) && validateRestoredDatabase(dbPath)) {
    // DB file already exists locally (not a fresh Render environment, or disk persisted)
    console.log("[Sync] Using existing local database file (no cloud backup found).");
    lastSyncStatus.lastRestoreSuccess = new Date().toISOString() + " (Existing local)";
    isReadyToBackup = true;
    return true;
  }

  // Truly no backup anywhere — starting fresh. Allow backup ONLY after init runs.
  console.warn("[Sync] No valid backup found in any Neon instance. Starting with a fresh database.");
  lastSyncStatus.lastRestoreSuccess = new Date().toISOString() + " (Fresh/Empty)";
  lastSyncStatus.lastRestoreError = "No backup found in configured Neon instances.";
  // Allow backup after init so the first real data gets saved
  isReadyToBackup = true;
  return false; // Caller should know restore didn't find existing data
}

export async function backupDatabase(dbPath) {
  lastSyncStatus.lastBackupAttempt = new Date().toISOString();
  const dbUrls = getDatabaseUrls();
  if (dbUrls.length === 0) return;

  if (!isReadyToBackup) {
    console.warn("[Sync] Backup skipped: database is not ready (restore failed or blocked).");
    lastSyncStatus.lastBackupError = "Backup skipped: restore failed on startup.";
    return;
  }

  if (!fs.existsSync(dbPath)) {
    console.log("[Sync] Database file not found to backup:", dbPath);
    lastSyncStatus.lastBackupError = "Database file not found.";
    return;
  }

  // Flush SQLite WAL frames into tournament.db before reading
  try {
    const { checkpointDatabase } = await import("../db.js");
    checkpointDatabase();
  } catch (e) {
    console.warn("[Sync] WAL checkpoint before backup warning:", e.message);
  }

  // Safety check: never backup a suspiciously small file to avoid overwriting real data
  const stat = fs.statSync(dbPath);
  if (stat.size < 4096) {
    console.error(`[Sync] Backup aborted: DB file is too small (${stat.size} bytes). Refusing to overwrite cloud backup with potentially empty data.`);
    lastSyncStatus.lastBackupError = `Backup aborted: file too small (${stat.size} bytes)`;
    return;
  }

  const data = fs.readFileSync(dbPath);

  // Backup in parallel to all configured Neon instances
  for (const { name, url } of dbUrls) {
    try {
      const client = new Client({ connectionString: url, connectionTimeoutMillis: 15000 });
      await client.connect();

      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS sqlite_sync (
            key VARCHAR(255) PRIMARY KEY,
            data BYTEA,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await client.query(`
          INSERT INTO sqlite_sync (key, data, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (key) DO UPDATE
          SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;
        `, ["tournament.db", data]);
        console.log(`[Sync] Successfully backed up to ${name} (${data.length} bytes)`);
        lastSyncStatus.lastBackupSuccess = new Date().toISOString();
        lastSyncStatus.lastBackupError = null;
      } finally {
        await client.end();
      }
    } catch (err) {
      console.error(`[Sync] Backup to ${name} failed:`, err.message);
      lastSyncStatus.lastBackupError = err.message;
    }
  }
}

// Debounced sync scheduling
export function scheduleSync(dbPath) {
  const dbUrls = getDatabaseUrls();
  if (dbUrls.length === 0) return;

  if (!isReadyToBackup) {
    console.warn("[Sync] Schedule backup skipped: database is not ready.");
    return;
  }

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    backupDatabase(dbPath).catch((err) => {
      console.error("[Sync] Background backup error:", err.message);
      lastSyncStatus.lastBackupError = err.message;
    });
  }, 500); // Sync 500ms after write
}

export function getSyncStatus() {
  return {
    isReadyToBackup,
    ...lastSyncStatus
  };
}

export async function restoreUploads(uploadDir) {
  // Skipping binary file restore from Postgres to prevent Neon storage limits
  console.log("[Sync] Binary uploads restore from Postgres is disabled to save Neon storage limit.");
}

export async function backupUpload(filename, filepath) {
  // Skipping binary file backup to Postgres to prevent Neon storage limits (500MB max)
  // Clean, lightweight mode: Cloudinary handles images/media if configured.
  return;
}
