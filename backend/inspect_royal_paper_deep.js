import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const royalUrl = 'postgresql://neondb_owner:npg_TbyH5NQw9ScA@ep-royal-paper-azh7uc1w-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to Neon (ep-royal-paper-azh7uc1w)...');
  const client = new Client({ connectionString: royalUrl });
  await client.connect();

  // 1. Check all tables in public schema
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log('📋 Existing tables in public schema:', tables.rows.map(r => r.table_name));

  for (const row of tables.rows) {
    const tName = row.table_name;
    const countRes = await client.query(`SELECT count(*) FROM "${tName}"`);
    console.log(`  - Table "${tName}": ${countRes.rows[0].count} rows`);

    if (tName === 'teams' || tName.includes('team')) {
      const sample = await client.query(`SELECT * FROM "${tName}" LIMIT 10`);
      console.log(`    Sample rows in ${tName}:`, sample.rows);
    }
  }

  // 2. Check sqlite_sync table if exists
  if (tables.rows.some(r => r.table_name === 'sqlite_sync')) {
    const res = await client.query('SELECT key, length(data) as size, updated_at FROM sqlite_sync');
    console.log('\n📋 Existing keys in sqlite_sync:');
    console.table(res.rows);

    const dataRes = await client.query('SELECT data FROM sqlite_sync WHERE key = $1', ['tournament.db']);
    if (dataRes.rows.length > 0 && dataRes.rows[0].data) {
      const buf = dataRes.rows[0].data;
      fs.writeFileSync('./backend/tmp_royal_paper_download.db', buf);
      const db = new DatabaseSync('./backend/tmp_royal_paper_download.db');
      console.log('\n=== TEAMS IN DOWNLOADED DATABASE ===');
      console.table(db.prepare('SELECT id, name FROM teams').all());
      console.log('=== GROUPS IN DOWNLOADED DATABASE ===');
      console.table(db.prepare('SELECT id, name FROM groups').all());
    }
  }

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
