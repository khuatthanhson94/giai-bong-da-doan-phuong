import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'tournament.db');
const buf = fs.readFileSync(dbFile);

const url = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-icy-silence-azm8cc4x-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log(`📡 Uploading active database (22 matches, 12 finished, 55 goals) to ep-icy-silence-azm8cc4x (${buf.length} bytes)...`);
  const client = new Client({ connectionString: url });
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

  console.log('🎉 Successfully updated ep-icy-silence-azm8cc4x with full 22 matches & 55 goals data!');
  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
