import pg from "pg";
import fs from "fs";
import path from "path";

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

export async function restoreDatabase(dbPath) {
  lastSyncStatus.lastRestoreAttempt = new Date().toISOString();
  const url = process.env.SYNC_DATABASE_URL;
  if (!url) {
    console.log("[Sync] SYNC_DATABASE_URL is not set. Running database locally without cloud backup.");
    isReadyToBackup = true;
    return;
  }

  console.log("[Sync] Restoring database from cloud storage...");
  
  let client = null;
  let attempts = 5;
  let connected = false;

  // Retry logic for Neon database cold start
  for (let i = 1; i <= attempts; i++) {
    try {
      client = new Client({ connectionString: url });
      await client.connect();
      connected = true;
      console.log(`[Sync] Successfully connected to Postgres (attempt ${i}/${attempts})`);
      break;
    } catch (err) {
      console.warn(`[Sync] Connection attempt ${i}/${attempts} failed: ${err.message}`);
      if (client) {
        try { await client.end(); } catch (e) {}
      }
      if (i < attempts) {
        console.log("[Sync] Waiting 3 seconds before retrying...");
        await sleep(3000);
      }
    }
  }

  if (!connected) {
    const errorMsg = `Failed to connect to PostgreSQL database after ${attempts} attempts.`;
    lastSyncStatus.lastRestoreError = errorMsg;
    throw new Error(errorMsg);
  }

  try {
    // Create table if it doesnt exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS sqlite_sync (
        key VARCHAR(255) PRIMARY KEY,
        data BYTEA,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const res = await client.query("SELECT data FROM sqlite_sync WHERE key = $1", ["tournament.db"]);
    if (res.rows.length > 0 && res.rows[0].data) {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(dbPath, res.rows[0].data);
      console.log(`[Sync] Successfully restored database size: ${res.rows[0].data.length} bytes`);
      lastSyncStatus.lastRestoreSuccess = new Date().toISOString();
    } else {
      console.log("[Sync] No database backup found in cloud, starting with fresh template");
      lastSyncStatus.lastRestoreSuccess = new Date().toISOString() + " (No backup found)";
    }
    
    // Set flag to allow future backups since we successfully connected and restored (or verified no backup exists)
    isReadyToBackup = true;
  } catch (err) {
    lastSyncStatus.lastRestoreError = err.message;
    throw new Error(`Error querying sync table: ${err.message}`);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

export async function backupDatabase(dbPath) {
  lastSyncStatus.lastBackupAttempt = new Date().toISOString();
  const url = process.env.SYNC_DATABASE_URL;
  if (!url) return;

  if (!isReadyToBackup) {
    console.warn("[Sync] Backup skipped: database was not successfully restored on startup. Protecting cloud data from being overwritten by template.");
    lastSyncStatus.lastBackupError = "Backup skipped: restore failed on startup.";
    return;
  }

  if (!fs.existsSync(dbPath)) {
    console.log("[Sync] Database file not found to backup:", dbPath);
    lastSyncStatus.lastBackupError = "Database file not found.";
    return;
  }

  console.log("[Sync] Backing up database to cloud...");
  try {
    const data = fs.readFileSync(dbPath);
    const client = new Client({ connectionString: url });
    await client.connect();

    try {
      await client.query(`
        INSERT INTO sqlite_sync (key, data, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE
        SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;
      `, ["tournament.db", data]);
      console.log(`[Sync] Successfully backed up database size: ${data.length} bytes`);
      lastSyncStatus.lastBackupSuccess = new Date().toISOString();
      lastSyncStatus.lastBackupError = null;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("[Sync] Backup failed:", err.message);
    lastSyncStatus.lastBackupError = err.message;
  }
}

// Debounced sync scheduling
export function scheduleSync(dbPath) {
  const url = process.env.SYNC_DATABASE_URL;
  if (!url) return;

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
  }, 2000); // sync 2 seconds after last write
}

export function getSyncStatus() {
  return {
    isReadyToBackup,
    ...lastSyncStatus
  };
}

export async function restoreUploads(uploadDir) {
  const url = process.env.SYNC_DATABASE_URL;
  if (!url) return;

  console.log("[Sync] Restoring uploaded files from cloud storage...");
  
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    // Create the uploaded_files table if it does not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        filename VARCHAR(255) PRIMARY KEY,
        data BYTEA,
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const res = await client.query("SELECT filename, data FROM uploaded_files");
    console.log(`[Sync] Found ${res.rows.length} uploaded files in cloud`);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let restoredCount = 0;
    for (const row of res.rows) {
      if (row.filename && row.data) {
        const dest = path.join(uploadDir, row.filename);
        fs.writeFileSync(dest, row.data);
        restoredCount++;
      }
    }
    console.log(`[Sync] Successfully restored ${restoredCount} uploads to ${uploadDir}`);
  } catch (err) {
    console.error("[Sync] Failed to restore uploaded files:", err.message);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

export async function backupUpload(filename, filepath) {
  const url = process.env.SYNC_DATABASE_URL;
  if (!url) return;

  if (!fs.existsSync(filepath)) {
    console.warn("[Sync] Uploaded file not found to backup:", filepath);
    return;
  }

  console.log(`[Sync] Backing up uploaded file ${filename} to cloud...`);
  try {
    const data = fs.readFileSync(filepath);
    
    // Guess mime type from filename extension
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const client = new Client({ connectionString: url });
    await client.connect();

    try {
      await client.query(`
        INSERT INTO uploaded_files (filename, data, mime_type, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (filename) DO UPDATE
        SET data = EXCLUDED.data, mime_type = EXCLUDED.mime_type, created_at = CURRENT_TIMESTAMP;
      `, [filename, data, mimeType]);
      console.log(`[Sync] Successfully backed up uploaded file: ${filename} (${data.length} bytes)`);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error(`[Sync] Backup uploaded file ${filename} failed:`, err.message);
  }
}

