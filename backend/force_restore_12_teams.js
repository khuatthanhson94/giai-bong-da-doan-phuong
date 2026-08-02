import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupFile = path.join(__dirname, 'data', 'backups', 'backup-2026-07-30T22-55-29.db');
const targetDb1 = path.join(__dirname, 'tournament.db');
const targetDb2 = path.join(__dirname, '..', 'data', 'tournament.db');

console.log('🔄 Overwriting local databases with 12-team backup (July 30 backup)...');
const buf = fs.readFileSync(backupFile);
fs.writeFileSync(targetDb1, buf);
if (!fs.existsSync(path.dirname(targetDb2))) fs.mkdirSync(path.dirname(targetDb2), { recursive: true });
fs.writeFileSync(targetDb2, buf);
console.log(`✅ Loaded ${buf.length} bytes into local database files!`);

const neonUrls = [
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-little-butterfly-az3l3shn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-lively-frost-az252nx4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
];

for (const neonUrl of neonUrls) {
  try {
    const dbHost = neonUrl.split('@')[1]?.split('/')[0] || 'Neon';
    console.log(`📡 Uploading 12-team database to Neon instance [${dbHost}]...`);
    const client = new Client({ connectionString: neonUrl });
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS sqlite_sync (
        key VARCHAR(255) PRIMARY KEY,
        data BYTEA,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      INSERT INTO sqlite_sync (key, data, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE
      SET data = EXCLUDED.data, updated_at = NOW();
    `, ['tournament.db', buf]);

    console.log(`🎉 Successfully synced 12-team database to Neon [${dbHost}]!`);
    await client.end();
  } catch (e) {
    console.error(`❌ Sync failed for instance:`, e.message);
  }
}
