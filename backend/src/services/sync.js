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

function getDatabaseUrls() {
  const primary = process.env.SYNC_DATABASE_URL;
  const backup = process.env.SYNC_DATABASE_URL_BACKUP;
  const list = [];
  if (primary) list.push({ name: 'Primary Neon', url: primary });
  if (backup) list.push({ name: 'Backup Neon', url: backup });
  return list;
}

export async function restoreDatabase(dbPath) {
  lastSyncStatus.lastRestoreAttempt = new Date().toISOString();
  const dbUrls = getDatabaseUrls();
  if (dbUrls.length === 0) {
    console.log("[Sync] SYNC_DATABASE_URL is not set. Running database locally without cloud backup.");
    isReadyToBackup = true;
    return;
  }

  console.log(`[Sync] Restoring database from cloud storage (${dbUrls.length} Neon instances configured)...`);
  
  let latestData = null;
  let latestTime = null;
  let latestSource = null;

  for (const { name, url } of dbUrls) {
    console.log(`[Sync] Attempting check/restore from ${name}...`);
    let client = null;
    try {
      client = new Client({ connectionString: url });
      await client.connect();

      await client.query(`
        CREATE TABLE IF NOT EXISTS sqlite_sync (
          key VARCHAR(255) PRIMARY KEY,
          data BYTEA,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try { await client.query(`DROP TABLE IF EXISTS uploaded_files;`); } catch (e) {}

      const res = await client.query("SELECT data, updated_at FROM sqlite_sync WHERE key = $1", ["tournament.db"]);
      if (res.rows.length > 0 && res.rows[0].data) {
        const rowTime = new Date(res.rows[0].updated_at).getTime();
        console.log(`[Sync] Found backup in ${name} updated at: ${res.rows[0].updated_at}`);
        if (!latestTime || rowTime > latestTime) {
          latestTime = rowTime;
          latestData = res.rows[0].data;
          latestSource = name;
        }
      }
      await client.end();
    } catch (err) {
      console.warn(`[Sync] Failed to query ${name}: ${err.message}`);
      if (client) { try { await client.end(); } catch (e) {} }
    }
  }

  if (latestData) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dbPath, latestData);
    console.log(`[Sync] Successfully restored latest database (${latestData.length} bytes) from ${latestSource}`);
    lastSyncStatus.lastRestoreSuccess = `${new Date().toISOString()} (from ${latestSource})`;
  } else {
    console.log("[Sync] Starting with local/template database (no valid backup found on connected Neon instances).");
    lastSyncStatus.lastRestoreSuccess = new Date().toISOString() + " (Fresh/Template)";
  }
  
  isReadyToBackup = true;
}

export async function backupDatabase(dbPath) {
  lastSyncStatus.lastBackupAttempt = new Date().toISOString();
  const dbUrls = getDatabaseUrls();
  if (dbUrls.length === 0) return;

  if (!isReadyToBackup) {
    console.warn("[Sync] Backup skipped: database is not ready.");
    lastSyncStatus.lastBackupError = "Backup skipped: restore failed on startup.";
    return;
  }

  if (!fs.existsSync(dbPath)) {
    console.log("[Sync] Database file not found to backup:", dbPath);
    lastSyncStatus.lastBackupError = "Database file not found.";
    return;
  }

  const data = fs.readFileSync(dbPath);

  // Backup in parallel to all configured Neon instances
  for (const { name, url } of dbUrls) {
    try {
      const client = new Client({ connectionString: url });
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
  }, 1000); // Sync fast (1 second) after write so data is backed up immediately to cloud
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

