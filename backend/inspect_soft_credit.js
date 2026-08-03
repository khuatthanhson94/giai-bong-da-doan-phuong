import pg from 'pg';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Client } = pg;
const softCreditUrl = 'postgresql://neondb_owner:npg_E5KjxWXNAo2M@ep-soft-credit-azu5s02r-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to Neon database (ep-soft-credit-azu5s02r)...');
  const client = new Client({ connectionString: softCreditUrl });
  await client.connect();

  // 1. Check all public tables
  const tables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log('📋 Tables in public schema:', tables.rows.map(r => r.table_name));

  for (const row of tables.rows) {
    const tName = row.table_name;
    const countRes = await client.query(`SELECT count(*) FROM "${tName}"`);
    console.log(`  - Table "${tName}": ${countRes.rows[0].count} rows`);
  }

  // 2. Check sqlite_sync table if present
  if (tables.rows.some(r => r.table_name === 'sqlite_sync')) {
    const res = await client.query('SELECT key, length(data) as size, updated_at FROM sqlite_sync');
    console.log('\n📋 Keys in sqlite_sync:');
    console.table(res.rows);

    const dataRes = await client.query('SELECT data FROM sqlite_sync WHERE key = $1', ['tournament.db']);
    if (dataRes.rows.length > 0 && dataRes.rows[0].data) {
      const buf = dataRes.rows[0].data;
      fs.writeFileSync('./backend/soft_credit_download.db', buf);
      const db = new DatabaseSync('./backend/soft_credit_download.db');
      console.log('\n=== TEAMS IN SOFT CREDIT DATABASE ===');
      console.table(db.prepare('SELECT id, name FROM teams').all());
      console.log('=== GROUPS IN SOFT CREDIT DATABASE ===');
      console.table(db.prepare('SELECT id, name FROM groups').all());
      console.log('=== MATCHES IN SOFT CREDIT DATABASE ===');
      console.table(db.prepare('SELECT id, round, match_date, team_a_id, team_b_id, score_a, score_b, status FROM matches').all());
    }
  }

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
