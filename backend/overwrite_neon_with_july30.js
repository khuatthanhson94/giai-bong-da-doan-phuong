import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const July30File = path.join(__dirname, 'data', 'backups', 'backup-2026-07-30T22-55-29.db');
const buf = fs.readFileSync(July30File);

console.log(`[Overwrite] Reading July 30 backup file (${buf.length} bytes)...`);

const dbPath1 = path.join(__dirname, 'tournament.db');
const dbPath2 = path.join(__dirname, '..', 'data', 'tournament.db');
fs.writeFileSync(dbPath1, buf);
if (!fs.existsSync(path.dirname(dbPath2))) fs.mkdirSync(path.dirname(dbPath2), { recursive: true });
fs.writeFileSync(dbPath2, buf);

const neonUrls = [
  'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-steep-boat-az2o0ij7-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_fc6GZvtd2LJW@ep-little-butterfly-az3l3shn-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-lively-frost-az252nx4-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
];

async function main() {
  for (const nUrl of neonUrls) {
    try {
      const dbHost = nUrl.split('@')[1]?.split('/')[0] || 'Neon';
      console.log(`📡 Force uploading 159744 bytes July 30 backup to Neon [${dbHost}]...`);
      const client = new Client({ connectionString: nUrl });
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

      console.log(`🎉 Successfully overwritten Neon [${dbHost}]!`);
      await client.end();
    } catch (e) {
      console.error(`❌ Upload error:`, e.message);
    }
  }
}

main().catch(err => console.error(err));
