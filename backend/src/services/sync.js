import pg from "pg";
import fs from "fs";
import path from "path";

const { Client } = pg;

let syncTimeout = null;
let isReadyToBackup = !process.env.SYNC_DATABASE_URL;

// Helper to delay execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function restoreDatabase(dbPath) {
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
    throw new Error(`Failed to connect to PostgreSQL database after ${attempts} attempts.`);
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
    } else {
      console.log("[Sync] No database backup found in cloud, starting with fresh template");
    }
    
    // Set flag to allow future backups since we successfully connected and restored (or verified no backup exists)
    isReadyToBackup = true;
  } catch (err) {
    throw new Error(`Error querying sync table: ${err.message}`);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

export async function backupDatabase(dbPath) {
  const url = process.env.SYNC_DATABASE_URL;
  if (!url) return;

  if (!isReadyToBackup) {
    console.warn("[Sync] Backup skipped: database was not successfully restored on startup. Protecting cloud data from being overwritten by template.");
    return;
  }

  if (!fs.existsSync(dbPath)) {
    console.log("[Sync] Database file not found to backup:", dbPath);
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
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("[Sync] Backup failed:", err.message);
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
    });
  }, 2000); // sync 2 seconds after last write
}


export function getSyncStatus() { return { isReadyToBackup }; }

