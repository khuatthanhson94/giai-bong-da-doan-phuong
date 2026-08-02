import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
const { Client } = pg;

const primaryNeonUrl = 'postgresql://neondb_owner:npg_aTwFtUHx5Df2@ep-damp-morning-aosj3em4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Syncing 10PM database (243 Players, 14 Teams) to Primary Neon...');
  const buf = fs.readFileSync('./data/tournament.db');
  console.log(`📁 Local file size: ${buf.length} bytes`);

  const client = new Client({ connectionString: primaryNeonUrl });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS sqlite_sync (
      key TEXT PRIMARY KEY,
      data BYTEA NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.query(`
    INSERT INTO sqlite_sync (key, data, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE
    SET data = EXCLUDED.data, updated_at = NOW();
  `, ['tournament.db', buf]);

  console.log('🎉 Successfully uploaded 243-player database to Primary Neon!');
  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
