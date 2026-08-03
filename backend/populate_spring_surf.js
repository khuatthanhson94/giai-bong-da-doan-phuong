import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'late_field_1500.db');
const buf = fs.readFileSync(dbFile);

const url = 'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-spring-surf-az37ejml-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log(`📡 Populating ep-spring-surf-az37ejml with 12 matches & 55 goals DB (${buf.length} bytes)...`);
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

  console.log('🎉 Successfully populated ep-spring-surf-az37ejml with full tournament data & scores!');
  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
