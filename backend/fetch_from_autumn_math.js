import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

let DatabaseSync;
try {
  const sqlite = await import('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (e) {
  const betterSqlite = await import('better-sqlite3');
  DatabaseSync = betterSqlite.default;
}

const autumnMathUrl = 'postgresql://neondb_owner:npg_dGHkgn7J3TRv@ep-autumn-math-azd9xhwd-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('📡 Connecting to Neon database (ep-autumn-math-azd9xhwd)...');
  const client = new Client({ connectionString: autumnMathUrl });
  await client.connect();

  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('📋 Existing Neon tables:', tables.rows.map(r => r.table_name));

  const res = await client.query('SELECT data, updated_at FROM sqlite_sync WHERE key = $1', ['tournament.db']);
  if (res.rows.length > 0 && res.rows[0].data) {
    const buf = res.rows[0].data;
    console.log(`📥 Downloaded ${buf.length} bytes from ep-autumn-math (Updated at: ${res.rows[0].updated_at})`);
    
    if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync('./data/tournament.db', buf);
    fs.writeFileSync('./backend/tournament.db', buf);
    console.log('✅ Overwrote ./data/tournament.db & ./backend/tournament.db with download!');

    const db = new DatabaseSync('./backend/tournament.db');
    const teams = db.prepare('SELECT id, name FROM teams').all();
    const matches = db.prepare('SELECT id, round, team_a_id, team_b_id, score_a, score_b, status FROM matches').all();
    const playersCount = db.prepare('SELECT count(*) as c FROM players').get().c;

    console.log(`📊 Data Summary: ${teams.length} Teams, ${matches.length} Matches, ${playersCount} Players`);
    console.log('⚽ Sample Matches:');
    console.table(matches.slice(0, 15));
  } else {
    console.log('⚠️ No tournament.db row found in sqlite_sync table for this database');
  }

  await client.end();
}

main().catch(err => console.error('❌ Error:', err));
